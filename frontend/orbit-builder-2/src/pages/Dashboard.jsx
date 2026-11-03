import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Play, Plus, CheckCircle2, Clock, Calendar, Sparkles, Youtube,
  Trash2, AlertCircle, RefreshCw, ArrowRight, BookOpen, Layers, Check,
  BookMarked, MoreVertical, Flame
} from 'lucide-react';
import {
  getCourses, deleteCourse, getTasks, updateTask,
  getTimetableSummary, getTaskAvailableSlots, rescheduleTask, rescheduleAllOverdue
} from '../api';
import { Modal, EmptyState, Spinner, useUI, fmtTime, toDateStr } from '../components/ui';
import { OPEN_ADD_COURSE, COURSES_CHANGED } from '../components/AppShell';

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast, confirm } = useUI();

  const [courses, setCourses] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reschedule Modal State
  const [activeRescheduleTask, setActiveRescheduleTask] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [recommendedSlot, setRecommendedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [autoReschedulingAll, setAutoReschedulingAll] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const today = toDateStr();

      const [coursesRes, tasksRes, summaryRes] = await Promise.all([
        getCourses().catch(() => ({ courses: [] })),
        getTasks({ date: today }).catch(() => ({ tasks: [] })),
        getTimetableSummary().catch(() => null),
      ]);

      setCourses(coursesRes.courses || []);
      setTodayTasks(tasksRes.tasks || []);
      setSummary(summaryRes);
    } catch (err) {
      console.error('[Dashboard Error]:', err);
      toast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    const handleCoursesChanged = () => loadDashboardData();
    window.addEventListener(COURSES_CHANGED, handleCoursesChanged);
    return () => window.removeEventListener(COURSES_CHANGED, handleCoursesChanged);
  }, []);

  // Bulk Reschedule All Overdue
  const handleFitAllMissed = async () => {
    setAutoReschedulingAll(true);
    try {
      const res = await rescheduleAllOverdue();
      await loadDashboardData();
      if (res.movedCount > 0) {
        toast(`Relocated ${res.movedCount} task${res.movedCount > 1 ? 's' : ''} into upcoming open slots!`, 'success');
      } else {
        toast('No open slots could be found in the current week.', 'info');
      }
    } catch (err) {
      toast(err.message || 'Could not reschedule tasks.', 'error');
    } finally {
      setAutoReschedulingAll(false);
    }
  };

  // Delete Course
  const handleDeleteCourse = async (courseId, title, e) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Remove Course?',
      message: `Are you sure you want to remove "${title}"? All checkpoints and progress will be deleted.`,
      confirmLabel: 'Remove Course',
      danger: true,
    });
    if (!ok) return;

    try {
      await deleteCourse(courseId);
      setCourses((prev) => prev.filter((c) => c._id !== courseId));
      toast('Course removed.', 'info');
    } catch (err) {
      toast(err.message || 'Could not delete course.', 'error');
    }
  };

  // Toggle Task Completion
  const handleToggleTask = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const res = await updateTask(task._id, { status: newStatus });
      setTodayTasks((prev) => prev.map((t) => (t._id === task._id ? res.task : t)));
      const sum = await getTimetableSummary();
      setSummary(sum);
      if (newStatus === 'completed') {
        toast('Target completed! Keep up the momentum.', 'success');
      }
    } catch (err) {
      toast('Failed to update task', 'error');
    }
  };

  // Open Reschedule Modal
  const handleOpenReschedule = async (task) => {
    setActiveRescheduleTask(task);
    setLoadingSlots(true);
    try {
      const res = await getTaskAvailableSlots(task._id);
      setAvailableSlots(res.availableSlots || []);
      setRecommendedSlot(res.autoRecommended || null);
    } catch (err) {
      toast('Could not find available slots', 'error');
    } finally {
      setLoadingSlots(false);
    }
  };

  // Confirm Reschedule
  const handleConfirmReschedule = async (slot = null, auto = false) => {
    if (!activeRescheduleTask) return;
    setRescheduling(true);

    try {
      if (auto) {
        await rescheduleTask(activeRescheduleTask._id, { auto: true });
      } else if (slot) {
        await rescheduleTask(activeRescheduleTask._id, {
          newDate: slot.date,
          newStartTime: slot.startTime,
        });
      }

      toast('Task rescheduled into new slot!', 'success');
      setActiveRescheduleTask(null);
      await loadDashboardData();
    } catch (err) {
      toast(err.message || 'Failed to reschedule task.', 'error');
    } finally {
      setRescheduling(false);
    }
  };

  const overdueList = summary?.overdueTasks || [];

  return (
    <div className="page space-y-8">
      {/* ── TOP HEADER & SUMMARY METRICS ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[rgba(0,48,73,0.12)]">
        <div>
          <span className="font-handwritten text-xl text-[#c1121f] font-bold block mb-1">
            Focus & Execution Dashboard
          </span>
          <h1 className="page-title text-[#003049]">
            My Arena Shelf
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="card px-3.5 py-2 flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-[#669bbc]" />
            <div>
              <div className="text-[11px] font-semibold text-[#003049]/60 leading-none">Active Courses</div>
              <div className="text-sm font-bold text-[#003049] mt-0.5">{courses.length}</div>
            </div>
          </div>

          <div className="card px-3.5 py-2 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#c1121f]" />
            <div>
              <div className="text-[11px] font-semibold text-[#003049]/60 leading-none">Today's Progress</div>
              <div className="text-sm font-bold text-[#003049] mt-0.5">
                {summary?.todayCompleted || 0} / {summary?.todayTotal || 0}
              </div>
            </div>
          </div>

          {overdueList.length > 0 && (
            <div className="card px-3.5 py-2 flex items-center gap-2.5 bg-[#780000] text-[#fdf0d5] border-transparent">
              <AlertCircle className="w-4 h-4 text-[#fdf0d5]" />
              <div>
                <div className="text-[11px] font-semibold text-[#fdf0d5]/70 leading-none">Unfinished</div>
                <div className="text-sm font-bold text-[#fdf0d5] mt-0.5">{overdueList.length} Missed</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── GUILT-FREE OVERDUE PROMPT BANNER ── */}
      {overdueList.length > 0 && (
        <div className="card p-5 bg-white border-l-4 border-l-[#c1121f] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-[#780000]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>You have {overdueList.length} incomplete task{overdueList.length > 1 ? 's' : ''} from earlier days.</span>
            </div>
            <p className="text-xs text-[#003049]/70 leading-relaxed max-w-2xl">
              Zero guilt: life happens. Orbit automatically discovered open slots in your weekly routine to fit these without overcrowding your days.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleFitAllMissed}
              disabled={autoReschedulingAll}
              className="btn btn-primary btn-sm"
            >
              {autoReschedulingAll ? (
                <>
                  <Spinner /> Fitting...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#669bbc]" />
                  Auto-Fit Missed Tasks
                </>
              )}
            </button>
            <Link to="/timetable" className="btn btn-ghost btn-sm text-xs">
              View Timetable
            </Link>
          </div>
        </div>
      )}

      {/* ── MAIN DASHBOARD GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: COURSES (8 COLS) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2 text-[#003049]">
              <BookMarked className="w-5 h-5 text-[#c1121f]" />
              Enrolled Courses
            </h2>
            <button
              onClick={() => window.dispatchEvent(new Event(OPEN_ADD_COURSE))}
              className="btn btn-sm btn-primary"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Course
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="card p-4 space-y-3">
                  <div className="aspect-video skeleton w-full" />
                  <div className="h-4 skeleton w-3/4" />
                  <div className="h-3 skeleton w-1/2" />
                </div>
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="card p-10 text-center">
              <EmptyState
                icon={Youtube}
                title="No courses added yet"
                text="Paste any YouTube lecture or playlist to extract chapters into an active coding arena."
                action={
                  <button
                    onClick={() => window.dispatchEvent(new Event(OPEN_ADD_COURSE))}
                    className="btn btn-primary"
                  >
                    <Plus className="w-4 h-4" /> Add your first YouTube video
                  </button>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {courses.map((course) => {
                const totalCp = course.totalCheckpoints || 3;
                const completedCp = course.completedCheckpoints || 0;
                const progressPct = Math.round((completedCp / totalCp) * 100);

                return (
                  <div
                    key={course._id}
                    onClick={() => navigate(`/arena?courseId=${course._id}`)}
                    className="card card-hover p-4 flex flex-col justify-between cursor-pointer group bg-white border border-[rgba(0,48,73,0.14)]"
                  >
                    <div>
                      {/* Video Thumbnail */}
                      <div className="aspect-video rounded-lg overflow-hidden bg-[#001824] relative mb-3">
                        <img
                          src={course.thumbnailUrl || `https://img.youtube.com/vi/${course.videoIds?.[0]}/hqdefault.jpg`}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                        />
                        <div className="absolute top-2 left-2 flex gap-1.5">
                          <span className="chip chip-navy text-[10px]">
                            {course.sourceType === 'playlist' ? 'Playlist' : 'Lecture'}
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteCourse(course._id, course.title, e)}
                          title="Delete course"
                          className="absolute top-2 right-2 p-1.5 rounded-md bg-white/90 text-[#003049] hover:text-[#c1121f] hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Course Meta */}
                      <div className="flex items-center gap-2 mb-1.5 text-xs text-[#003049]/60 font-medium">
                        <span>{totalCp} Checkpoints</span>
                        <span>•</span>
                        <span>Active Interception</span>
                      </div>

                      <h3 className="text-base font-bold text-[#003049] line-clamp-2 leading-snug group-hover:text-[#c1121f] transition-colors mb-2">
                        {course.title}
                      </h3>

                      {/* Progress bar */}
                      <div className="space-y-1 mb-4">
                        <div className="flex justify-between text-[11px] font-semibold text-[#003049]/70">
                          <span>Mastery</span>
                          <span>{progressPct}%</span>
                        </div>
                        <div className="progress">
                          <span style={{ width: `${progressPct}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Launch CTA */}
                    <div className="pt-2 border-t border-[rgba(0,48,73,0.08)] flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#c1121f] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Launch Arena <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-[11px] font-mono text-[#003049]/50">
                        {course.videoIds?.length || 1} video{(course.videoIds?.length || 1) > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: TODAY'S AGENDA (4 COLS) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2 text-[#003049]">
              <Calendar className="w-5 h-5 text-[#780000]" />
              Today's Targets
            </h2>
            <Link to="/timetable" className="text-xs font-semibold text-[#c1121f] hover:underline">
              Full Week →
            </Link>
          </div>

          <div className="card p-4 space-y-3 bg-white">
            {todayTasks.length === 0 ? (
              <div className="py-8 text-center">
                <Clock className="w-8 h-8 text-[#003049]/30 mx-auto mb-2" />
                <p className="text-sm font-semibold text-[#003049]">No tasks for today</p>
                <p className="text-xs muted mt-1 max-w-[200px] mx-auto">
                  Add study sessions in your planner to maintain your learning streak.
                </p>
                <Link to="/timetable" className="btn btn-sm btn-ghost mt-3 text-[#c1121f]">
                  + Open Weekly Planner
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {todayTasks.map((task) => {
                  const isDone = task.status === 'completed';
                  return (
                    <div
                      key={task._id}
                      className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-2.5 ${
                        isDone
                          ? 'bg-[#fdf0d5]/40 border-[rgba(0,48,73,0.1)] opacity-60'
                          : 'bg-[#fffaf0] border-[rgba(0,48,73,0.16)]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <button
                          onClick={() => handleToggleTask(task)}
                          className={`w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            isDone
                              ? 'bg-[#003049] border-[#003049] text-[#fdf0d5]'
                              : 'bg-white border-[rgba(0,48,73,0.3)] hover:border-[#003049]'
                          }`}
                        >
                          {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <span className={`text-xs font-semibold block truncate ${isDone ? 'line-through text-neutral-400' : 'text-[#003049]'}`}>
                            {task.title}
                          </span>
                          <span className="text-[11px] text-[#003049]/60 font-mono">
                            {fmtTime(task.scheduledStartTime)} • {task.durationMinutes}m
                          </span>
                        </div>
                      </div>

                      {!isDone && (
                        <button
                          onClick={() => handleOpenReschedule(task)}
                          title="Reschedule to an empty slot"
                          className="btn btn-ghost btn-sm text-[11px] h-7 px-2 text-[#c1121f] shrink-0"
                        >
                          Reschedule
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL: DYNAMIC RESCHEDULER FOR SPECIFIC TASK ── */}
      <Modal
        open={Boolean(activeRescheduleTask)}
        onClose={() => setActiveRescheduleTask(null)}
        title="Find an Open Focus Slot"
        subtitle={activeRescheduleTask ? `Move "${activeRescheduleTask.title}" without breaking your rhythm.` : ''}
        footer={
          <>
            <button className="btn" onClick={() => setActiveRescheduleTask(null)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleConfirmReschedule(null, true)}
              disabled={rescheduling || !recommendedSlot}
            >
              {rescheduling ? <Spinner /> : 'Auto-Move to Top Slot'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-[#003049]/70">
            Orbit calculated these open gaps in your weekly routine that align with your peak focus hours:
          </p>

          {loadingSlots ? (
            <div className="py-8 text-center text-xs font-mono text-[#003049]/60 flex items-center justify-center gap-2">
              <Spinner /> Scanning your weekly schedule...
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="card p-4 text-center text-xs text-[#003049]/70 bg-[#fff8ea]">
              No free slots found in the upcoming 7 days. Open the Planner to adjust commitment hours.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {availableSlots.slice(0, 5).map((slot, idx) => (
                <button
                  key={idx}
                  onClick={() => handleConfirmReschedule(slot, false)}
                  disabled={rescheduling}
                  className="w-full text-left p-3 rounded-xl border border-[rgba(0,48,73,0.14)] bg-[#fffaf0] hover:bg-white transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-bold text-[#003049]">
                      {slot.dayLabel} at {slot.startTimeFormatted}
                    </div>
                    <div className="text-[11px] text-[#003049]/60">
                      {slot.label} • {slot.period?.toUpperCase()} focus
                    </div>
                  </div>
                  <span className={`chip text-[10px] ${idx === 0 ? 'chip-navy' : ''}`}>
                    {idx === 0 ? 'Best match ★' : `Slot #${idx + 1}`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}