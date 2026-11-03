/**
 * Smart Slot Finder & Dynamic Task Reschedule Engine.
 * Analyzes weekly schedule, commitments, user habits, and existing tasks
 * to surface the best available empty slots for incomplete tasks.
 */

export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(mins) {
  const normalized = Math.max(0, Math.min(1439, mins));
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

function getPeriod(timeStr) {
  const mins = timeToMinutes(timeStr);
  if (mins >= 360 && mins < 720) return 'morning';    // 06:00 - 12:00
  if (mins >= 720 && mins < 1020) return 'afternoon'; // 12:00 - 17:00
  if (mins >= 1020 && mins < 1260) return 'evening';  // 17:00 - 21:00
  return 'night';                                     // 21:00 - 06:00
}

/**
 * Finds and ranks available empty slots across the upcoming week.
 *
 * @param {Object} params
 * @param {Object} params.user - User document with wakeTime, sleepTime, preferredStudyPeriod
 * @param {Array} params.timetableSlots - User's recurring TimetableSlot records
 * @param {Array} params.existingTasks - Tasks already scheduled for the upcoming days
 * @param {number} params.taskDurationMinutes - Duration of the task needing a slot
 * @param {number} params.daysAhead - How many days to look into the future (default 7)
 */
export function findAvailableSlots({
  user,
  timetableSlots = [],
  existingTasks = [],
  taskDurationMinutes = 45,
  daysAhead = 7,
}) {
  const duration = Number(taskDurationMinutes) || 45;
  const userPrefPeriod = user?.preferredStudyPeriod || 'evening';
  const wakeMins = timeToMinutes(user?.wakeTime || '07:00');
  const sleepMins = timeToMinutes(user?.sleepTime || '23:00');

  const today = new Date();
  const availableSlots = [];

  for (let offset = 1; offset <= daysAhead; offset++) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + offset);

    const dateStr = targetDate.toISOString().split('T')[0]; // "YYYY-MM-DD"
    const dayOfWeek = targetDate.getDay(); // 0=Sun ... 6=Sat

    const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
    const dayLabel = offset === 1 ? 'Tomorrow' : `${dayName} (${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;

    // Filter recurring timetable slots for this day of week
    const daySlots = timetableSlots.filter((s) => s.dayOfWeek === dayOfWeek);

    // Filter existing scheduled tasks for this date
    const tasksOnDay = existingTasks.filter((t) => t.scheduledDate === dateStr && t.status !== 'completed');

    // Create a timeline of busy blocks
    const busyIntervals = [];

    // Add blocked timetable slots (e.g. college classes, work, sleep)
    for (const slot of daySlots) {
      if (slot.slotType === 'blocked') {
        busyIntervals.push({
          start: timeToMinutes(slot.startTime),
          end: timeToMinutes(slot.endTime),
          label: slot.label || 'Blocked Commitment',
        });
      }
    }

    // Add existing scheduled tasks
    for (const task of tasksOnDay) {
      if (task.scheduledStartTime && task.scheduledEndTime) {
        busyIntervals.push({
          start: timeToMinutes(task.scheduledStartTime),
          end: timeToMinutes(task.scheduledEndTime),
          label: task.title,
        });
      }
    }

    // Sort busy intervals
    busyIntervals.sort((a, b) => a.start - b.start);

    // If user has specific 'study' or 'free' slots, check those first!
    const candidateStudySlots = daySlots.filter((s) => s.slotType === 'study' || s.slotType === 'free');

    if (candidateStudySlots.length > 0) {
      for (const cSlot of candidateStudySlots) {
        const slotStart = timeToMinutes(cSlot.startTime);
        const slotEnd = timeToMinutes(cSlot.endTime);
        const slotSpan = slotEnd - slotStart;

        if (slotSpan >= duration) {
          // Check if overlapping with any busy interval
          const overlaps = busyIntervals.some((b) => Math.max(slotStart, b.start) < Math.min(slotEnd, b.end));

          if (!overlaps) {
            const slotTimeStr = minutesToTime(slotStart);
            const endTimeStr = minutesToTime(slotStart + duration);
            const slotPeriod = getPeriod(slotTimeStr);

            // Scoring
            let score = 50;
            if (offset === 1) score += 30; // Tomorrow boost
            else if (offset <= 3) score += 15;

            if (slotPeriod === userPrefPeriod) score += 25; // Matches user prime focus
            if (cSlot.slotType === 'study') score += 15;     // Dedicated study slot
            score -= tasksOnDay.length * 5;                 // Balance day workload

            availableSlots.push({
              date: dateStr,
              dayLabel,
              startTime: slotTimeStr,
              endTime: endTimeStr,
              startTimeFormatted: formatTime12h(slotTimeStr),
              endTimeFormatted: formatTime12h(endTimeStr),
              period: slotPeriod,
              label: cSlot.label || `${slotPeriod.toUpperCase()} Focus Slot`,
              score: Math.max(10, score),
              offsetDays: offset,
            });
          }
        }
      }
    }

    // Also scan default awake intervals (between wakeTime and sleepTime)
    let cursor = Math.max(wakeMins, 480); // At least 8:00 AM
    const dayEnd = Math.min(sleepMins, 1320); // By 10:00 PM

    while (cursor + duration <= dayEnd) {
      const candidateStart = cursor;
      const candidateEnd = cursor + duration;

      const hasConflict = busyIntervals.some((b) => Math.max(candidateStart, b.start) < Math.min(candidateEnd, b.end));

      // Check if we didn't already capture this slot via candidateStudySlots
      const alreadyCaptured = availableSlots.some(
        (s) => s.date === dateStr && Math.abs(timeToMinutes(s.startTime) - candidateStart) < 15
      );

      if (!hasConflict && !alreadyCaptured) {
        const slotTimeStr = minutesToTime(candidateStart);
        const endTimeStr = minutesToTime(candidateEnd);
        const slotPeriod = getPeriod(slotTimeStr);

        let score = 40;
        if (offset === 1) score += 30;
        else if (offset <= 3) score += 15;
        if (slotPeriod === userPrefPeriod) score += 25;
        score -= tasksOnDay.length * 5;

        availableSlots.push({
          date: dateStr,
          dayLabel,
          startTime: slotTimeStr,
          endTime: endTimeStr,
          startTimeFormatted: formatTime12h(slotTimeStr),
          endTimeFormatted: formatTime12h(endTimeStr),
          period: slotPeriod,
          label: `${dayLabel} — ${formatTime12h(slotTimeStr)}`,
          score: Math.max(10, score),
          offsetDays: offset,
        });
      }

      // Step forward by 45 minutes or 1 hour
      cursor += 60;
    }
  }

  // Sort descending by score
  availableSlots.sort((a, b) => b.score - a.score);

  return {
    slots: availableSlots.slice(0, 10), // Top 10 slots
    recommendedSlot: availableSlots[0] || null,
  };
}
