import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, Move, Maximize2, RotateCw } from 'lucide-react';

const MIN_FRAME_SIZE = 5; // Minimum 5% width/height

// RotateHandle SVG icon (circular arrow like Canva)
const RotateIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6" />
    <path d="M21.34 15.57a10 10 0 1 1-.57-8.38" />
  </svg>
);

const FrameEditor = ({ imageUrl, bgUrl, isSaving, initialFrames = [], onSave }) => {
  const containerRef = useRef(null);
  const [frames, setFrames] = useState(initialFrames);
  const [activeFrame, setActiveFrame] = useState(null);
  const [dragState, setDragState] = useState(null);
  // dragState: { type: 'move' | 'resize' | 'rotate', frameIndex, startX, startY, startFrame, startAngle }

  // Get the rendered image rect (used for % conversion)
  const getContainerRect = useCallback(() => {
    if (!containerRef.current) return null;
    const img = containerRef.current.querySelector('.frame-editor-image');
    if (!img) return null;
    return img.getBoundingClientRect();
  }, []);

  const addFrame = () => {
    const newFrame = {
      x: 10 + (frames.length * 5) % 30,
      y: 10 + (frames.length * 25) % 60,
      w: 70,
      h: 20,
      rotation: 0,
    };
    setFrames([...frames, newFrame]);
    setActiveFrame(frames.length);
  };

  const removeFrame = (index) => {
    const updated = frames.filter((_, i) => i !== index);
    setFrames(updated);
    setActiveFrame(null);
  };

  // Calculate angle (in degrees) from center point to cursor
  const getAngle = useCallback((cx, cy, mouseX, mouseY) => {
    const dx = mouseX - cx;
    const dy = mouseY - cy;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }, []);

  const handlePointerDown = useCallback((e, index, type) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveFrame(index);

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    if (type === 'rotate') {
      // For rotate: find the pixel center of the frame to compute angle
      const rect = getContainerRect();
      if (!rect) return;

      const frame = frames[index];
      const frameCenterX = rect.left + ((frame.x + frame.w / 2) / 100) * rect.width;
      const frameCenterY = rect.top + ((frame.y + frame.h / 2) / 100) * rect.height;

      const startAngle = getAngle(frameCenterX, frameCenterY, clientX, clientY);

      setDragState({
        type: 'rotate',
        frameIndex: index,
        frameCenterX,
        frameCenterY,
        startAngle,
        startRotation: frame.rotation || 0,
        startFrame: { ...frames[index] },
      });
    } else {
      setDragState({
        type,
        frameIndex: index,
        startX: clientX,
        startY: clientY,
        startFrame: { ...frames[index] },
      });
    }
  }, [frames, getContainerRect, getAngle]);

  const handlePointerMove = useCallback((e) => {
    if (!dragState) return;
    e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const { startFrame, frameIndex, type } = dragState;

    if (type === 'rotate') {
      const { frameCenterX, frameCenterY, startAngle, startRotation } = dragState;
      const currentAngle = getAngle(frameCenterX, frameCenterY, clientX, clientY);
      let delta = currentAngle - startAngle;
      let newRotation = startRotation + delta;
      // Normalize to -180..180
      newRotation = ((newRotation + 180) % 360) - 180;

      setFrames(prev => {
        const updated = [...prev];
        updated[frameIndex] = { ...startFrame, rotation: Math.round(newRotation) };
        return updated;
      });
      return;
    }

    const rect = getContainerRect();
    if (!rect) return;

    const deltaXPercent = ((clientX - dragState.startX) / rect.width) * 100;
    const deltaYPercent = ((clientY - dragState.startY) / rect.height) * 100;

    setFrames(prev => {
      const updated = [...prev];
      if (type === 'move') {
        let newX = startFrame.x + deltaXPercent;
        let newY = startFrame.y + deltaYPercent;
        newX = Math.max(0, Math.min(100 - startFrame.w, newX));
        newY = Math.max(0, Math.min(100 - startFrame.h, newY));
        updated[frameIndex] = { ...startFrame, x: newX, y: newY };
      } else if (type === 'resize') {
        let newW = startFrame.w + deltaXPercent;
        let newH = startFrame.h + deltaYPercent;
        newW = Math.max(MIN_FRAME_SIZE, Math.min(100 - startFrame.x, newW));
        newH = Math.max(MIN_FRAME_SIZE, Math.min(100 - startFrame.y, newH));
        updated[frameIndex] = { ...startFrame, w: newW, h: newH };
      }
      return updated;
    });
  }, [dragState, getContainerRect, getAngle]);

  const handlePointerUp = useCallback(() => {
    setDragState(null);
  }, []);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove, { passive: false });
      window.addEventListener('touchend', handlePointerUp);
      return () => {
        window.removeEventListener('mousemove', handlePointerMove);
        window.removeEventListener('mouseup', handlePointerUp);
        window.removeEventListener('touchmove', handlePointerMove);
        window.removeEventListener('touchend', handlePointerUp);
      };
    }
  }, [dragState, handlePointerMove, handlePointerUp]);

  const handleSave = () => {
    if (frames.length === 0) {
      alert('Tambahkan minimal 1 frame sebelum menyimpan!');
      return;
    }
    onSave(frames);
  };

  const isRotating = dragState?.type === 'rotate';
  const isResizing = dragState?.type === 'resize';

  return (
    <div style={{ width: '100%' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <button
          type="button"
          className="btn btn-outline"
          onClick={addFrame}
          style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}
        >
          <Plus size={18} />
          Tambah Frame
        </button>

        <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
          {frames.length} frame{frames.length !== 1 ? 's' : ''} ditandai
        </span>

        <div style={{ flex: 1 }} />

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={isSaving}
          style={{ padding: '0.5rem 1.25rem', fontSize: '1rem', opacity: isSaving ? 0.7 : 1 }}
        >
          <Save size={18} />
          {isSaving ? 'Upload & Simpan...' : 'Simpan Template'}
        </button>
      </div>

      {/* Help text */}
      <div style={{
        background: 'var(--secondary)',
        border: '2px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        padding: '0.75rem 1rem',
        marginBottom: '1rem',
        fontSize: '0.95rem',
      }}>
        <strong>Cara pakai:</strong> Klik "Tambah Frame" → drag kotak untuk pindahkan.
        Tarik <strong>sudut kanan bawah</strong> untuk resize.
        Drag <strong>ikon putar (↻) di atas-tengah</strong> frame untuk memutar — seperti di Canva!
      </div>

      {/* Editor Area */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '500px',
          margin: '0 auto',
          userSelect: 'none',
          touchAction: 'none',
          // Extend overflow so rotate handle above frame is visible
          overflow: 'visible',
        }}
        onClick={() => setActiveFrame(null)}
      >
        {/* Template Image */}
        <img
          src={imageUrl}
          alt="Template"
          className="frame-editor-image"
          draggable={false}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            borderRadius: 'var(--radius-md)',
            border: '3px solid var(--border-color)',
            boxShadow: '4px 4px 0px var(--border-color)',
            background: bgUrl
              ? `url(${bgUrl}) center/cover no-repeat`
              : `repeating-conic-gradient(#d4d4d4 0% 25%, #fff 0% 50%) 50% / 20px 20px`,
          }}
        />

        {/* Frame overlays */}
        {frames.map((frame, i) => {
          const isActive = activeFrame === i;
          const rot = frame.rotation || 0;

          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${frame.x}%`,
                top: `${frame.y}%`,
                width: `${frame.w}%`,
                height: `${frame.h}%`,
                transform: `rotate(${rot}deg)`,
                transformOrigin: 'center center',
                zIndex: isActive ? 20 : 10,
              }}
              onClick={(e) => { e.stopPropagation(); setActiveFrame(i); }}
            >
              {/* Main box */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  border: `3px ${isActive ? 'solid' : 'dashed'} ${isActive ? '#2563eb' : 'rgba(37, 99, 235, 0.7)'}`,
                  background: isActive ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.08)',
                  borderRadius: '4px',
                  cursor: dragState?.type === 'move' ? 'grabbing' : 'grab',
                  transition: dragState ? 'none' : 'border-color 0.15s, background 0.15s',
                }}
                onMouseDown={(e) => handlePointerDown(e, i, 'move')}
                onTouchStart={(e) => handlePointerDown(e, i, 'move')}
              >
                {/* Frame label */}
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  left: '4px',
                  background: '#2563eb',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <Move size={12} />
                  Foto {i + 1}
                </div>

                {/* Rotation degree badge (when rotated) */}
                {rot !== 0 && (
                  <div style={{
                    position: 'absolute',
                    bottom: '4px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.65)',
                    color: '#fff',
                    padding: '1px 6px',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: 'bold',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                  }}>
                    {rot}°
                  </div>
                )}

                {/* Delete button (active only) */}
                {isActive && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeFrame(i); }}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      background: 'var(--accent)',
                      color: '#fff',
                      border: '2px solid #fff',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      zIndex: 30,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                {/* Resize handle (bottom-right) */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-6px',
                    right: '-6px',
                    width: '22px',
                    height: '22px',
                    background: '#2563eb',
                    border: '2px solid #fff',
                    borderRadius: '5px',
                    cursor: 'nwse-resize',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 30,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  }}
                  onMouseDown={(e) => handlePointerDown(e, i, 'resize')}
                  onTouchStart={(e) => handlePointerDown(e, i, 'resize')}
                >
                  <Maximize2 size={11} color="#fff" />
                </div>
              </div>

              {/* ===== ROTATE HANDLE (Canva-style) ===== */}
              {/* Line stem from top-center of frame */}
              <div
                style={{
                  position: 'absolute',
                  top: '-28px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '2px',
                  height: '22px',
                  background: isActive ? '#2563eb' : 'rgba(37, 99, 235, 0.5)',
                  pointerEvents: 'none',
                }}
              />
              {/* Rotate button circle */}
              <div
                style={{
                  position: 'absolute',
                  top: '-52px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '28px',
                  height: '28px',
                  background: isActive ? '#2563eb' : '#fff',
                  border: `2px solid ${isActive ? '#fff' : '#2563eb'}`,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isRotating && dragState?.frameIndex === i ? 'grabbing' : 'grab',
                  zIndex: 30,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  color: isActive ? '#fff' : '#2563eb',
                  transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                  userSelect: 'none',
                }}
                onMouseDown={(e) => handlePointerDown(e, i, 'rotate')}
                onTouchStart={(e) => handlePointerDown(e, i, 'rotate')}
                onClick={(e) => e.stopPropagation()}
                title="Putar frame"
              >
                <RotateIcon />
              </div>
            </div>
          );
        })}
      </div>

      {/* Frame list summary */}
      {frames.length > 0 && (
        <div style={{
          marginTop: '1rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '0.5rem',
          maxWidth: '500px',
          margin: '1.5rem auto 0',
        }}>
          {frames.map((frame, i) => (
            <div
              key={i}
              onClick={() => setActiveFrame(i)}
              style={{
                padding: '0.5rem',
                borderRadius: 'var(--radius-sm)',
                border: `2px solid ${activeFrame === i ? '#2563eb' : 'var(--border-color)'}`,
                background: activeFrame === i ? 'rgba(37, 99, 235, 0.1)' : 'var(--surface)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                textAlign: 'center',
              }}
            >
              <strong>Foto {i + 1}</strong>
              <br />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                {Math.round(frame.w)}% × {Math.round(frame.h)}%
              </span>
              {(frame.rotation || 0) !== 0 && (
                <>
                  <br />
                  <span style={{ color: '#2563eb', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    ↻ {frame.rotation}°
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FrameEditor;
