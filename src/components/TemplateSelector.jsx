import React, { useState, useEffect } from 'react';
import { ImagePlus, Layers } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

const TemplateSelector = ({ onSelect }) => {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "templates"));
        const fetchedTemplates = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (fetchedTemplates.length > 0) {
          setTemplates(fetchedTemplates);
        } else {
          // Fallback if database is empty
          setTemplates([
            { id: '1', name: 'Classic Strip', bgUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80' }
          ]);
        }
      } catch (error) {
        console.error("Error fetching templates:", error);
        setTemplates([
          { id: '1', name: 'Classic Strip', bgUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80' }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const isOverlayTemplate = (t) => !!t.overlayUrl && !!t.frames;

  if (isLoading) {
    return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading templates...</div>;
  }

  return (
    <div className="flex-col flex-center">
      <h2 style={{ marginBottom: '2rem' }}>Pilih Template</h2>
      
      {templates.length === 0 && (
        <div className="glass" style={{ padding: '3rem', textAlign: 'center', maxWidth: '500px' }}>
          <ImagePlus size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <p style={{ fontSize: '1.1rem' }}>
            Belum ada template. Tambahkan template di halaman <strong>Admin</strong> dulu!
          </p>
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '2rem', 
        width: '100%', 
        maxWidth: '800px' 
      }}>
        {templates.map(t => (
          <div
            key={t.id}
            className="glass"
            style={{
              padding: '1rem',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              textAlign: 'center'
            }}
            onClick={() => onSelect(t)}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{
              height: '280px',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--border-color)',
              // Background image or Checkerboard for overlay templates
              background: isOverlayTemplate(t)
                ? (t.bgUrl ? `url(${t.bgUrl}) center/cover no-repeat` : `repeating-conic-gradient(#e5e5e5 0% 25%, #fff 0% 50%) 50% / 14px 14px`)
                : 'var(--surface)',
            }}>
              {isOverlayTemplate(t) ? (
                <img
                  src={t.overlayUrl}
                  alt={t.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  backgroundImage: `url(${t.bgUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }} />
              )}
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.25rem' }}>
              {t.name}
            </h3>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
              <Layers size={14} />
              {isOverlayTemplate(t)
                ? `${t.frames.length} foto`
                : '3 foto'
              }
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplateSelector;
