import express from 'express';
import { TimetableSlot } from '../models/TimetableSlot.js';
import { Task } from '../models/Task.js';
import { authenticateToken } from '../middleware/auth.js';
import { findAvailableSlots, minutesToTime, timeToMinutes } from '../utils/slotFinder.js';

const router = express.Router();

// GET /api/timetable or /api/timetable/slots — Fetch all recurring weekly slots
router.get(['/', '/slots'], authenticateToken, async (req, res) => {
  try {
    const slots = await TimetableSlot.find({ user: req.user._id }).sort({ dayOfWeek: 1, startTime: 1 });
    res.json({ slots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timetable/slots — Add a recurring slot
router.post('/slots', authenticateToken, async (req, res) => {
  try {
    const { dayOfWeek, startTime, endTime, slotType, label } = req.body;
    if (dayOfWeek === undefined || !startTime || !endTime) {
      return res.status(400).json({ error: 'dayOfWeek, startTime, and endTime are required.' });
    }

    const slot = await TimetableSlot.create({
      user: req.user._id,
      dayOfWeek: Number(dayOfWeek),
      startTime,
      endTime,
      slotType: slotType || 'study',
      label: label || 'Study Slot',
    });

    res.status(201).json({ slot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/timetable/slots/:id
router.delete('/slots/:id', authenticateToken, async (req, res) => {
  try {
    await TimetableSlot.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ message: 'Slot removed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timetable/tasks — Fetch tasks (supports ?date=YYYY-MM-DD or ?startDate & ?endDate)
router.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;
    const filter = { user: req.user._id };

    if (date) {
      filter.scheduledDate = date;
    } else if (startDate && endDate) {
      filter.scheduledDate = { $gte: startDate, $lte: endDate };
    }

    const tasks = await Task.find(filter)
      .populate('course', 'title thumbnailUrl')
      .sort({ scheduledDate: 1, scheduledStartTime: 1 });

    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timetable/tasks — Create a new task
router.post('/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, description, durationMinutes, priority, scheduledDate, scheduledStartTime, courseId, checkpointId } = req.body;

    if (!title || !scheduledDate) {
      return res.status(400).json({ error: 'Title and scheduledDate are required.' });
    }

    const duration = Number(durationMinutes) || 45;
    let endTime = '';
    if (scheduledStartTime) {
      const startMins = timeToMinutes(scheduledStartTime);
      endTime = minutesToTime(startMins + duration);
    }

    const task = await Task.create({
      user: req.user._id,
      title,
      description: description || '',
      durationMinutes: duration,
      priority: priority || 'medium',
      scheduledDate,
      scheduledStartTime: scheduledStartTime || '10:00',
      scheduledEndTime: endTime || '10:45',
      originalDate: scheduledDate,
      course: courseId || null,
      checkpoint: checkpointId || null,
    });

    res.status(201).json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/timetable/tasks/:id — Update a task (e.g. toggle complete)
router.put('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const { title, description, status, priority, durationMinutes } = req.body;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority !== undefined) task.priority = priority;
    if (durationMinutes !== undefined) task.durationMinutes = durationMinutes;

    if (status !== undefined) {
      task.status = status;
      if (status === 'completed' && !task.completedAt) {
        task.completedAt = new Date();
      } else if (status !== 'completed') {
        task.completedAt = null;
      }
    }

    await task.save();
    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/timetable/tasks/:id
router.delete('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ message: 'Task deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timetable/tasks/:id/available-slots — Find smart empty slots for an incomplete task
router.get('/tasks/:id/available-slots', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const [timetableSlots, existingTasks] = await Promise.all([
      TimetableSlot.find({ user: req.user._id }),
      Task.find({ user: req.user._id, status: { $ne: 'completed' } }),
    ]);

    const result = findAvailableSlots({
      user: req.user,
      timetableSlots,
      existingTasks,
      taskDurationMinutes: task.durationMinutes || 45,
      daysAhead: 7,
    });

    res.json({
      task: {
        id: task._id,
        title: task.title,
        durationMinutes: task.durationMinutes,
        currentScheduledDate: task.scheduledDate,
        currentStartTime: task.scheduledStartTime,
      },
      availableSlots: result.slots,
      autoRecommended: result.recommendedSlot,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timetable/tasks/:id/reschedule — Dynamic Reschedule of an incomplete task!
router.post('/tasks/:id/reschedule', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    let { newDate, newStartTime, auto } = req.body;

    // If auto is requested, calculate the top slot automatically
    if (auto || (!newDate && !newStartTime)) {
      const [timetableSlots, existingTasks] = await Promise.all([
        TimetableSlot.find({ user: req.user._id }),
        Task.find({ user: req.user._id, status: { $ne: 'completed' } }),
      ]);

      const result = findAvailableSlots({
        user: req.user,
        timetableSlots,
        existingTasks,
        taskDurationMinutes: task.durationMinutes || 45,
        daysAhead: 7,
      });

      if (!result.recommendedSlot) {
        return res.status(400).json({ error: 'No empty slot found in the upcoming week.' });
      }

      newDate = result.recommendedSlot.date;
      newStartTime = result.recommendedSlot.startTime;
    }

    const duration = task.durationMinutes || 45;
    const startMins = timeToMinutes(newStartTime || '10:00');
    const newEndTime = minutesToTime(startMins + duration);

    // Record history
    task.rescheduleHistory.push({
      fromDate: task.scheduledDate,
      fromTime: task.scheduledStartTime,
      toDate: newDate,
      toTime: newStartTime,
      rescheduledAt: new Date(),
    });

    task.scheduledDate = newDate;
    task.scheduledStartTime = newStartTime;
    task.scheduledEndTime = newEndTime;
    task.rescheduleCount += 1;
    task.status = 'rescheduled'; // User can mark back to in_progress or completed
    await task.save();

    res.json({
      message: `Task successfully rescheduled to ${newDate} at ${newStartTime}!`,
      task,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timetable/reschedule-overdue — Auto-fit ALL missed tasks into empty upcoming slots
router.post('/reschedule-overdue', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const overdue = await Task.find({
      user: req.user._id,
      scheduledDate: { $lt: today },
      status: { $ne: 'completed' },
    }).sort({ scheduledDate: 1 });

    const timetableSlots = await TimetableSlot.find({ user: req.user._id });
    const moved = [];
    const unplaced = [];

    for (const task of overdue) {
      // Refetch each loop so tasks placed earlier in this run block their slots
      const existingTasks = await Task.find({ user: req.user._id, status: { $ne: 'completed' } });
      const result = findAvailableSlots({
        user: req.user,
        timetableSlots,
        existingTasks,
        taskDurationMinutes: task.durationMinutes || 45,
        daysAhead: 7,
      });

      if (!result.recommendedSlot) {
        unplaced.push(task.title);
        continue;
      }

      const slot = result.recommendedSlot;
      task.rescheduleHistory.push({
        fromDate: task.scheduledDate,
        fromTime: task.scheduledStartTime,
        toDate: slot.date,
        toTime: slot.startTime,
        rescheduledAt: new Date(),
      });
      task.scheduledDate = slot.date;
      task.scheduledStartTime = slot.startTime;
      task.scheduledEndTime = minutesToTime(timeToMinutes(slot.startTime) + (task.durationMinutes || 45));
      task.rescheduleCount += 1;
      task.status = 'rescheduled';
      await task.save();
      moved.push({ title: task.title, date: slot.date, time: slot.startTime });
    }

    res.json({ movedCount: moved.length, moved, unplaced });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timetable/summary — Productivity Overview
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [todayTasks, allTasks] = await Promise.all([
      Task.find({ user: req.user._id, scheduledDate: today }),
      Task.find({ user: req.user._id }),
    ]);

    const completedToday = todayTasks.filter((t) => t.status === 'completed').length;
    const pendingToday = todayTasks.filter((t) => t.status !== 'completed').length;
    const totalCompleted = allTasks.filter((t) => t.status === 'completed').length;

    // Incomplete tasks from yesterday or earlier
    const overdueTasks = allTasks.filter(
      (t) => t.scheduledDate < today && t.status !== 'completed'
    );

    res.json({
      today,
      todayTotal: todayTasks.length,
      todayCompleted: completedToday,
      todayPending: pendingToday,
      totalCompleted,
      overdueTasksCount: overdueTasks.length,
      overdueTasks,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
