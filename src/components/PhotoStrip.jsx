import React, { useRef, useEffect, useState } from 'react';
import { Download, Cloud, ExternalLink, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

const PhotoStrip = ({ photos, template, filter, mode = 'preview', bgColor = '#ffffff' }) => {
  const canvasRef = useRef(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [imgbbUrl, setImgbbUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!photos || photos.length === 0 || !template || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const isOverlayTemplate = !!template.overlayUrl && !!template.frames;

    const drawStrip = async () => {
      if (isOverlayTemplate) {
        // === NEW OVERLAY MODE ===
        // Load overlay image first to determine canvas size
        const overlayImg = new Image();
        overlayImg.crossOrigin = "Anonymous";
        try {
          await new Promise((resolve, reject) => {
            overlayImg.onload = resolve;
            overlayImg.onerror = reject;
            // Prevent CORS cache issue by appending a timestamp
            overlayImg.src = template.overlayUrl + (template.overlayUrl.includes('?') ? '&' : '?') + 'cb=' + Date.now();
          });
        } catch (e) {
          console.error("Failed to load overlay image", e);
          return;
        }

        // Set canvas size to match overlay image aspect ratio
        const MAX_WIDTH = 800;
        const aspectRatio = overlayImg.naturalHeight / overlayImg.naturalWidth;
        const canvasWidth = Math.min(MAX_WIDTH, overlayImg.naturalWidth);
        const canvasHeight = canvasWidth * aspectRatio;

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // 1. Fill with background color
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 1.5 Draw optional background image
        if (template.bgUrl) {
          const bgImg = new Image();
          bgImg.crossOrigin = "Anonymous";
          try {
            await new Promise((resolve, reject) => {
              bgImg.onload = resolve;
              bgImg.onerror = reject;
              bgImg.src = template.bgUrl + (template.bgUrl.includes('?') ? '&' : '?') + 'cb=' + Date.now();
            });
            ctx.drawImage(bgImg, 0, 0, canvasWidth, canvasHeight);
          } catch (e) {
            console.error("Failed to load bg image", e);
          }
        }

        // 2. Draw photos at frame positions
        for (let i = 0; i < template.frames.length && i < photos.length; i++) {
          const frame = template.frames[i];
          const photoImg = new Image();
          await new Promise((resolve) => {
            photoImg.onload = resolve;
            photoImg.onerror = resolve; // skip on error
            photoImg.src = photos[i];
          });

          // Calculate actual pixel positions from percentage
          const fx = (frame.x / 100) * canvasWidth;
          const fy = (frame.y / 100) * canvasHeight;
          const fw = (frame.w / 100) * canvasWidth;
          const fh = (frame.h / 100) * canvasHeight;

          ctx.save();

          if (filter && filter !== 'none') {
            ctx.filter = filter;
          }

          // Smart crop
          const photoAspect = photoImg.naturalWidth / photoImg.naturalHeight;
          const frameAspect = fw / fh;

          let sx = 0, sy = 0, sw = photoImg.naturalWidth, sh = photoImg.naturalHeight;

          if (photoAspect > frameAspect) {
            sw = photoImg.naturalHeight * frameAspect;
            sx = (photoImg.naturalWidth - sw) / 2;
          } else {
            sh = photoImg.naturalWidth / frameAspect;
            sy = (photoImg.naturalHeight - sh) / 2;
          }

          const cx = fx + fw / 2;
          const cy = fy + fh / 2;
          const rot = frame.rotation || 0;

          // Translate to center, rotate, then apply mirroring
          ctx.translate(cx, cy);
          if (rot) {
            ctx.rotate((rot * Math.PI) / 180);
          }
          ctx.scale(-1, 1);
          
          // Draw image centered at origin
          ctx.drawImage(photoImg, sx, sy, sw, sh, -fw / 2, -fh / 2, fw, fh);

          ctx.restore();
        }

        // 3. Draw overlay on top
        ctx.drawImage(overlayImg, 0, 0, canvasWidth, canvasHeight);

      } else {
        // === LEGACY BACKGROUND MODE ===
        const STRIP_WIDTH = 600;
        const STRIP_HEIGHT = 1800;

        canvas.width = STRIP_WIDTH;
        canvas.height = STRIP_HEIGHT;

        const PADDING = 40;
        const PHOTO_WIDTH = STRIP_WIDTH - (PADDING * 2);
        const PHOTO_HEIGHT = (PHOTO_WIDTH * 3) / 4;
        const SPACING = 40;
        const START_Y = PADDING + 100;

        if (template.bgUrl) {
          try {
            const bgImg = new Image();
            bgImg.crossOrigin = "Anonymous";
            await new Promise((resolve, reject) => {
              bgImg.onload = resolve;
              bgImg.onerror = reject;
              bgImg.src = template.bgUrl + (template.bgUrl.includes('?') ? '&' : '?') + 'cb=' + Date.now();
            });
            ctx.drawImage(bgImg, 0, 0, STRIP_WIDTH, STRIP_HEIGHT);
          } catch (e) {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, STRIP_WIDTH, STRIP_HEIGHT);
          }
        }

        for (let i = 0; i < photos.length; i++) {
          const photoImg = new Image();
          await new Promise((resolve) => {
            photoImg.onload = resolve;
            photoImg.src = photos[i];
          });

          const yPos = START_Y + (i * (PHOTO_HEIGHT + SPACING));

          ctx.save();
          ctx.fillStyle = 'white';
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = 15;
          ctx.shadowOffsetY = 5;
          ctx.fillRect(PADDING - 10, yPos - 10, PHOTO_WIDTH + 20, PHOTO_HEIGHT + 20);
          ctx.shadowColor = 'transparent';

          if (filter !== 'none') {
            ctx.filter = filter;
          }

          ctx.translate(PADDING + PHOTO_WIDTH, yPos);
          ctx.scale(-1, 1);
          ctx.drawImage(photoImg, 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
          ctx.restore();
        }
      }

      // Generate download URL and upload to IMGBB using Blob to save memory
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const blobUrl = URL.createObjectURL(blob);
        setDownloadUrl(blobUrl);

        if (mode === 'download') {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#6366f1', '#ec4899', '#f8fafc']
          });
        }

        // Auto Upload to IMGBB directly with Blob
        if (mode !== 'download') return;

        const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
        if (!apiKey || apiKey === 'your_api_key_here') {
          console.warn("IMGBB API Key not configured in .env");
          return;
        }

        setIsUploading(true);
        try {
          const formData = new FormData();
          formData.append('image', blob, 'photostrip.jpg');
          formData.append('key', apiKey);

          const response = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: formData
          });

          const data = await response.json();
          if (data.success) {
            setImgbbUrl(data.data.url);
          } else {
            console.error("IMGBB Upload Error:", data);
          }
        } catch (err) {
          console.error("Failed to upload to IMGBB", err);
        } finally {
          setIsUploading(false);
        }
      }, 'image/jpeg', 0.95);
    };

    drawStrip();
  }, [photos, template, filter, mode]);

  const handleDownload = () => {
    if (!downloadUrl) return;
    const link = document.createElement('a');
    link.download = `BangunPhoto-${Date.now()}.jpg`;
    link.href = downloadUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-col flex-center animate-fade-in" style={{ width: '100%' }}>
      <div
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          borderRadius: '1rem',
          overflow: 'hidden',
          width: '100%',
          maxWidth: '350px',
          background: `repeating-conic-gradient(#e5e5e5 0% 25%, #fff 0% 50%) 50% / 16px 16px`,
        }}
      >
        <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
      </div>

      {mode === 'download' && (
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '350px' }}>
          <button
            className="btn btn-primary animate-pulse"
            onClick={handleDownload}
            style={{ width: '100%' }}
          >
            <Download size={20} />
            Download Photo Strip
          </button>

          {/* IMGBB Status */}
          <div className="glass" style={{ padding: '1rem', textAlign: 'center', fontSize: '0.95rem' }}>
            {isUploading ? (
              <div style={{ color: 'var(--text-muted)' }}>
                <Cloud size={16} style={{ animation: 'pulse 1.5s infinite', verticalAlign: 'middle', marginRight: '8px' }} />
                Sedang mengupload ke cloud...
              </div>
            ) : imgbbUrl ? (
              <div style={{ color: 'green', fontWeight: 'bold' }}>
                <CheckCircle size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                Berhasil diupload!
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>
                Belum diupload (Cek API Key)
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoStrip;
