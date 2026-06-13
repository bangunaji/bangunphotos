import React, { useRef, useState } from 'react';
import { Film, Loader } from 'lucide-react';
import confetti from 'canvas-confetti';
import gifshot from 'gifshot';

const VideoStrip = ({ videos, template, filter, bgColor = '#ffffff' }) => {
  const [downloadUrl, setDownloadUrl] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [progress, setProgress] = useState(0);

  const isOverlayTemplate = !!template?.overlayUrl && !!template?.frames;

  const generateGif = async () => {
    if (isRecording) return;
    setIsRecording(true);
    setProgress(0);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let STRIP_WIDTH, STRIP_HEIGHT;
    let overlayImg = null;

    if (isOverlayTemplate) {
      const tempImg = new Image();
      tempImg.crossOrigin = "Anonymous";
      try {
        await new Promise((resolve, reject) => {
          tempImg.onload = resolve;
          tempImg.onerror = reject;
          tempImg.src = template.overlayUrl;
        });
      } catch (e) {
        // Handle error silently
      }

      if (tempImg.complete && tempImg.naturalWidth > 0) {
        const MAX_WIDTH = 360; // Dikurangi dari 480 ke 360 agar RAM HP kuat render GIF
        const aspectRatio = tempImg.naturalHeight / tempImg.naturalWidth;
        STRIP_WIDTH = Math.min(MAX_WIDTH, tempImg.naturalWidth);
        STRIP_HEIGHT = Math.round(STRIP_WIDTH * aspectRatio);

        overlayImg = document.createElement('canvas');
        overlayImg.width = STRIP_WIDTH;
        overlayImg.height = STRIP_HEIGHT;
        const cachedCtx = overlayImg.getContext('2d');
        cachedCtx.drawImage(tempImg, 0, 0, STRIP_WIDTH, STRIP_HEIGHT);
      } else {
        STRIP_WIDTH = 360;
        STRIP_HEIGHT = 1080;
      }
    } else {
      STRIP_WIDTH = 360;
      STRIP_HEIGHT = 1080;
    }

    canvas.width = STRIP_WIDTH;
    canvas.height = STRIP_HEIGHT;

    const PADDING = 24;
    const PHOTO_WIDTH = STRIP_WIDTH - (PADDING * 2);
    const PHOTO_HEIGHT = (PHOTO_WIDTH * 3) / 4;
    const SPACING = 24;
    const START_Y = PADDING + 60;

    let bgImg = null;
    if (template?.bgUrl) {
      bgImg = new Image();
      bgImg.crossOrigin = "Anonymous";
      try {
        await new Promise((resolve, reject) => {
          bgImg.onload = resolve;
          bgImg.onerror = reject;
          bgImg.src = template.bgUrl;
        });
      } catch (e) {
        bgImg = null;
      }
    }

    const videoElements = [];
    for (const vidSrc of videos) {
      const v = document.createElement('video');
      v.muted = true;
      v.playsInline = true;
      v.loop = true;
      v.preload = 'auto';
      v.src = vidSrc;

      await new Promise((resolve) => {
        const onReady = () => resolve();
        v.addEventListener('canplay', onReady, { once: true });
        v.load();
        setTimeout(onReady, 3000);
      });

      videoElements.push(v);
    }

    for (const v of videoElements) {
      v.currentTime = 0;
      await v.play().catch(() => {});
    }

    await new Promise(r => setTimeout(r, 300)); // allow playback to start

    // GIF Capture configuration
    const FPS = 12; // 12 FPS is a good balance for GIF size/quality
    const durationSeconds = 3; 
    const totalFrames = FPS * durationSeconds;
    const frameDelayMs = 1000 / FPS;
    const capturedImages = [];

    let framesCaptured = 0;

    const captureLoop = setInterval(() => {
      // 1. Draw Background
      if (isOverlayTemplate) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, STRIP_WIDTH, STRIP_HEIGHT);
        if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
          ctx.drawImage(bgImg, 0, 0, STRIP_WIDTH, STRIP_HEIGHT);
        }
      } else {
        if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
          ctx.drawImage(bgImg, 0, 0, STRIP_WIDTH, STRIP_HEIGHT);
        } else {
          ctx.fillStyle = '#fdfaf6';
          ctx.fillRect(0, 0, STRIP_WIDTH, STRIP_HEIGHT);
        }
      }

      // 2. Draw Videos
      if (isOverlayTemplate) {
        const frames = template.frames || [];
        videoElements.forEach((v, i) => {
          if (i >= frames.length) return;
          const frame = frames[i];

          const fx = (frame.x / 100) * STRIP_WIDTH;
          const fy = (frame.y / 100) * STRIP_HEIGHT;
          const fw = (frame.w / 100) * STRIP_WIDTH;
          const fh = (frame.h / 100) * STRIP_HEIGHT;

          ctx.save();
          if (filter && filter !== 'none') {
            ctx.filter = filter;
          }

          try {
            if (v.readyState >= 2 && fw > 0 && fh > 0 && v.videoWidth > 0 && v.videoHeight > 0) {
              const videoAspect = v.videoWidth / v.videoHeight;
              const frameAspect = fw / fh;
              let sx = 0, sy = 0, sw = v.videoWidth, sh = v.videoHeight;

              if (videoAspect > frameAspect) {
                sw = v.videoHeight * frameAspect;
                sx = (v.videoWidth - sw) / 2;
              } else {
                sh = v.videoWidth / frameAspect;
                sy = (v.videoHeight - sh) / 2;
              }

              ctx.translate(fx + fw, fy);
              ctx.scale(-1, 1);
              ctx.drawImage(v, sx, sy, sw, sh, 0, 0, fw, fh);
            }
          } catch (e) {
            console.error("Error drawing video frame:", e);
          }
          ctx.restore();
        });
      } else {
        videoElements.forEach((v, i) => {
          const yPos = START_Y + (i * (PHOTO_HEIGHT + SPACING));
          ctx.save();
          ctx.fillStyle = 'white';
          ctx.fillRect(PADDING - 6, yPos - 6, PHOTO_WIDTH + 12, PHOTO_HEIGHT + 12);
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#232323';
          ctx.strokeRect(PADDING - 6, yPos - 6, PHOTO_WIDTH + 12, PHOTO_HEIGHT + 12);

          if (filter && filter !== 'none') {
            ctx.filter = filter;
          }

          ctx.translate(PADDING + PHOTO_WIDTH, yPos);
          ctx.scale(-1, 1);
          if (v.readyState >= 2) {
            ctx.drawImage(v, 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
          }
          ctx.restore();
        });
      }

      // 3. Draw Overlay
      if (isOverlayTemplate && overlayImg) {
        ctx.drawImage(overlayImg, 0, 0, STRIP_WIDTH, STRIP_HEIGHT);
      }

      // 4. Capture Frame
      // Use low-quality JPEG for the frames to save memory before converting to GIF
      capturedImages.push(canvas.toDataURL('image/jpeg', 0.8));
      framesCaptured++;
      
      // Update progress (0% to 50% is capturing frames)
      setProgress((framesCaptured / totalFrames) * 50);

      // 5. Check if done capturing
      if (framesCaptured >= totalFrames) {
        clearInterval(captureLoop);
        
        // Stop videos
        videoElements.forEach(v => {
          v.pause();
          v.removeAttribute('src');
          v.load();
        });

        // 6. Generate GIF from frames
        gifshot.createGIF({
          images: capturedImages,
          gifWidth: STRIP_WIDTH,
          gifHeight: STRIP_HEIGHT,
          interval: 1 / FPS,
          numFrames: totalFrames,
          sampleInterval: 10, // Default 10. Lower is better quality but slower.
          progressCallback: (captureProgress) => {
            // Update progress (50% to 100% is encoding GIF)
            setProgress(50 + (captureProgress * 50));
          }
        }, function(obj) {
          if (!obj.error) {
            setDownloadUrl(obj.image);
            setIsRecording(false);
            setProgress(100);
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.6 },
              colors: ['#6ab5a6', '#f0c27b', '#d96d6d']
            });
          } else {
            console.error("GIF creation error", obj.error);
            setIsRecording(false);
            alert("Gagal membuat GIF. Silakan coba lagi.");
          }
        });
      }
    }, frameDelayMs);
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    const link = document.createElement('a');
    link.download = `BangunPhoto-Live-${Date.now()}.gif`;
    link.href = downloadUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-col flex-center animate-fade-in" style={{ width: '100%' }}>
      {/* Preview */}
      <div
        className="glass"
        style={{
          overflow: 'hidden',
          width: '100%',
          maxWidth: '300px',
          background: 'white',
          padding: '1rem'
        }}
      >
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {videos.map((vidSrc, i) => (
            <video
              key={i}
              src={vidSrc}
              autoPlay
              loop
              muted
              playsInline
              style={{
                width: '100%',
                borderRadius: '0.25rem',
                border: '3px solid #232323',
                filter: filter && filter !== 'none' ? filter : 'none',
                display: 'block'
              }}
            />
          ))}
        </div>
      </div>

      {/* Generate or Download button */}
      {!downloadUrl ? (
        <button
          className="btn btn-primary"
          onClick={generateGif}
          disabled={isRecording}
          style={{ marginTop: '1.5rem', width: '100%', maxWidth: '300px' }}
        >
          {isRecording ? (
            <>
              <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
              Rendering GIF... {Math.round(progress)}%
            </>
          ) : (
            <>
              <Film size={20} />
              Generate Live GIF
            </>
          )}
        </button>
      ) : (
        <button
          className="btn btn-primary animate-pulse"
          onClick={handleDownload}
          style={{ marginTop: '1.5rem', width: '100%', maxWidth: '300px' }}
        >
          <Film size={20} />
          Download Live GIF
        </button>
      )}
    </div>
  );
};

export default VideoStrip;
