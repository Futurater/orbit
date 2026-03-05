// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';

// Pages
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Curriculum from './pages/Curriculum';

// Builder 2's Placeholder Route
const Arena = () => (
  <div className="w-full h-screen bg-gray-900 text-white flex items-center justify-center">
    BUILDER 2 VIDEO/IDE COMPONENT GOES HERE
  </div>
);

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/curriculum/dsa" element={<Curriculum />} />
          <Route path="/play/:dayId" element={<Arena />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
