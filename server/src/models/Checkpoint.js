import mongoose from 'mongoose';

const checkpointSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    videoId: { type: String, required: true },
    videoTitle: { type: String, default: '' },
    checkpointId: { type: String, required: true },
    sequenceOrder: { type: Number, required: true },
    timestampSeconds: { type: Number, required: true },
    topic: { type: String, required: true },
    contextSummary: { type: String, default: '' },
    starterCode: { type: String, default: '' },
    expectedConcept: { type: String, default: '' },
    requiresViva: { type: Boolean, default: true },
  },
  { timestamps: true }
);

checkpointSchema.index({ course: 1, sequenceOrder: 1 });
checkpointSchema.index({ checkpointId: 1 });

export const Checkpoint = mongoose.model('Checkpoint', checkpointSchema);
