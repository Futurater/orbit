import mongoose from 'mongoose';

const rescheduleRecordSchema = new mongoose.Schema(
  {
    fromDate: { type: String },
    fromTime: { type: String },
    toDate: { type: String },
    toTime: { type: String },
    rescheduledAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    durationMinutes: { type: Number, default: 45 },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'rescheduled'],
      default: 'pending',
    },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
    checkpoint: { type: mongoose.Schema.Types.ObjectId, ref: 'Checkpoint', default: null },
    scheduledDate: { type: String, required: true }, // "YYYY-MM-DD"
    scheduledStartTime: { type: String, default: '' }, // "14:00"
    scheduledEndTime: { type: String, default: '' },   // "14:45"
    originalDate: { type: String },                    // initial date for tracking
    rescheduleCount: { type: Number, default: 0 },
    rescheduleHistory: [rescheduleRecordSchema],
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

taskSchema.index({ user: 1, scheduledDate: 1 });

export const Task = mongoose.model('Task', taskSchema);
