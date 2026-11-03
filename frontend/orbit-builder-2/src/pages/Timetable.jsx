import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, Plus, Check, ArrowRight, RefreshCw, AlertCircle,
  Sparkles, Trash2, Tag, ChevronLeft, ChevronRight, BookOpen
} from 'lucide-react';
import {
  getTimetableSlots, getTasks, createTask, updateTask, deleteTask,
  getTaskAvailableSlots, rescheduleTask, rescheduleAllOverdue, getCourses, getTimetableSummary
} from '../api';
import { Modal, EmptyState, Spinner, useUI, fmtTime, toDateStr } from '../components/ui';

const DAYS_OF_WEEK = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
  { id: 0, name: 'Sunday', short: 'Sun' },
];

export default function Timetable() {
  const { toast, confirm } = useUI();
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [recurringSlots, setRecurringSlots] = useState([]);
  const [courses, setCourses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Add Task Modal State
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState(45);
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskDate, setNewTaskDate] = useState(toDateStr());
  const [newTaskTime, setNewTaskTime] = useState('18:00');
  const [newTaskCourseId, setNewTaskCourseId] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  // Reschedule Modal State
  const [activeRescheduleTask, setActiveRescheduleTask] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [recommendedSlot, setRecommendedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [autoReschedulingAll, setAutoReschedulingAll] = useState(false);

  // Compute Current Week Dates (Monday to Sunday)
  const getWeekDates = () => {
    const curr = new Date();
    const currentDayOfWeek = curr.getDay();
    const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;

    const monday = new Date(curr);
    monday.setDate(curr.getDate() + distanceToMonday + selectedDayOffset * 7);

    const todayStr = toDateStr();

    return DAYS_OF_WEEK.map((d, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const dateStr = toDateStr(date);
      return {
        ...d,
        date: dateStr,
        formatted: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isToday: dateStr === todayStr,
      };
    });
  };

  const weekDates = getWeekDates();

  const loadData = async () => {
    try {
      setLoading(true);
      const startDate = weekDates[0].date;
      const endDate = weekDates[6].date;

      const [slotsRes, tasksRes, coursesRes, summaryRes] = await Promise.all([
        getTimetableSlots().catch(() => ({ slots: [] })),
        getTasks({ startDate, endDate }).catch(() => ({ tasks: [] })),
        getCourses().catch(() => ({ courses: [] })),
        getTimetableSummary().catch(() => null),
      ]);

      setRecurringSlots(slotsRes.slots || []);
      setTasks(tasksRes.tasks || []);
      setCourses(coursesRes.courses || []);
      setSummary(summaryRes);
    } catch (err) {
      console.error('[Timetable Error]:', err);
      toast('Failed to load planner', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDayOffset]);

  // Create Task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setCreatingTask(true);
    try {
      await createTask({
        title: newTaskTitle.trim(),
        durationMinutes: newTaskDuration,
        priority: newTaskPriority,
        scheduledDate: newTaskDate,
        scheduledStartTime: newTaskTime,
        courseId: newTaskCourseId || null,
      });

      setIsAddTaskOpen(false);
      setNewTaskTitle('');
      toast('Task added to schedule.', 'success');
      await loadData();
    } catch (err) {
      toast(err.message || 'Failed to create task.', 'error');
    } finally {
      setCreatingTask(false);
    }
  };

  // Toggle Task Status
  const handleToggleTask = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await updateTask(task._id, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t._id === task._id ? { ...t, status: newStatus } : t)));
      toast(newStatus === 'completed' ? 'Task marked complete.' : 'Task re-opened.', 'info');
    } catch (err) {
      toast('Could not update task.', 'error');
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId, title) => {
    const ok = await confirm({
      title: 'Delete Task?',
      message: `Remove "${title}" from your schedule?`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;

    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      toast('Task removed.', 'info');
    } catch (err) {
      toast('Could not delete task.', 'error');
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
      toast('Could not scan for open slots.', 'error');
    } finally {
      setLoadingSlots(false);
    }
  };

  // Confirm Reschedule
  const handleConfirmReschedule = async (slot = null, auto = false) => {
    if (!activeRescheduleTask) return;
    setIsRescheduling(true);

    try {
      if (auto) {
        await rescheduleTask(activeRescheduleTask._id, { auto: true });
      } else if (slot) {
        await rescheduleTask(activeRescheduleTask._id, {
          newDate: slot.date,
          newStartTime: slot.startTime,
        });
      }

      toast('Task moved to new slot.', 'success');
      setActiveRescheduleTask(null);
      await loadData();
    } catch (err) {
      toast(err.message || 'Rescheduling failed.', 'error');
    } finally {
      setIsRescheduling(false);
    }
  };

  // Bulk Reschedule Overdue
  const handleFitAllMissed = async () => {
    setAutoReschedulingAll(true);
    try {
      const res = await rescheduleAllOverdue();
      await loadData();
      if (res.movedCount > 0) {
        toast(`Moved ${res.movedCount} task${res.movedCount > 1 ? 's' : ''} to upcoming empty slots!`, 'success');
      } else {
        toast('No open slots available this week.', 'info');
      }
    } catch (err) {
      toast(err.message || 'Could not reschedule tasks.', 'error');
    } finally {
      setAutoReschedulingAll(false);
    }
  };

  const overdueCount = summary?.overdueTasksCount || 0;

  return (
    <div className="page space-y-6">
      {/* ── HEADER & NAVIGATION CONTROLS ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[rgba(0,48,73,0.12)]">
        <div>
          <span className="font-handwritten text-xl text-[#c1121f] font-bold block mb-1">
            Dynamic Rhythm & Focus Planner
          </span>
          <h1 className="page-title text-[#003049]">
            Weekly Timetable
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 bg-white border border-[rgba(0,48,73,0.2)] rounded-lg p-1 text-xs shadow-sm">
            <button
              onClick={() => setSelectedDayOffset((prev) => prev - 1)}
              className="p-1 hover:bg-[#fdf0d5] rounded transition-colors"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4 text-[#003049]" />
            </button>
            <span className="px-2 font-semibold text-[#003049]">
              {weekDates[0].formatted} – {weekDates[6].formatted}
            </span>
            <button
              onClick={() => setSelectedDayOffset((prev) => prev + 1)}
              className="p-1 hover:bg-[#fdf0d5] rounded transition-colors"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4 text-[#003049]" />
            </button>
          </div>

          {selectedDayOffset !== 0 && (
            <button
              onClick={() => setSelectedDayOffset(0)}
              className="btn btn-sm btn-ghost text-xs"
            >
              This Week
            </button>
          )}

          <button
            onClick={() => {
              setNewTaskDate(toDateStr());
              setIsAddTaskOpen(true);
            }}
            className="btn btn-sm btn-primary"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
      </div>

      {/* ── OVERDUE BANNER ── */}
      {overdueCount > 0 && (
        <div className="card p-4 bg-white border-l-4 border-l-[#c1121f] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#780000] shrink-0" />
            <span className="text-xs font-semibold text-[#003049]">
              You have {overdueCount} missed task{overdueCount > 1 ? 's' : ''} from earlier days.
            </span>
          </div>
          <button
            onClick={handleFitAllMissed}
            disabled={autoReschedulingAll}
            className="btn btn-primary btn-sm shrink-0"
          >
            {autoReschedulingAll ? <Spinner /> : <Sparkles className="w-3.5 h-3.5 text-[#669bbc]" />}
            Auto-Fit Missed Tasks
          </button>
        </div>
      )}

      {/* ── 7-DAY WEEKLY GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekDates.map((day) => {
          const dayTasks = tasks.filter((t) => t.scheduledDate === day.date);
          const daySlots = recurringSlots.filter((s) => s.dayOfWeek === day.id);

          return (
            <div
              key={day.date}
              className={`card flex flex-col justify-between p-3 min-h-[480px] bg-white transition-all ${
                day.isToday ? 'border-2 border-[#003049] shadow-md' : 'border border-[rgba(0,48,73,0.14)]'
              }`}
            >
              <div>
                {/* Column Day Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[rgba(0,48,73,0.08)]">
                  <div>
                    <span className="text-xs font-bold text-[#003049] block">
                      {day.name}
                    </span>
                    <span className="text-[11px] text-[#003049]/60 font-mono">
                      {day.formatted}
                    </span>
                  </div>
                  {day.isToday && (
                    <span className="chip chip-navy text-[9px] py-0.5 px-1.5">
                      Today
                    </span>
                  )}
                </div>

                {/* Recurring Blocks on This Day */}
                {daySlots.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {daySlots.map((slot, sIdx) => {
                      const isBlocked = slot.slotType === 'blocked';
                      return (
                        <div
                          key={sIdx}
                          className={`px-2 py-1 rounded text-[10px] font-medium truncate ${
                            isBlocked
                              ? 'bg-[#003049]/5 text-[#003049]/70 border border-dashed border-[rgba(0,48,73,0.2)]'
                              : 'bg-[#669bbc]/20 text-[#003049] border border-[#669bbc]/30'
                          }`}
                          title={`${slot.startTime} - ${slot.endTime} (${slot.label})`}
                        >
                          {slot.startTime} • {slot.label}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Day's Tasks */}
                <div className="space-y-2">
                  {dayTasks.length === 0 ? (
                    <div className="py-6 text-center text-[11px] text-[#003049]/40 font-medium">
                      No tasks
                    </div>
                  ) : (
                    dayTasks.map((task) => {
                      const isDone = task.status === 'completed';
                      return (
                        <div
                          key={task._id}
                          className={`p-2.5 rounded-lg border text-xs transition-all ${
                            isDone
                              ? 'bg-[#fdf0d5]/30 border-[rgba(0,48,73,0.1)] opacity-60'
                              : 'bg-[#fffaf0] border-[rgba(0,48,73,0.16)]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <span className={`font-semibold leading-tight line-clamp-2 ${isDone ? 'line-through text-neutral-400' : 'text-[#003049]'}`}>
                              {task.title}
                            </span>
                            <button
                              onClick={() => handleDeleteTask(task._id, task.title)}
                              className="text-neutral-400 hover:text-[#c1121f] p-0.5 shrink-0"
                              title="Delete task"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-mono text-[#003049]/60 mb-1.5">
                            <span>{fmtTime(task.scheduledStartTime)}</span>
                            <span>{task.durationMinutes}m</span>
                          </div>

                          {task.rescheduleCount > 0 && (
                            <div className="mb-1.5">
                              <span className="chip text-[9px] py-0 px-1.5 bg-[#669bbc]/20 text-[#003049]">
                                Moved {task.rescheduleCount}x
                              </span>
                            </div>
                          )}

                          {/* Task Action Bar */}
                          <div className="pt-1.5 border-t border-[rgba(0,48,73,0.08)] flex items-center justify-between">
                            <button
                              onClick={() => handleToggleTask(task)}
                              className={`flex items-center gap-1 text-[10px] font-semibold ${
                                isDone ? 'text-neutral-400' : 'text-[#003049] hover:underline'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              <span>{isDone ? 'Done' : 'Complete'}</span>
                            </button>

                            {!isDone && (
                              <button
                                onClick={() => handleOpenReschedule(task)}
                                className="text-[10px] font-semibold text-[#c1121f] hover:underline"
                              >
                                Reschedule
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Quick Add Button */}
              <button
                onClick={() => {
                  setNewTaskDate(day.date);
                  setIsAddTaskOpen(true);
                }}
                className="w-full mt-3 py-1.5 rounded-lg border border-dashed border-[rgba(0,48,73,0.2)] hover:border-[#003049] text-[11px] font-medium text-[#003049]/60 hover:text-[#003049] transition-colors"
              >
                + Add task
              </button>
            </div>
          );
        })}
      </div>

      {/* ── MODAL: CREATE TASK ── */}
      <Modal
        open={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        title="Add Schedule Task"
        subtitle="Schedule a focused coding session or practice slot."
        footer={
          <>
            <button className="btn" onClick={() => setIsAddTaskOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" form="add-task-form" type="submit" disabled={creatingTask}>
              {creatingTask ? <Spinner /> : 'Save Task'}
            </button>
          </>
        }
      >
        <form id="add-task-form" onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="label" htmlFor="task-title">Task Title</label>
            <input
              id="task-title"
              type="text"
              required
              autoFocus
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="e.g. Practise Recursion Checkpoint 2"
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="task-date">Date</label>
              <input
                id="task-date"
                type="date"
                value={newTaskDate}
                onChange={(e) => setNewTaskDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="task-time">Start Time</label>
              <input
                id="task-time"
                type="time"
                value={newTaskTime}
                onChange={(e) => setNewTaskTime(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="task-duration">Duration</label>
              <select
                id="task-duration"
                value={newTaskDuration}
                onChange={(e) => setNewTaskDuration(Number(e.target.value))}
                className="input"
              >
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="task-priority">Priority</label>
              <select
                id="task-priority"
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value)}
                className="input"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {courses.length > 0 && (
            <div>
              <label className="label" htmlFor="task-course">Link to Enrolled Course (Optional)</label>
              <select
                id="task-course"
                value={newTaskCourseId}
                onChange={(e) => setNewTaskCourseId(e.target.value)}
                className="input"
              >
                <option value="">No Course Link</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>{c.title}</option>
                ))}
              </select>
            </div>
          )}
        </form>
      </Modal>

      {/* ── MODAL: RESCHEDULE SPECIFIC TASK ── */}
      <Modal
        open={Boolean(activeRescheduleTask)}
        onClose={() => setActiveRescheduleTask(null)}
        title="Reschedule Task"
        subtitle={activeRescheduleTask ? `Choose a free slot for "${activeRescheduleTask.title}".` : ''}
        footer={
          <>
            <button className="btn" onClick={() => setActiveRescheduleTask(null)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleConfirmReschedule(null, true)}
              disabled={isRescheduling || !recommendedSlot}
            >
              {isRescheduling ? <Spinner /> : 'Auto-Move to Top Slot'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-[#003049]/70">
            Discovered open intervals that match your focus hours without overlapping fixed commitments:
          </p>

          {loadingSlots ? (
            <div className="py-8 text-center text-xs font-mono text-[#003049]/60 flex items-center justify-center gap-2">
              <Spinner /> Calculating free time blocks...
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="card p-4 text-center text-xs text-[#003049]/70 bg-[#fff8ea]">
              No empty slots found in the upcoming week. Adjust your commitments in Schedule.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {availableSlots.slice(0, 5).map((slot, idx) => (
                <button
                  key={idx}
                  onClick={() => handleConfirmReschedule(slot, false)}
                  disabled={isRescheduling}
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
                    {idx === 0 ? 'Optimal ★' : `Slot #${idx + 1}`}
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
