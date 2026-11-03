/**
 * Project Orbit v2 — MERN API Client
 * Connects directly to the Node.js Express backend with JWT session persistence.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function apiRequest(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('orbit_token');
  const headers = {};

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    let data;
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      data = { message: text || `Server responded with status ${res.status}` };
    }

    if (!res.ok) {
      throw new Error(data.error || data.message || `HTTP Error ${res.status}`);
    }

    return data;
  } catch (err) {
    console.error(`[API Error ${method} ${endpoint}]:`, err.message);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────

export async function registerUser({ name, email, password }) {
  const data = await apiRequest('/api/auth/register', 'POST', { name, email, password });
  if (data.token) {
    localStorage.setItem('orbit_token', data.token);
    localStorage.setItem('orbit_user', JSON.stringify(data.user));
  }
  return data;
}

export async function loginUser({ email, password }) {
  const data = await apiRequest('/api/auth/login', 'POST', { email, password });
  if (data.token) {
    localStorage.setItem('orbit_token', data.token);
    localStorage.setItem('orbit_user', JSON.stringify(data.user));
  }
  return data;
}

export async function getCurrentUser() {
  return await apiRequest('/api/auth/me');
}

export async function submitOnboardingQuiz(quizData) {
  const data = await apiRequest('/api/auth/onboarding-quiz', 'POST', quizData);
  if (data.user) {
    localStorage.setItem('orbit_user', JSON.stringify(data.user));
  }
  return data;
}

// ─────────────────────────────────────────────────────────────
// COURSES (DYNAMIC YOUTUBE CREATION)
// ─────────────────────────────────────────────────────────────

export async function getCourses() {
  return await apiRequest('/api/courses');
}

export async function createCourseFromYouTube(url) {
  return await apiRequest('/api/courses', 'POST', { url });
}

export async function getCourseDetails(courseId) {
  return await apiRequest(`/api/courses/${courseId}`);
}

export async function deleteCourse(courseId) {
  return await apiRequest(`/api/courses/${courseId}`, 'DELETE');
}

// ─────────────────────────────────────────────────────────────
// CHECKPOINT SESSIONS
// ─────────────────────────────────────────────────────────────

export async function getCheckpointSession(checkpointId) {
  return await apiRequest(`/api/checkpoints/${checkpointId}/session`);
}

export async function updateCheckpointSession(checkpointId, updates) {
  return await apiRequest(`/api/checkpoints/${checkpointId}/session`, 'PUT', updates);
}

// ─────────────────────────────────────────────────────────────
// TIMETABLE & PRODUCTIVITY ENGINE
// ─────────────────────────────────────────────────────────────

export async function getTimetableSlots() {
  return await apiRequest('/api/timetable');
}

export async function createTimetableSlot(slot) {
  return await apiRequest('/api/timetable/slots', 'POST', slot);
}

export async function deleteTimetableSlot(slotId) {
  return await apiRequest(`/api/timetable/slots/${slotId}`, 'DELETE');
}

export async function getTasks(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return await apiRequest(`/api/timetable/tasks${qs ? `?${qs}` : ''}`);
}

export async function createTask(taskData) {
  return await apiRequest('/api/timetable/tasks', 'POST', taskData);
}

export async function updateTask(taskId, updates) {
  return await apiRequest(`/api/timetable/tasks/${taskId}`, 'PUT', updates);
}

export async function deleteTask(taskId) {
  return await apiRequest(`/api/timetable/tasks/${taskId}`, 'DELETE');
}

export async function getTaskAvailableSlots(taskId) {
  return await apiRequest(`/api/timetable/tasks/${taskId}/available-slots`);
}

export async function rescheduleTask(taskId, rescheduleData) {
  return await apiRequest(`/api/timetable/tasks/${taskId}/reschedule`, 'POST', rescheduleData);
}

export async function getTimetableSummary() {
  return await apiRequest('/api/timetable/summary');
}

export async function rescheduleAllOverdue() {
  return await apiRequest('/api/timetable/reschedule-overdue', 'POST', {});
}

// ─────────────────────────────────────────────────────────────
// AI DUAL PERSONA & EVALUATION
// ─────────────────────────────────────────────────────────────

export async function submitStudentCode(payload) {
  return await apiRequest('/api/ai/submit-code', 'POST', payload);
}

export async function requestVivaQuestion(checkpointId) {
  return await apiRequest(`/api/ai/get-viva/${checkpointId}`);
}

export async function verifyVivaAnswer(payload) {
  return await apiRequest('/api/ai/verify-viva', 'POST', payload);
}

export async function askMentorDoubt(payload) {
  return await apiRequest('/api/ai/ask-mentor', 'POST', payload);
}
