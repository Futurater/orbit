import React, { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, CalendarDays, Plus, LogOut, Youtube, Settings } from 'lucide-react';
import { createCourseFromYouTube } from '../api';
import { Modal, Spinner, useUI } from './ui';

const NAV = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/timetable', label: 'Planner', icon: CalendarDays },
  { to: '/onboarding', label: 'Schedule', icon: Settings },
];

export const OPEN_ADD_COURSE = 'orbit:add-course';
export const COURSES_CHANGED = 'orbit:courses-changed';

export default function AppShell() {
  const token = localStorage.getItem('orbit_token');
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useUI();

  const [user, setUser] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      setUser(JSON.parse(localStorage.getItem('orbit_user') || 'null'));
    } catch {
      setUser(null);
    }
  }, [location.pathname]);

  useEffect(() => {
    const open = () => setAddOpen(true);
    window.addEventListener(OPEN_ADD_COURSE, open);
    return () => window.removeEventListener(OPEN_ADD_COURSE, open);
  }, []);

  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const logout = () => {
    localStorage.removeItem('orbit_token');
    localStorage.removeItem('orbit_user');
    sessionStorage.removeItem('orbit_missed_prompted');
    navigate('/login');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await createCourseFromYouTube(url.trim());
      setAddOpen(false);
      setUrl('');
      window.dispatchEvent(new Event(COURSES_CHANGED));
      toast('Course created. Opening it now…', 'success');
      if (res.course?._id) navigate(`/arena?courseId=${res.course._id}`);
    } catch (err) {
      setError(err.message || 'We could not build a course from that link.');
    } finally {
      setBusy(false);
    }
  };

  const initial = (user?.name || 'U').trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen md:pl-60">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col bg-[#003049] text-[#fdf0d5] p-4 z-30">
        <div className="flex items-center gap-2.5 px-2 py-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-[#fdf0d5] text-[#003049] flex items-center justify-center font-display font-bold">
            O
          </div>
          <span className="font-display text-lg font-semibold text-[#fdf0d5]">Orbit</span>
        </div>

        <button
          onClick={() => setAddOpen(true)}
          className="btn btn-accent w-full mb-5"
        >
          <Plus className="w-4 h-4" /> New course
        </button>

        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-[#fdf0d5] text-[#003049]' : 'text-[#fdf0d5]/80 hover:bg-white/10'
                }`
              }
            >
              <Icon className="w-4 h-4" /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex items-center gap-3 px-2 pt-4 border-t border-white/15">
          <div className="w-9 h-9 rounded-full bg-[#669bbc] text-[#003049] flex items-center justify-center font-semibold">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{user?.name || 'You'}</div>
            <div className="text-xs text-[#fdf0d5]/60 truncate">{user?.email}</div>
          </div>
          <button onClick={logout} title="Sign out" className="p-2 rounded-lg hover:bg-white/10">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 bg-[#fdf0d5]/95 backdrop-blur border-b border-[rgba(0,48,73,.12)] px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#003049] text-[#fdf0d5] flex items-center justify-center font-display font-bold text-sm">
            O
          </div>
          <span className="font-display text-lg font-semibold">Orbit</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setAddOpen(true)} className="btn btn-primary btn-sm">
            <Plus className="w-4 h-4" /> Course
          </button>
          <button onClick={logout} className="btn btn-ghost btn-icon" aria-label="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      {/* Mobile bottom tabs */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[rgba(0,48,73,.14)] grid grid-cols-3">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${
                isActive ? 'text-[#c1121f]' : 'text-[#003049]/60'
              }`
            }
          >
            <Icon className="w-5 h-5" /> {label}
          </NavLink>
        ))}
      </nav>

      <Modal
        open={addOpen}
        onClose={() => !busy && setAddOpen(false)}
        title="Create a course from YouTube"
        subtitle="Paste a video or playlist link. We split it into checkpoints you can practise as you watch."
        footer={
          <>
            <button className="btn" onClick={() => setAddOpen(false)} disabled={busy}>
              Cancel
            </button>
            <button className="btn btn-primary" form="add-course-form" type="submit" disabled={busy || !url.trim()}>
              {busy ? (
                <>
                  <Spinner /> Building course…
                </>
              ) : (
                'Create course'
              )}
            </button>
          </>
        }
      >
        <form id="add-course-form" onSubmit={submit}>
          <label className="label" htmlFor="yt-url">
            YouTube link
          </label>
          <div className="relative">
            <Youtube className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#c1121f]" />
            <input
              id="yt-url"
              className="input pl-9"
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
            />
          </div>
          {error && <p className="text-sm text-[#c1121f] font-medium mt-2">{error}</p>}
          <p className="muted text-xs mt-2">Works with single videos, Shorts and full playlists.</p>
        </form>
      </Modal>
    </div>
  );
}
