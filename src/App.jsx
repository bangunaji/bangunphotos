import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Camera, Settings } from 'lucide-react';
import Welcome from './pages/Welcome';
import Admin from './pages/Admin';
import Photobooth from './pages/Photobooth';
import Login from './pages/Login';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import './index.css';
import './App.css';

const ProtectedRoute = ({ children, user, loading }) => {
  if (loading) return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <div className="container">
        <header className="app-header">
          <Link to="/" className="logo">
            <Camera className="logo-icon" size={28} />
            <span>BangunPhoto</span>
          </Link>
          <nav>
            {user ? (
              <Link to="/admin" className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>
                <Settings size={18} />
                <span>Admin</span>
              </Link>
            ) : (
              <Link to="/login" className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>
                <Settings size={18} />
                <span>Admin Login</span>
              </Link>
            )}
          </nav>
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute user={user} loading={loading}>
                  <Admin />
                </ProtectedRoute>
              } 
            />
            <Route path="/photobooth" element={<Photobooth />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
