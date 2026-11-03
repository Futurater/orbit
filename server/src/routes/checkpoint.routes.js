import express from 'express';
import { Session } from '../models/Session.js';
import { Checkpoint } from '../models/Checkpoint.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/checkpoints/:checkpointId/session
router.get('/:checkpointId/session', authenticateToken, async (req, res) => {
  try {
    const { checkpointId } = req.params;
    let session = await Session.findOne({ user: req.user._id, checkpointId });

    if (!session) {
      session = await Session.create({
        user: req.user._id,
        checkpointId,
        attemptCount: 0,
        vivaAttemptCount: 0,
        vivaStatus: 'NOT_STARTED',
        vivaQuestion: null,
      });
    }

    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/checkpoints/:checkpointId/session
router.put('/:checkpointId/session', authenticateToken, async (req, res) => {
  try {
    const { checkpointId } = req.params;
    const { attemptCount, vivaAttemptCount, vivaStatus, vivaQuestion, userCode } = req.body;

    let session = await Session.findOne({ user: req.user._id, checkpointId });
    if (!session) {
      session = new Session({ user: req.user._id, checkpointId });
    }

    if (attemptCount !== undefined) session.attemptCount = attemptCount;
    if (vivaAttemptCount !== undefined) session.vivaAttemptCount = vivaAttemptCount;
    if (vivaStatus !== undefined) session.vivaStatus = vivaStatus;
    if (vivaQuestion !== undefined) session.vivaQuestion = vivaQuestion;
    if (userCode !== undefined) session.userCode = userCode;
    if (vivaStatus === 'COMPLETED' && !session.completedAt) {
      session.completedAt = new Date();
    }

    await session.save();
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
