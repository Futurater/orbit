import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    checkpoint: { type: mongoose.Schema.Types.ObjectId, ref: 'Checkpoint' },
    checkpointId: { type: String, required: true },
    attemptCount: { type: Number, default: 0 },
    vivaAttemptCount: { type: Number, default: 0 },
    vivaStatus: {
      type: String,
      enum: ['NOT_STARTED', 'LOCKED', 'COMPLETED'],
      default: 'NOT_STARTED',
    },
    vivaQuestion: { type: String, default: null },
    userCode: { type: String, default: '' },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

sessionSchema.index({ user: 1, checkpointId: 1 }, { unique: true });

export const Session = mongoose.model('Session', sessionSchema);
