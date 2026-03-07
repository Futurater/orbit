import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// 🧠 Import BOTH Brains
import { AppProvider } from './context/AppContext';
import { OrbitProvider } from './context/OrbitContext';

// 📄 Import Pages
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import MainWorkspace from './components/MainWorkspace';

// ✨ Import Global Background Components
import DeepSpace from './components/DeepSpace';
import ShootingStar from './components/ShootingStar';

export default function App() {
  return (
    // Wrap the app in Builder 1's Context
    <AppProvider>
      {/* Wrap the app in Builder 2's Context */}
      <OrbitProvider>

        <Router>
          {/* 🔥 THE MASTER BACKGROUND: Acts as the background for EVERY page */}
          <div className="fixed inset-0 z-0 bg-black overflow-hidden">
            <DeepSpace />
            <ShootingStar />
          </div>

          {/* All routes are relative z-index so they sit above the background */}
          <div className="relative z-10 w-full h-full">
            <Routes>
              {/* 1. Default route pushes them to the login screen */}
              <Route path="/" element={<Navigate to="/onboarding" replace />} />

              {/* 2. The Login Screen */}
              <Route path="/onboarding" element={<Onboarding />} />

              {/* 3. The Dashboard Screen */}
              <Route path="/dashboard" element={<Dashboard />} />

              {/* 4. THE MERGE POINT: Jumps to your Spaceship */}
              <Route path="/arena" element={<MainWorkspace />} />
            </Routes>
          </div>
        </Router>

      </OrbitProvider>
    </AppProvider>
  );
}