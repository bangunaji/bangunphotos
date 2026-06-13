import React, { useRef, useState, useEffect } from 'react';
import { Camera as CameraIcon } from 'lucide-react';

const CameraView = ({ onComplete, targetCount = 3 }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const [hasPermission, setHasPermission] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [capturedCount, setCapturedCount] = useState(0);
  const [results, setResults] = useState([]); // Array of { image, video }

  useEffect(() => {
    // Request camera and audio access
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasPermission(true);
      })
      .catch(err => {
        console.error("Error accessing media devices.", err);
        alert("Please allow camera and microphone access to use the photobooth.");
      });

    return () => {
      // Cleanup stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const takePhotoSequence = async () => {
    if (capturedCount >= targetCount) return;

    let currentResults = [...results];

    for (let i = capturedCount; i < targetCount; i++) {
      // 1. Start video recording for the "Live Photo"
      chunksRef.current = [];
      const options = { mimeType: 'video/webm' };
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      // Start recording before the countdown finishes (captures the "before" moment)
      mediaRecorderRef.current.start();

      // 2. Countdown 3 seconds
      for (let c = 3; c > 0; c--) {
        setCountdown(c);
        await new Promise(r => setTimeout(r, 1000));
      }
      setCountdown('SNAP!');

      const MAX_CAPTURE_WIDTH = 800;
      const vWidth = videoRef.current.videoWidth;
      const vHeight = videoRef.current.videoHeight;
      const aspectRatio = vHeight / vWidth;

      const canvas = document.createElement('canvas');
      canvas.width = Math.min(MAX_CAPTURE_WIDTH, vWidth);
      canvas.height = canvas.width * aspectRatio;

      const ctx = canvas.getContext('2d');
      // For flipped video feed, we must flip the context before drawing to match what user sees
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Reduce quality to 0.85 to save massive amounts of RAM
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);

      // Flash effect simulation
      setTimeout(() => setCountdown(null), 200);

      // 4. Continue recording for 1.5s after the snap
      await new Promise(r => setTimeout(r, 1500));
      
      // Stop recording
      mediaRecorderRef.current.stop();

      // Wait for data available event to fire
      await new Promise(r => {
        mediaRecorderRef.current.onstop = () => r();
      });

      const videoBlob = new Blob(chunksRef.current, { type: 'video/webm' });
      const videoUrl = URL.createObjectURL(videoBlob);

      const resultObj = { image: imageDataUrl, video: videoUrl };
      currentResults.push(resultObj);
      setResults(currentResults);
      setCapturedCount(currentResults.length);

      // Brief pause before next photo
      if (i < targetCount - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // Done with all photos
    onComplete(currentResults);
  };

  return (
    <div className="flex-col flex-center animate-fade-in" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '1rem' }}>
        <h2>Take your photos</h2>
        <div style={{ background: 'var(--surface)', padding: '0.5rem 1rem', borderRadius: '1rem', border: '1px solid var(--surface-border)' }}>
          {capturedCount} / {targetCount} Captured
        </div>
      </div>

      <div className="glass" style={{ position: 'relative', width: '100%', aspectRatio: '4/3', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
        {!hasPermission && <p>Requesting camera access...</p>}
        
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted // Mute the live playback to avoid echo, but the stream still has audio for recording
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
        />

        {countdown && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '8rem',
            fontWeight: 'bold',
            color: 'white',
            textShadow: '0 4px 20px rgba(0,0,0,0.5)',
            background: countdown === 'SNAP!' ? 'rgba(255,255,255,0.8)' : 'transparent',
            zIndex: 10
          }}>
            {countdown !== 'SNAP!' && countdown}
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        {capturedCount === 0 ? (
          <button className="btn btn-primary" onClick={takePhotoSequence} disabled={!hasPermission} style={{ padding: '1rem 3rem', fontSize: '1.2rem', borderRadius: '2rem' }}>
            <CameraIcon size={24} />
            Start Session
          </button>
        ) : (
          <p style={{ fontSize: '1.2rem', fontWeight: '500' }}>
            {capturedCount < targetCount ? 'Get ready for the next one...' : 'Processing...'}
          </p>
        )}
      </div>
    </div>
  );
};

export default CameraView;
