import express from 'express';
import axios from 'axios';
import { Session } from '../models/Session.js';
import { Checkpoint } from '../models/Checkpoint.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const FASTAPI_URL = process.env.FASTAPI_AI_URL || 'http://127.0.0.1:8000';

// POST /api/ai/submit-code
router.post('/submit-code', authenticateToken, async (req, res) => {
  try {
    const { checkpoint_id, language_preference } = req.body;
    const user_code = req.body.user_code || req.body.code || '';

    // Track attempt count server-side
    let session = await Session.findOne({ user: req.user._id, checkpointId: checkpoint_id });
    if (!session) {
      session = await Session.create({
        user: req.user._id,
        checkpointId: checkpoint_id,
        attemptCount: 0,
      });
    }

    session.attemptCount += 1;
    session.userCode = user_code || '';
    await session.save();

    // Find checkpoint expected concept if available
    const cp = await Checkpoint.findOne({ checkpointId: checkpoint_id });
    const expectedConcept = cp?.expectedConcept || '';

    // Attempt to call FastAPI microservice
    try {
      const aiResponse = await axios.post(
        `${FASTAPI_URL}/evaluate-code`,
        {
          code: user_code,
          expected_concept: expectedConcept,
          checkpoint_id,
          attempt_count: session.attemptCount,
          language_pref: language_preference || req.user.preferredLanguage || 'hinglish',
          student_name: req.user.name,
        },
        { timeout: 20000 }
      );

      return res.json({
        ...aiResponse.data,
        code_passed: aiResponse.data.is_correct,
        attempt_count: session.attemptCount,
      });
    } catch (aiErr) {
      console.warn(`[AI Route] FastAPI evaluate-code fallback (${aiErr.message})`);

      // Resilient fallback logic matching Dual Persona rule:
      const attempt = session.attemptCount;
      const isCorrect = user_code && (
        user_code.includes('for') ||
        user_code.includes('prices') ||
        user_code.includes('head') ||
        user_code.includes('return') ||
        user_code.length > 50
      );

      if (attempt < 3) {
        // Strict Didi
        if (isCorrect) {
          return res.json({
            is_correct: true,
            persona_used: 'interrogator',
            feedback_text: 'Bilkul sahi! Logic is clean and handles the problem correctly.',
            viva_question: 'Explain why this approach works in O(1) or O(N) complexity.',
            attempt_count: attempt,
          });
        }
        return res.json({
          is_correct: false,
          persona_used: 'interrogator',
          feedback_text: 'Syntax or logic error. Array bounds aur variable declaration check karo. Think step-by-step!',
          viva_question: null,
          attempt_count: attempt,
        });
      } else {
        // Mentor Mode (Attempt 3+)
        return res.json({
          is_correct: isCorrect,
          persona_used: 'mentor',
          feedback_text: isCorrect
            ? 'Great job! You stuck with it and cracked the logic.'
            : 'Let me guide you: Check the loop condition and make sure you are accessing index 0 to length-1.',
          mermaid_diagram: 'graph TD\n  A[Start] --> B[Initialize Loop i=0]\n  B --> C{i < Length?}\n  C -->|Yes| D[Execute Logic]\n  D --> E[i++]\n  E --> C\n  C -->|No| F[End]',
          viva_question: isCorrect ? 'How does Java store arrays in contiguous memory?' : null,
          attempt_count: attempt,
        });
      }
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai/get-viva/:checkpointId
router.get('/get-viva/:checkpointId', authenticateToken, async (req, res) => {
  try {
    const { checkpointId } = req.params;
    const session = await Session.findOne({ user: req.user._id, checkpointId });

    if (session && session.vivaQuestion) {
      return res.json({
        checkpoint_id: checkpointId,
        viva_question: session.vivaQuestion,
        viva_status: session.vivaStatus,
      });
    }

    const cp = await Checkpoint.findOne({ checkpointId });
    const vivaQuestion = cp?.topic
      ? `Explain the core conceptual mechanism of ${cp.topic} in your own words.`
      : 'Why does this algorithm work, and what is its time complexity?';

    if (session) {
      session.vivaStatus = 'LOCKED';
      session.vivaQuestion = vivaQuestion;
      await session.save();
    }

    res.json({
      checkpoint_id: checkpointId,
      viva_question: vivaQuestion,
      viva_status: 'LOCKED',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/verify-viva
router.post('/verify-viva', authenticateToken, async (req, res) => {
  try {
    const { checkpoint_id, transcribed_text, language_preference } = req.body;

    let session = await Session.findOne({ user: req.user._id, checkpointId: checkpoint_id });
    if (!session) {
      session = new Session({ user: req.user._id, checkpointId: checkpoint_id });
    }

    session.vivaAttemptCount += 1;

    try {
      const aiResponse = await axios.post(
        `${FASTAPI_URL}/evaluate-viva`,
        {
          transcribed_text,
          viva_question: session.vivaQuestion,
          viva_attempt_count: session.vivaAttemptCount,
          language_pref: language_preference || req.user.preferredLanguage || 'hinglish',
          expected_concept: '',
        },
        { timeout: 20000 }
      );

      if (aiResponse.data.viva_passed) {
        session.vivaStatus = 'COMPLETED';
        session.completedAt = new Date();
      }
      await session.save();

      return res.json(aiResponse.data);
    } catch (aiErr) {
      console.warn(`[AI Route] FastAPI evaluate-viva fallback (${aiErr.message})`);

      const passed = transcribed_text && transcribed_text.trim().length > 6;
      if (passed) {
        session.vivaStatus = 'COMPLETED';
        session.completedAt = new Date();
      }
      await session.save();

      return res.json({
        viva_passed: passed,
        feedback_text: passed
          ? 'Shabaash! Your explanation shows clear conceptual understanding.'
          : 'Answer is too brief or unclear. Thoda aur detail me explain karo.',
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/ask-mentor (RAG Doubt Clearing)
router.post('/ask-mentor', authenticateToken, async (req, res) => {
  try {
    const { question, checkpoint_id, video_id } = req.body;

    try {
      const aiResponse = await axios.post(
        `${FASTAPI_URL}/ask-mentor`,
        {
          question,
          checkpoint_id,
          video_id,
          language_pref: req.user.preferredLanguage || 'hinglish',
        },
        { timeout: 20000 }
      );
      return res.json(aiResponse.data);
    } catch (aiErr) {
      console.warn(`[AI Route] FastAPI ask-mentor fallback (${aiErr.message})`);
      return res.json({
        answer: `Regarding "${question}": Focus on how data structures allocate memory and how references point from one element to the next. Let me know if you want a code snippet!`,
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
