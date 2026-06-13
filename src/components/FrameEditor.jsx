import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, Move, Maximize2 } from 'lucide-react';

const MIN_FRAME_SIZE = 5; // Minimum 5% width/height

const FrameEditor = ({ imageUrl, bgUrl, isSaving, initialFrames = [], onSave }) => {
  const containerRef = useRef(null);
  const [frames, setFrames] = useState(initialFrames);
  const [activeFrame, setActiveFrame] = useState(null); // index
  const [dragState, setDragState] = useState(null);
  // dragState: { type: 'move' | 'resize', frameIndex, startX, startY, startFrame }

  // Get container bounds
  const getContainerRect = useCallback(() => {
    if (!containerRef.current) return null;
    const img = containerRef.current.querySelector('.frame-editor-image');
    if (!img) return null;
    return img.getBoundingClientRect();
  }, []);

  // Convert pixel position to percentage
  const pxToPercent = useCallback((px, py) => {
    const rect = getContainerRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((px - rect.left) / rect.width) * 100,
      y: ((py - rect.top) / rect.height) * 100,
    };
  }, [getContainerRect]);

  const addFrame = () => {
    const newFrame = {
      x: 10 + (frames.length * 5) % 30,
      y: 10 + (frames.length * 25) % 60,
      w: 70,
      h: 20,
    };
    setFrames([...frames, newFrame]);
    setActiveFrame(frames.length);
  };

  const removeFrame = (index) => {
    const updated = frames.filter((_, i) => i !== index);
    setFrames(updated);
    setActiveFrame(null);
  };

  const handlePointerDown = (e, index, type) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveFrame(index);

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    setDragState({
      type,
      frameIndex: index,
      startX: clientX,
      startY: clientY,
      startFrame: { ...frames[index] },
    });
  };

  const handlePointerMove = useCallback((e) => {
    if (!dragState) return;
    e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const rect = getContainerRect();
    if (!rect) return;

    const deltaXPercent = ((clientX - dragState.startX) / rect.width) * 100;
    const deltaYPercent = ((clientY - dragState.startY) / rect.height) * 100;

    const { startFrame, frameIndex, type } = dragState;

    setFrames(prev => {
      const updated = [...prev];
      if (type === 'move') {
        let newX = startFrame.x + deltaXPercent;
        let newY = startFrame.y + deltaYPercent;
        // Clamp
        newX = Math.max(0, Math.min(100 - startFrame.w, newX));
        newY = Math.max(0, Math.min(100 - startFrame.h, newY));
        updated[frameIndex] = { ...startFrame, x: newX, y: newY };
      } else if (type === 'resize') {
        let newW = startFrame.w + deltaXPercent;
        let newH = startFrame.h + deltaYPercent;
        // Clamp
        newW = Math.max(MIN_FRAME_SIZE, Math.min(100 - startFrame.x, newW));
        newH = Math.max(MIN_FRAME_SIZE, Math.min(100 - startFrame.y, newH));
        updated[frameIndex] = { ...startFrame, w: newW, h: newH };
      }
      return updated;
    });
  }, [dragState, getContainerRect]);

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
        <strong>Cara pakai:</strong> Klik "Tambah Frame" lalu drag kotak biru ke posisi area foto di template.
        Tarik sudut kanan bawah untuk resize. Klik frame untuk memilih, lalu bisa dihapus.
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
            // Checkerboard background or optional bgUrl
            background: bgUrl ? `url(${bgUrl}) center/cover no-repeat` : `repeating-conic-gradient(#d4d4d4 0% 25%, #fff 0% 50%) 50% / 20px 20px`,
          }}
        />

        {/* Frame overlays */}
        {frames.map((frame, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${frame.x}%`,
              top: `${frame.y}%`,
              width: `${frame.w}%`,
              height: `${frame.h}%`,
              border: `3px ${activeFrame === i ? 'solid' : 'dashed'} ${activeFrame === i ? '#2563eb' : 'rgba(37, 99, 235, 0.7)'}`,
              background: activeFrame === i ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.08)',
              borderRadius: '4px',
              cursor: dragState?.type === 'move' ? 'grabbing' : 'grab',
              zIndex: activeFrame === i ? 20 : 10,
              transition: dragState ? 'none' : 'border-color 0.15s, background 0.15s',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setActiveFrame(i);
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

            {/* Delete button (visible when active) */}
            {activeFrame === i && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFrame(i);
                }}
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  background: 'var(--accent)',
                  color: '#fff',
                  border: '2px solid var(--border-color)',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                  boxShadow: 'none',
                }}
              >
                <Trash2 size={14} />
              </button>
            )}

            {/* Resize handle (bottom-right corner) */}
            <div
              style={{
                position: 'absolute',
                bottom: '-4px',
                right: '-4px',
                width: '20px',
                height: '20px',
                background: '#2563eb',
                border: '2px solid #fff',
                borderRadius: '4px',
                cursor: 'nwse-resize',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 25,
              }}
              onMouseDown={(e) => handlePointerDown(e, i, 'resize')}
              onTouchStart={(e) => handlePointerDown(e, i, 'resize')}
            >
              <Maximize2 size={10} color="#fff" />
            </div>
          </div>
        ))}
      </div>

      {/* Frame list summary */}
      {frames.length > 0 && (
        <div style={{
          marginTop: '1rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '0.5rem',
          maxWidth: '500px',
          margin: '1rem auto 0',
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FrameEditor;
