import mongoose from 'mongoose';

const timetableSlotSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dayOfWeek: { type: Number, min: 0, max: 6, required: true }, // 0=Sunday, 1=Monday, ..., 6=Saturday
    startTime: { type: String, required: true }, // "09:00" (24h HH:mm)
    endTime: { type: String, required: true },   // "10:30" (24h HH:mm)
    slotType: {
      type: String,
      enum: ['study', 'blocked', 'break', 'free'],
      default: 'study',
    },
    label: { type: String, default: 'Study Slot' },
  },
  { timestamps: true }
);

timetableSlotSchema.index({ user: 1, dayOfWeek: 1, startTime: 1 });

export const TimetableSlot = mongoose.model('TimetableSlot', timetableSlotSchema);
