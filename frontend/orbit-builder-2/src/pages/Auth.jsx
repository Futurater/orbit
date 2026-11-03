import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginUser, registerUser } from '../api';
import { Spinner } from '../components/ui';

export default function Auth({ mode = 'login' }) {
  const isLogin = mode === 'login';
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isLogin) {
        const res = await loginUser({ email, password });
        navigate(res.user?.onboardingCompleted ? location.state?.from || '/dashboard' : '/onboarding', { replace: true });
      } else {
        await registerUser({ name, email, password });
        navigate('/onboarding', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-[#003049] text-[#fdf0d5] p-12">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#fdf0d5] text-[#003049] flex items-center justify-center font-display font-bold">O</div>
          <span className="font-display text-xl font-semibold text-[#fdf0d5]">Orbit</span>
        </Link>
        <div>
          <h2 className="text-4xl leading-tight text-[#fdf0d5]">
            Turn any YouTube video into a course you actually finish.
          </h2>
          <ul className="mt-6 space-y-3 text-[#fdf0d5]/80">
            <li>• Paste a video or playlist — we split it into checkpoints.</li>
            <li>• Practise as you watch, with an AI mentor to unblock you.</li>
            <li>• A planner that reschedules missed work into free slots.</li>
          </ul>
        </div>
        <p className="text-sm text-[#fdf0d5]/50">Free to use. No credit card.</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#003049] text-[#fdf0d5] flex items-center justify-center font-display font-bold">O</div>
            <span className="font-display text-lg font-semibold">Orbit</span>
          </Link>

          <h1 className="text-3xl">{isLogin ? 'Welcome back' : 'Create your account'}</h1>
          <p className="muted mt-1.5 mb-6">
            {isLogin ? 'Sign in to continue where you left off.' : 'Takes less than a minute.'}
          </p>

          <form onSubmit={submit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="label" htmlFor="name">Name</label>
                <input id="name" className="input" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>
            )}
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" className="input" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                required
                minLength={6}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLogin ? 'Your password' : 'At least 6 characters'}
              />
            </div>

            {error && (
              <div role="alert" className="text-sm font-medium text-[#780000] bg-[#c1121f]/10 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button className="btn btn-primary btn-lg w-full" disabled={busy}>
              {busy ? <Spinner /> : isLogin ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="text-sm muted mt-6 text-center">
            {isLogin ? "New to Orbit? " : 'Already have an account? '}
            <Link to={isLogin ? '/signup' : '/login'} className="font-semibold text-[#c1121f] hover:underline">
              {isLogin ? 'Create an account' : 'Sign in'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
