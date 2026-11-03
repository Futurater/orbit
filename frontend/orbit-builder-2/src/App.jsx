import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Providers
import { AppProvider } from './context/AppContext';
import { UIProvider } from './components/ui';

// Layout
import AppShell from './components/AppShell';

// Pages
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Timetable from './pages/Timetable';
import Arena from './components/Arena';

export default function App() {
  return (
    <AppProvider>
      <UIProvider>
        <Router>
          <div className="min-h-screen bg-[#fdf0d5] text-[#003049]">
            <Routes>
              {/* 1. Public Landing Page */}
              <Route path="/" element={<Landing />} />

              {/* 2. Authentication Pages */}
              <Route path="/login" element={<Auth mode="login" />} />
              <Route path="/signup" element={<Auth mode="signup" />} />

              {/* 3. Authenticated App Pages (inside AppShell with Sidebar/Mobile Tabs) */}
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/timetable" element={<Timetable />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/schedule" element={<Navigate to="/onboarding" replace />} />
              </Route>

              {/* 4. Active Arena (Full-screen interactive coding chamber) */}
              <Route path="/arena" element={<Arena />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </UIProvider>
    </AppProvider>
  );
}