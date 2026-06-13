import React from 'react';
import { Link } from 'react-router-dom';
import { Camera } from 'lucide-react';

const Welcome = () => {
  return (
    <div className="flex-col flex-center animate-fade-in" style={{ flex: 1, textAlign: 'center' }}>
      <div className="glass" style={{ padding: '3rem', maxWidth: '600px' }}>
        <div className="flex-center" style={{ marginBottom: '1.5rem' }}>
          <div style={{ background: 'var(--secondary)', padding: '1rem', borderRadius: '50%', border: '3px solid var(--border-color)' }} className="animate-pulse">
            <Camera size={48} className="logo-icon" color="var(--border-color)" />
          </div>
        </div>
        <h1>Welcome to BangunPhoto</h1>
        <p style={{ marginBottom: '2rem', fontSize: '1.1rem' }}>
          Capture your best moments with our premium photobooth. Apply beautiful filters and download your customized photo strips!
        </p>
        <Link to="/photobooth" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.25rem' }}>
          Start Photobooth
        </Link>
      </div>
    </div>
  );
};

export default Welcome;
