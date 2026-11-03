import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';

import authRoutes from './routes/auth.routes.js';
import courseRoutes from './routes/course.routes.js';
import checkpointRoutes from './routes/checkpoint.routes.js';
import timetableRoutes from './routes/timetable.routes.js';
import aiRoutes from './routes/ai.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'orbit-mern-server',
    time: new Date().toISOString(),
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/checkpoints', checkpointRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/ai', aiRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err.stack || err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, () => {
  console.log(`\n==============================================`);
  console.log(` 🚀 Project Orbit MERN Server Running on :${PORT}`);
  console.log(` 🔗 Health: http://localhost:${PORT}/health`);
  console.log(`==============================================\n`);
});
