import React, { useState } from 'react';
import CameraView from '../components/CameraView';
import TemplateSelector from '../components/TemplateSelector';
import PhotoStrip from '../components/PhotoStrip';
import VideoStrip from '../components/VideoStrip';

import { Download } from 'lucide-react';

const STEPS = {
  SELECT_TEMPLATE: 'SELECT_TEMPLATE',
  CAPTURE: 'CAPTURE',
  EDIT: 'EDIT',
  RESULT: 'RESULT'
};

const Photobooth = () => {
  const [currentStep, setCurrentStep] = useState(STEPS.SELECT_TEMPLATE);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [photos, setPhotos] = useState([]); // [{ image: dataUrl, video: blobUrl }]
  const [selectedFilter, setSelectedFilter] = useState('none');

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setCurrentStep(STEPS.CAPTURE);
  };

  const handleCaptureComplete = (capturedPhotos) => {
    setPhotos(capturedPhotos);
    setCurrentStep(STEPS.EDIT);
  };

  const handleEditComplete = () => {
    setCurrentStep(STEPS.RESULT);
  };

  const handleDownloadVideo = (videoUrl, index) => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `LivePhoto-${index + 1}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Progress Indicator */}
      <div className="glass" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: currentStep === STEPS.SELECT_TEMPLATE ? 'bold' : 'normal', color: currentStep === STEPS.SELECT_TEMPLATE ? 'var(--primary)' : 'var(--text-muted)' }}>1. Template</div>
        <div style={{ fontWeight: currentStep === STEPS.CAPTURE ? 'bold' : 'normal', color: currentStep === STEPS.CAPTURE ? 'var(--primary)' : 'var(--text-muted)' }}>2. Capture</div>
        <div style={{ fontWeight: currentStep === STEPS.EDIT ? 'bold' : 'normal', color: currentStep === STEPS.EDIT ? 'var(--primary)' : 'var(--text-muted)' }}>3. Edit</div>
        <div style={{ fontWeight: currentStep === STEPS.RESULT ? 'bold' : 'normal', color: currentStep === STEPS.RESULT ? 'var(--primary)' : 'var(--text-muted)' }}>4. Result</div>
      </div>

      {currentStep === STEPS.SELECT_TEMPLATE && (
        <TemplateSelector onSelect={handleTemplateSelect} />
      )}

      {currentStep === STEPS.CAPTURE && (
        <CameraView onComplete={handleCaptureComplete} targetCount={selectedTemplate?.frames?.length || 3} />
      )}

      {currentStep === STEPS.EDIT && (
        <div className="flex-col flex-center">
          <h2 style={{ marginBottom: '1.5rem' }}>Apply Filters</h2>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { label: 'Normal', value: 'none' },
              { label: 'B&W', value: 'grayscale(100%)' },
              { label: 'Vintage', value: 'sepia(100%)' },
              { label: 'Vivid', value: 'contrast(1.2) saturate(1.2)' }
            ].map(filter => (
              <button 
                key={filter.value}
                className={`btn ${selectedFilter === filter.value ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setSelectedFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          
          <PhotoStrip 
            photos={photos.map(p => p.image)} 
            template={selectedTemplate} 
            filter={selectedFilter} 
            mode="preview"
            bgColor={selectedTemplate?.bgColor || '#ffffff'}
          />

          <button className="btn btn-primary" onClick={handleEditComplete} style={{ marginTop: '2rem' }}>
            Finish & View Live Photos
          </button>
        </div>
      )}

      {currentStep === STEPS.RESULT && (
        <div className="flex-col flex-center">
          <h2 style={{ marginBottom: '1.5rem' }}>Your Photo Strip!</h2>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
            {/* Live Strip View */}
            <div className="glass" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: '300px' }}>
              <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Live Video Strip</h3>
              <VideoStrip 
                videos={photos.map(p => p.video)} 
                template={selectedTemplate} 
                filter={selectedFilter} 
                bgColor={selectedTemplate?.bgColor || '#ffffff'}
              />
            </div>

            {/* Final Strip Download View */}
            <div className="glass" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <PhotoStrip 
                photos={photos.map(p => p.image)} 
                template={selectedTemplate} 
                filter={selectedFilter} 
                mode="download"
                bgColor={selectedTemplate?.bgColor || '#ffffff'}
              />
            </div>
          </div>
          
          <button className="btn btn-outline" onClick={() => window.location.reload()} style={{ marginTop: '2rem' }}>
            Take New Photos
          </button>
        </div>
      )}
    </div>
  );
};

export default Photobooth;
