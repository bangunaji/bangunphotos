import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, ImagePlus, Eye, EyeOff } from 'lucide-react';
import FrameEditor from '../components/FrameEditor';

const Admin = () => {
  const [templates, setTemplates] = useState([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [uploadedOverlay, setUploadedOverlay] = useState(null); // data URL for front frame
  const [uploadedBg, setUploadedBg] = useState(null); // data URL for background
  const [selectedBgColor, setSelectedBgColor] = useState('#ffffff');
  const [showEditor, setShowEditor] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const overlayInputRef = useRef(null);
  const bgInputRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('photobooth_templates');
    if (saved) {
      setTemplates(JSON.parse(saved));
    } else {
      const defaultTemplates = [
        { id: '1', name: 'Classic Strip', bgUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80' }
      ];
      setTemplates(defaultTemplates);
      localStorage.setItem('photobooth_templates', JSON.stringify(defaultTemplates));
    }
  }, []);

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Pilih file gambar (PNG, JPG, dll)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (type === 'overlay') {
        setUploadedOverlay(ev.target.result);
      } else {
        setUploadedBg(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStartEditor = () => {
    if (!newTemplateName.trim()) {
      alert('Isi nama template dulu!');
      return;
    }
    if (!uploadedOverlay) {
      alert('Upload Frame PNG transparan terlebih dahulu!');
      return;
    }
    setShowEditor(true);
    setEditingTemplateId(null);
  };

  const uploadToImgbb = async (base64Data) => {
    const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
    if (!apiKey || apiKey === 'your_api_key_here') {
      throw new Error("IMGBB API Key belum diatur di .env");
    }
    const base64 = base64Data.split(',')[1];
    const formData = new FormData();
    formData.append('image', base64);
    formData.append('key', apiKey);
    
    const res = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      return data.data.url;
    } else {
      throw new Error(data.error?.message || "Upload gagal");
    }
  };

  const handleSaveFrames = async (frames) => {
    if (!newTemplateName.trim()) {
      alert('Isi nama template dulu!');
      return;
    }

    setIsSaving(true);
    let finalOverlayUrl = uploadedOverlay;
    let finalBgUrl = uploadedBg;

    try {
      if (uploadedOverlay && uploadedOverlay.startsWith('data:image/')) {
        finalOverlayUrl = await uploadToImgbb(uploadedOverlay);
      }
      if (uploadedBg && uploadedBg.startsWith('data:image/')) {
        finalBgUrl = await uploadToImgbb(uploadedBg);
      }

      if (editingTemplateId) {
        // Editing existing template frames
        const updated = templates.map(t =>
          t.id === editingTemplateId
            ? { ...t, frames, overlayUrl: finalOverlayUrl, bgUrl: finalBgUrl, bgColor: selectedBgColor, name: newTemplateName.trim() }
            : t
        );
        localStorage.setItem('photobooth_templates', JSON.stringify(updated));
        setTemplates(updated);
      } else {
        // New template
        const newTemplate = {
          id: Date.now().toString(),
          name: newTemplateName.trim(),
          overlayUrl: finalOverlayUrl,
          bgUrl: finalBgUrl,
          bgColor: selectedBgColor,
          frames,
        };
        const updated = [...templates, newTemplate];
        localStorage.setItem('photobooth_templates', JSON.stringify(updated));
        setTemplates(updated);
      }

      // Reset
      setNewTemplateName('');
      setUploadedOverlay(null);
      setUploadedBg(null);
      setSelectedBgColor('#ffffff');
      setShowEditor(false);
      setEditingTemplateId(null);
      if (overlayInputRef.current) overlayInputRef.current.value = '';
      if (bgInputRef.current) bgInputRef.current.value = '';
    } catch (e) {
      console.error(e);
      alert('Gagal menyimpan template: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id) => {
    if (!confirm('Yakin hapus template ini?')) return;
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    localStorage.setItem('photobooth_templates', JSON.stringify(updated));
  };

  const handleEditFrames = (template) => {
    if (!template.overlayUrl) {
      alert('Template ini tidak punya overlay image. Hanya template baru yang bisa diedit frame-nya.');
      return;
    }
    setUploadedOverlay(template.overlayUrl);
    setUploadedBg(template.bgUrl || null);
    setSelectedBgColor(template.bgColor || '#ffffff');
    setNewTemplateName(template.name);
    setEditingTemplateId(template.id);
    setShowEditor(true);
  };

  const cancelEditor = () => {
    setShowEditor(false);
    setUploadedOverlay(null);
    setUploadedBg(null);
    setSelectedBgColor('#ffffff');
    setNewTemplateName('');
    setEditingTemplateId(null);
    if (overlayInputRef.current) overlayInputRef.current.value = '';
    if (bgInputRef.current) bgInputRef.current.value = '';
  };

  const isOverlayTemplate = (t) => !!t.overlayUrl && !!t.frames;

  return (
    <div className="container animate-fade-in">
      <h2>Admin Dashboard</h2>
      <p style={{ marginBottom: '2rem' }}>Kelola template photobooth di sini.</p>

      {/* Add New Template */}
      <div className="glass" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3>Tambah Template Baru</h3>
        <p style={{ fontSize: '0.95rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
          Upload gambar template PNG (dengan area transparan untuk foto), lalu tandai posisi frame.
        </p>

        {!showEditor ? (
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '1rem' }}>
                Nama Template
              </label>
              <input
                type="text"
                placeholder="Contoh: Cute Couple Frame"
                value={newTemplateName}
                onChange={e => setNewTemplateName(e.target.value)}
                style={{ width: '100%', marginBottom: '1rem' }}
              />
            </div>

            <div style={{ flex: 1, minWidth: '250px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '1rem' }}>
                Lapisan Depan (Frame PNG)
              </label>
              <input
                ref={overlayInputRef}
                type="file"
                accept="image/*"
                onChange={e => handleFileUpload(e, 'overlay')}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => overlayInputRef.current?.click()}
                style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}
              >
                <ImagePlus size={20} />
                {uploadedOverlay ? 'Frame Terpilih ✓' : 'Pilih Gambar Frame'}
              </button>
            </div>

            <div style={{ flex: 1, minWidth: '250px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '1rem' }}>
                Lapisan Belakang (BG Opsional)
              </label>
              <input
                ref={bgInputRef}
                type="file"
                accept="image/*"
                onChange={e => handleFileUpload(e, 'bg')}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => bgInputRef.current?.click()}
                style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}
              >
                <ImagePlus size={20} />
                {uploadedBg ? 'Background Terpilih ✓' : 'Pilih Background'}
              </button>
            </div>

            {/* Background Color Picker - shown when no bg image uploaded */}
            {!uploadedBg && (
              <div style={{ width: '100%', marginTop: '0.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '1rem' }}>
                  Warna Background
                </label>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Putih', value: '#ffffff' },
                    { label: 'Hitam', value: '#000000' },
                    { label: 'Orange', value: '#f97316' },
                    { label: 'Ungu', value: '#a855f7' }
                  ].map(bg => (
                    <button
                      key={bg.value}
                      type="button"
                      className={`btn ${selectedBgColor === bg.value ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setSelectedBgColor(bg.value)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: bg.value, border: '1px solid #ccc' }} />
                      {bg.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleStartEditor}
                style={{ padding: '0.75rem 2rem', fontSize: '1.1rem' }}
              >
                Lanjut Atur Posisi Foto
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '1rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem' }}>
                {editingTemplateId ? `Edit Frame: ${newTemplateName}` : `Tandai Frame: ${newTemplateName}`}
              </h3>
              <button
                type="button"
                className="btn btn-outline"
                onClick={cancelEditor}
                style={{ padding: '0.5rem 1rem', fontSize: '0.95rem' }}
              >
                Batal
              </button>
            </div>

            <FrameEditor
              imageUrl={uploadedOverlay}
              bgUrl={uploadedBg}
              isSaving={isSaving}
              initialFrames={
                editingTemplateId
                  ? (templates.find(t => t.id === editingTemplateId)?.frames || [])
                  : []
              }
              onSave={handleSaveFrames}
            />
          </div>
        )}
      </div>

      {/* Current Templates */}
      <div className="glass" style={{ padding: '2rem' }}>
        <h3>Template Saat Ini</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginTop: '1.5rem',
        }}>
          {templates.map(t => (
            <div key={t.id} className="glass" style={{ padding: '1rem', position: 'relative' }}>
              <div style={{
                height: '200px',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
                border: '3px solid var(--border-color)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                // Background image or Checkerboard for transparency
                background: isOverlayTemplate(t)
                  ? (t.bgUrl ? `url(${t.bgUrl}) center/cover no-repeat` : `repeating-conic-gradient(#d4d4d4 0% 25%, #fff 0% 50%) 50% / 16px 16px`)
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

              <p style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                {t.name}
              </p>

              {isOverlayTemplate(t) && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  <ImagePlus size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  {t.frames.length} frame{t.frames.length !== 1 ? 's' : ''} • Overlay template
                </p>
              )}

              {!isOverlayTemplate(t) && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Legacy background template
                </p>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {isOverlayTemplate(t) && (
                  <button
                    onClick={() => handleEditFrames(t)}
                    className="btn btn-outline"
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.95rem' }}
                  >
                    <Eye size={16} />
                    Edit Frame
                  </button>
                )}
                <button
                  onClick={() => handleDelete(t.id)}
                  className="btn btn-outline"
                  style={{
                    flex: isOverlayTemplate(t) ? undefined : 1,
                    padding: '0.5rem',
                    fontSize: '0.95rem',
                    background: 'var(--accent)',
                    color: '#fff',
                  }}
                >
                  <Trash2 size={16} />
                  Hapus
                </button>
              </div>
            </div>
          ))}

          {templates.length === 0 && (
            <p style={{ color: 'var(--text-muted)', gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>
              Belum ada template. Tambahkan template baru di atas!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;
