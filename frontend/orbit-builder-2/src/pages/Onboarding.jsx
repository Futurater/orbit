import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Sunrise, Sunset } from 'lucide-react';
import { submitOnboardingQuiz } from '../api';
import { Spinner, useUI } from '../components/ui';

const PERIODS = [
  { id: 'morning', label: 'Morning', time: '6 am – 12 pm', icon: Sunrise },
  { id: 'afternoon', label: 'Afternoon', time: '12 – 5 pm', icon: Sun },
  { id: 'evening', label: 'Evening', time: '5 – 9 pm', icon: Sunset },
  { id: 'night', label: 'Night', time: '9 pm – 1 am', icon: Moon },
];
const DAYS = [
  { id: 1, label: 'Mon' }, { id: 2, label: 'Tue' }, { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' }, { id: 5, label: 'Fri' }, { id: 6, label: 'Sat' }, { id: 0, label: 'Sun' },
];

function Section({ title, hint, children }) {
  return (
    <section className="card p-5 md:p-6">
      <h2 className="text-lg">{title}</h2>
      {hint && <p className="muted text-sm mt-0.5 mb-4">{hint}</p>}
      {!hint && <div className="mb-4" />}
      {children}
    </section>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useUI();

  const [wakeTime, setWakeTime] = useState('07:00');
  const [sleepTime, setSleepTime] = useState('23:00');
  const [dailyHours, setDailyHours] = useState(2);
  const [period, setPeriod] = useState('evening');
  const [busyDays, setBusyDays] = useState([1, 2, 3, 4, 5]);
  const [hasCommitment, setHasCommitment] = useState(true);
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('16:00');
  const [label, setLabel] = useState('College / work');
  const [saving, setSaving] = useState(false);

  const toggleDay = (id) => setBusyDays((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));

  const save = async (e) => {
    e.preventDefault();
    if (hasCommitment && start >= end) {
      toast('Commitment end time must be after the start time.', 'error');
      return;
    }
    setSaving(true);
    try {
      const commitments = hasCommitment
        ? busyDays.map((d) => ({ dayOfWeek: d, startTime: start, endTime: end, label }))
        : [];
      await submitOnboardingQuiz({
        wakeTime,
        sleepTime,
        dailyStudyHours: dailyHours,
        preferredStudyPeriod: period,
        commitments,
      });
      toast('Schedule saved. Your planner is ready.', 'success');
      navigate('/dashboard');
    } catch (err) {
      toast(err.message || 'Could not save your schedule.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page max-w-2xl">
      <header className="mb-6">
        <h1 className="page-title">Set up your study schedule</h1>
        <p className="muted mt-1.5">
          Tell us when you're free. Orbit uses this to place study sessions — and to find a new slot when you miss one.
        </p>
      </header>

      <form onSubmit={save} className="space-y-5">
        <Section title="Your day">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="wake">I wake up at</label>
              <input id="wake" type="time" className="input" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="sleep">I go to bed at</label>
              <input id="sleep" type="time" className="input" value={sleepTime} onChange={(e) => setSleepTime(e.target.value)} />
            </div>
          </div>
        </Section>

        <Section title="Study goal" hint="How much time do you want to study each day?">
          <div className="grid grid-cols-4 gap-2" role="radiogroup">
            {[1, 2, 3, 4].map((h) => (
              <button
                key={h}
                type="button"
                role="radio"
                aria-checked={dailyHours === h}
                onClick={() => setDailyHours(h)}
                className={`btn ${dailyHours === h ? 'btn-primary' : ''}`}
              >
                {h} hr{h > 1 ? 's' : ''}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Best time to focus" hint="Rescheduled tasks are placed in this window first.">
          <div className="grid grid-cols-2 gap-2.5" role="radiogroup">
            {PERIODS.map(({ id, label: l, time, icon: Icon }) => {
              const on = period === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setPeriod(id)}
                  className={`text-left p-3.5 rounded-xl border transition-colors ${
                    on ? 'bg-[#003049] text-[#fdf0d5] border-[#003049]' : 'bg-white border-[rgba(0,48,73,.2)] hover:border-[#003049]'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-2" />
                  <div className="font-semibold text-sm">{l}</div>
                  <div className={`text-xs ${on ? 'text-[#fdf0d5]/70' : 'muted'}`}>{time}</div>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Fixed commitments" hint="Classes, work, gym — Orbit will never schedule over these.">
          <label className="flex items-center gap-2.5 text-sm font-medium mb-4 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-[#003049]"
              checked={hasCommitment}
              onChange={(e) => setHasCommitment(e.target.checked)}
            />
            I have a regular commitment
          </label>

          {hasCommitment && (
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="lbl">What is it?</label>
                <input id="lbl" className="input" value={label} onChange={(e) => setLabel(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="st">From</label>
                  <input id="st" type="time" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="en">Until</label>
                  <input id="en" type="time" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
                </div>
              </div>
              <div>
                <span className="label">On these days</span>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(({ id, label: d }) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={busyDays.includes(id)}
                      onClick={() => toggleDay(id)}
                      className={`btn btn-sm min-w-[3.1rem] ${busyDays.includes(id) ? 'btn-primary' : ''}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Section>

        <div className="flex justify-end">
          <button className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? <Spinner /> : 'Save and continue'}
          </button>
        </div>
      </form>
    </div>
  );
}
