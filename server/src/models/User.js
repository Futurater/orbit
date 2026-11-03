import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    preferredLanguage: { type: String, default: 'hinglish' },
    wakeTime: { type: String, default: '07:00' },
    sleepTime: { type: String, default: '23:00' },
    dailyStudyHours: { type: Number, default: 2 },
    preferredStudyPeriod: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night'],
      default: 'evening',
    },
    onboardingCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model('User', userSchema);
