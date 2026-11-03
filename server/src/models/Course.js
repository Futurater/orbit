import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    sourceType: { type: String, enum: ['video', 'playlist'], required: true },
    sourceUrl: { type: String, required: true },
    thumbnailUrl: { type: String, default: '' },
    videoIds: [{ type: String }],
    status: {
      type: String,
      enum: ['generating', 'ready', 'in_progress', 'completed'],
      default: 'generating',
    },
    totalCheckpoints: { type: Number, default: 0 },
    completedCheckpoints: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Course = mongoose.model('Course', courseSchema);
