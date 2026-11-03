import express from 'express';
import axios from 'axios';
import { Course } from '../models/Course.js';
import { Checkpoint } from '../models/Checkpoint.js';
import { Session } from '../models/Session.js';
import { authenticateToken } from '../middleware/auth.js';
import { parseYouTubeUrl, getYouTubeMetadata, extractPlaylistVideos } from '../utils/youtubeParser.js';

const router = express.Router();
const FASTAPI_URL = process.env.FASTAPI_AI_URL || 'http://127.0.0.1:8000';

// Default starter checkpoints fallback if AI service is offline
function generateFallbackCheckpoints(courseId, videoId, videoTitle) {
  return [
    {
      course: courseId,
      videoId,
      videoTitle,
      checkpointId: `cp_01_${videoId.slice(0, 5)}_basics`,
      sequenceOrder: 1,
      timestampSeconds: 180, // 3 mins in
      topic: 'Core Syntax & Logic Setup',
      contextSummary: `The instructor has just covered the core concept of ${videoTitle}. Write the initial implementation below.`,
      starterCode: `public class Solution {\n    public static void main(String[] args) {\n        // TODO: Implement the initial logic demonstrated in the video\n        System.out.println("Processing...");\n    }\n}`,
      expectedConcept: 'Proper syntax declaration and initialization as taught in the first part of the lecture.',
      requiresViva: true,
    },
    {
      course: courseId,
      videoId,
      videoTitle,
      checkpointId: `cp_02_${videoId.slice(0, 5)}_manipulation`,
      sequenceOrder: 2,
      timestampSeconds: 420, // 7 mins in
      topic: 'Data Manipulation & Control Flow',
      contextSummary: 'Apply the algorithm to process input elements using the optimal loop condition.',
      starterCode: `public class Solution {\n    public static void solve(int[] input) {\n        // TODO: Loop through input and apply condition\n        \n    }\n}`,
      expectedConcept: 'Boundary check and proper iterative control flow.',
      requiresViva: true,
    },
    {
      course: courseId,
      videoId,
      videoTitle,
      checkpointId: `cp_03_${videoId.slice(0, 5)}_edge_cases`,
      sequenceOrder: 3,
      timestampSeconds: 780, // 13 mins in
      topic: 'Edge Cases & Final Solution',
      contextSummary: 'Final Boss Battle: Handle empty or boundary edge cases without throwing exceptions.',
      starterCode: `public class Solution {\n    public static boolean validate(int[] data, int target) {\n        // TODO: Return true if target exists and handles null/empty cases\n        return false;\n    }\n}`,
      expectedConcept: 'Edge case validation and return logic.',
      requiresViva: true,
    },
  ];
}

// Helper: Call FastAPI to generate checkpoints from video transcript
async function requestCheckpointsFromAI(videoId, videoTitle) {
  try {
    const res = await axios.post(
      `${FASTAPI_URL}/generate-checkpoints`,
      { video_id: videoId, video_title: videoTitle },
      { timeout: 25000 }
    );
    if (res.data && Array.isArray(res.data.checkpoints) && res.data.checkpoints.length > 0) {
      return res.data.checkpoints;
    }
  } catch (err) {
    console.warn(`[AI Service] Could not generate checkpoints via FastAPI (${err.message}). Using smart fallback.`);
  }
  return null;
}

// GET /api/courses — List all user courses
router.get('/', authenticateToken, async (req, res) => {
  try {
    let courses = await Course.find({ user: req.user._id }).sort({ createdAt: -1 });

    // Seed default starter course if none exist
    if (courses.length === 0) {
      const defaultCourse = await Course.create({
        user: req.user._id,
        title: 'Master Java DSA — Arrays & Structures',
        description: 'Complete hands-on Java Data Structures & Algorithms active learning course.',
        sourceType: 'video',
        sourceUrl: 'https://www.youtube.com/watch?v=NTHVTY6w2Co',
        thumbnailUrl: 'https://img.youtube.com/vi/NTHVTY6w2Co/hqdefault.jpg',
        videoIds: ['NTHVTY6w2Co'],
        status: 'ready',
        totalCheckpoints: 3,
        completedCheckpoints: 0,
      });

      const starterCheckpoints = [
        {
          course: defaultCourse._id,
          videoId: 'NTHVTY6w2Co',
          videoTitle: 'Arrays Introduction | Lecture 10',
          checkpointId: 'cp_01_array_iteration',
          sequenceOrder: 1,
          timestampSeconds: 594,
          topic: 'Array Declaration & Loops',
          contextSummary: "The instructor has finished demonstrating how to declare an array and use a 'for' loop. Declare an integer array 'prices' with 3 elements {250, 400, 150}, and write a 'for' loop to print them.",
          starterCode: "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // TODO: Declare integer array 'prices' with values {250, 400, 150}\n        // TODO: Write a for-loop to print each element\n        \n    }\n}",
          expectedConcept: "Declare array correctly and write standard for(int i=0; i<3; i++) to print prices[i].",
          requiresViva: true,
        },
        {
          course: defaultCourse._id,
          videoId: 'NTHVTY6w2Co',
          videoTitle: 'Arrays Introduction | Lecture 10',
          checkpointId: 'cp_02_array_input',
          sequenceOrder: 2,
          timestampSeconds: 1206,
          topic: 'Array Input using Scanner',
          contextSummary: "Apply dynamic input: Use the Scanner object and a loop to take 3 integer inputs into studentScores array.",
          starterCode: "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int[] studentScores = new int[3];\n        // TODO: Loop 3 times and store sc.nextInt() into studentScores[i]\n        \n    }\n}",
          expectedConcept: "Use studentScores[i] = sc.nextInt() inside loop.",
          requiresViva: true,
        },
        {
          course: defaultCourse._id,
          videoId: 'NTHVTY6w2Co',
          videoTitle: 'Arrays Introduction | Lecture 10',
          checkpointId: 'cp_03_linear_search',
          sequenceOrder: 3,
          timestampSeconds: 1502,
          topic: 'Linear Search Logic',
          contextSummary: "Loop through employeeIDs array. If current element matches targetID (505), print 'ID Found at index: ' followed by the index.",
          starterCode: "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        int[] employeeIDs = {104, 218, 505, 909};\n        int targetID = 505;\n        for (int i = 0; i < employeeIDs.length; i++) {\n            // TODO: Write if-condition to match targetID\n            \n        }\n    }\n}",
          expectedConcept: "if (employeeIDs[i] == targetID) with print of index i.",
          requiresViva: true,
        },
      ];

      await Checkpoint.insertMany(starterCheckpoints);
      courses = [defaultCourse];
    }

    res.json({ courses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/courses — Create new course from any YouTube link or playlist
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Please provide a valid YouTube URL or playlist link.' });
    }

    const parsed = parseYouTubeUrl(url);
    if (!parsed.type || !parsed.id) {
      return res.status(400).json({ error: 'Could not recognize this URL as a valid YouTube video or playlist.' });
    }

    let videoIds = [];
    let courseTitle = '';
    let courseThumb = '';

    if (parsed.type === 'playlist') {
      videoIds = await extractPlaylistVideos(parsed.id);
      courseTitle = `Playlist Course (${videoIds.length} Lectures)`;
      courseThumb = `https://img.youtube.com/vi/${videoIds[0]}/hqdefault.jpg`;
    } else {
      videoIds = [parsed.id];
      const meta = await getYouTubeMetadata(parsed.id);
      courseTitle = meta.title;
      courseThumb = meta.thumbnailUrl;
    }

    // Create course entry
    const course = await Course.create({
      user: req.user._id,
      title: courseTitle,
      description: `Active interception course generated from ${parsed.url}`,
      sourceType: parsed.type,
      sourceUrl: parsed.url,
      thumbnailUrl: courseThumb,
      videoIds,
      status: 'ready',
    });

    const createdCheckpoints = [];

    // Generate checkpoints for each video
    for (let i = 0; i < videoIds.length; i++) {
      const vId = videoIds[i];
      const meta = await getYouTubeMetadata(vId);

      // Attempt AI generation first
      const aiCps = await requestCheckpointsFromAI(vId, meta.title);

      if (aiCps && aiCps.length > 0) {
        aiCps.forEach((cp, idx) => {
          createdCheckpoints.push({
            course: course._id,
            videoId: vId,
            videoTitle: meta.title,
            checkpointId: cp.checkpoint_id || `cp_${i + 1}_${idx + 1}`,
            sequenceOrder: i * 3 + (idx + 1),
            timestampSeconds: cp.timestamp_seconds || (idx + 1) * 300,
            topic: cp.topic || `Topic ${idx + 1}`,
            contextSummary: cp.context_summary || '',
            starterCode: cp.starter_code || '// Write solution here',
            expectedConcept: cp.expected_concept || '',
            requiresViva: true,
          });
        });
      } else {
        // Use smart fallback
        const fallback = generateFallbackCheckpoints(course._id, vId, meta.title);
        fallback.forEach((cp, idx) => {
          cp.sequenceOrder = i * 3 + (idx + 1);
          createdCheckpoints.push(cp);
        });
      }
    }

    await Checkpoint.insertMany(createdCheckpoints);

    course.totalCheckpoints = createdCheckpoints.length;
    await course.save();

    res.status(201).json({
      message: 'Course created successfully!',
      course,
      checkpoints: createdCheckpoints,
    });
  } catch (err) {
    console.error('[Course Creation Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/courses/:id — Get course details, checkpoints, and user session status
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, user: req.user._id });
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const checkpoints = await Checkpoint.find({ course: course._id }).sort({ sequenceOrder: 1 });

    // Fetch user's session completion for all checkpoints
    const checkpointIds = checkpoints.map((c) => c.checkpointId);
    const sessions = await Session.find({
      user: req.user._id,
      checkpointId: { $in: checkpointIds },
    });

    const sessionMap = {};
    sessions.forEach((s) => {
      sessionMap[s.checkpointId] = s;
    });

    const completedCount = sessions.filter((s) => s.vivaStatus === 'COMPLETED').length;
    course.completedCheckpoints = completedCount;
    await course.save();

    res.json({
      course,
      checkpoints,
      sessions: sessionMap,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/courses/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }
    await Checkpoint.deleteMany({ course: course._id });
    res.json({ message: 'Course deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
