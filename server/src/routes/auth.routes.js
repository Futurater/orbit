import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { TimetableSlot } from '../models/TimetableSlot.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

function generateToken(userId) {
  const secret = process.env.JWT_SECRET || 'orbit_super_secret_jwt_key_2026_change_in_production';
  return jwt.sign({ id: userId }, secret, { expiresIn: '30d' });
}

// Helper to seed initial timetable based on quiz answers
async function seedDefaultSlots(userId, wakeTime = '07:00', sleepTime = '23:00', preferredPeriod = 'evening') {
  await TimetableSlot.deleteMany({ user: userId });

  const slots = [];
  const days = [0, 1, 2, 3, 4, 5, 6];

  for (const day of days) {
    // Standard daily study slot based on preference
    if (preferredPeriod === 'morning') {
      slots.push({ user: userId, dayOfWeek: day, startTime: '09:00', endTime: '10:30', slotType: 'study', label: 'Morning Deep Work' });
      slots.push({ user: userId, dayOfWeek: day, startTime: '18:00', endTime: '19:00', slotType: 'free', label: 'Evening Review' });
    } else if (preferredPeriod === 'afternoon') {
      slots.push({ user: userId, dayOfWeek: day, startTime: '14:00', endTime: '15:30', slotType: 'study', label: 'Afternoon Coding Sprint' });
    } else if (preferredPeriod === 'night') {
      slots.push({ user: userId, dayOfWeek: day, startTime: '21:30', endTime: '23:00', slotType: 'study', label: 'Night Owl Coding' });
    } else {
      // Default evening
      slots.push({ user: userId, dayOfWeek: day, startTime: '18:00', endTime: '19:30', slotType: 'study', label: 'Prime Evening Study' });
      slots.push({ user: userId, dayOfWeek: day, startTime: '20:30', endTime: '21:30', slotType: 'free', label: 'Practice & Review' });
    }

    // Weekday college / work block
    if (day >= 1 && day <= 5) {
      slots.push({ user: userId, dayOfWeek: day, startTime: '10:00', endTime: '16:00', slotType: 'blocked', label: 'Classes / Work' });
    }
  }

  await TimetableSlot.insertMany(slots);
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide name, email, and password.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
    });

    // Seed default slots
    await seedDefaultSlots(user._id);

    const token = generateToken(user._id);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        preferredLanguage: user.preferredLanguage,
        onboardingCompleted: user.onboardingCompleted,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user._id);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        preferredLanguage: user.preferredLanguage,
        wakeTime: user.wakeTime,
        sleepTime: user.sleepTime,
        dailyStudyHours: user.dailyStudyHours,
        preferredStudyPeriod: user.preferredStudyPeriod,
        onboardingCompleted: user.onboardingCompleted,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/onboarding-quiz
router.post('/onboarding-quiz', authenticateToken, async (req, res) => {
  try {
    const { wakeTime, sleepTime, preferredStudyPeriod, dailyStudyHours, commitments, preferredLanguage } = req.body;

    const user = req.user;
    if (wakeTime) user.wakeTime = wakeTime;
    if (sleepTime) user.sleepTime = sleepTime;
    if (preferredStudyPeriod) user.preferredStudyPeriod = preferredStudyPeriod;
    if (dailyStudyHours) user.dailyStudyHours = Number(dailyStudyHours);
    if (preferredLanguage) user.preferredLanguage = preferredLanguage;
    user.onboardingCompleted = true;
    await user.save();

    // Re-seed slots with quiz answers
    await seedDefaultSlots(user._id, user.wakeTime, user.sleepTime, user.preferredStudyPeriod);

    // If user specified custom commitments (e.g. { dayOfWeek, startTime, endTime, label })
    if (Array.isArray(commitments) && commitments.length > 0) {
      for (const com of commitments) {
        if (com.startTime && com.endTime) {
          await TimetableSlot.create({
            user: user._id,
            dayOfWeek: com.dayOfWeek ?? 1,
            startTime: com.startTime,
            endTime: com.endTime,
            slotType: 'blocked',
            label: com.label || 'Fixed Commitment',
          });
        }
      }
    }

    res.json({
      message: 'Onboarding complete. Timetable generated successfully.',
      user,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
