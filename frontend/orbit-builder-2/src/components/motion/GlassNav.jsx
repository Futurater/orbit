import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plus, ArrowRight, Play, LogOut, User as UserIcon, ShieldAlert } from 'lucide-react';

export default function GlassNav({ onOpenAddCourse }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('orbit_user');
      if (stored) setUser(JSON.parse(stored));
    } catch (e) {}
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('orbit_token');
    localStorage.removeItem('orbit_user');
    setUser(null);
    navigate('/login');
  };

  const navLinks = [
    { label: 'All Courses', path: '/dashboard' },
    { label: 'Timetable', path: '/timetable' },
    { label: 'Active Arena', path: '/arena' },
  ];

  if (location.pathname === '/arena') {
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#fdf0d5]/95 backdrop-blur-md border-b-2.5 border-[#003049] px-4 md:px-12 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Project Orbit Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-[#780000] border-2 border-[#003049] flex items-center justify-center font-display font-black text-xl text-[#fdf0d5] shadow-[2px_2px_0px_#003049] group-hover:rotate-6 transition-transform">
            O
          </div>
          <div>
            <span className="font-display text-xl md:text-2xl font-black text-[#003049] tracking-tight block leading-none">
              Project Orbit
            </span>
            <span className="font-handwritten text-xs text-[#c1121f] font-bold block -mt-0.5">
              Autonomous Video Interception Arena
            </span>
          </div>
        </Link>

        {/* Center: Navigation Pills */}
        <nav className="hidden md:flex items-center gap-2">
          {navLinks.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                  isActive
                    ? 'bg-[#003049] text-[#fdf0d5] shadow-[2px_2px_0px_#c1121f]'
                    : 'text-[#003049] hover:bg-[#669bbc]/20 border border-transparent hover:border-[#003049]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Segmented Aardvark Action Button */}
        <div className="flex items-center gap-3">
          {onOpenAddCourse && (
            <button
              onClick={onOpenAddCourse}
              className="aardvark-btn"
            >
              <span>+ Add YouTube Course</span>
              <span className="btn-arrow">
                <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
              </span>
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-2 pl-2">
              <Link
                to="/onboarding"
                title="Update Rhythm Preferences"
                className="flex items-center gap-2 text-xs font-bold text-[#003049] bg-white border-2 border-[#003049] px-3.5 py-1.5 rounded-full shadow-[2px_2px_0px_#003049] hover:-translate-y-0.5 transition-transform"
              >
                <UserIcon className="w-3.5 h-3.5 text-[#c1121f]" />
                <span className="max-w-[100px] truncate">{user.name?.split(' ')[0] || 'Member'}</span>
              </Link>
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-2 rounded-full border-2 border-[#003049] bg-white hover:bg-red-50 text-[#003049] hover:text-[#c1121f] transition-colors shadow-[2px_2px_0px_#003049]"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="btn btn-ghost btn-sm text-xs"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="btn btn-primary btn-sm text-xs"
              >
                Sign up free
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
