import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Camera, Settings } from 'lucide-react';
import Welcome from './pages/Welcome';
import Admin from './pages/Admin';
import Photobooth from './pages/Photobooth';
import './index.css';
import './App.css';

function App() {
  return (
    <Router>
      <div className="container">
        <header className="app-header">
          <Link to="/" className="logo">
            <Camera className="logo-icon" size={28} />
            <span>BangunPhoto</span>
          </Link>
          <nav>
            <Link to="/admin" className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>
              <Settings size={18} />
              <span>Admin</span>
            </Link>
          </nav>
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/photobooth" element={<Photobooth />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
