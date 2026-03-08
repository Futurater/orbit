// src/api.js

/**
 * Project Orbit API Client
 * This automatically handles JSON stringification, CORS headers, and error handling.
 * Base URL is pointing to the Live AWS API Gateway.
 */

// Use Vite proxy on localhost (dev), real AWS API Gateway on deployed (prod)
const IS_DEV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const BASE_URL = IS_DEV
    ? "/api_proxy"
    : "https://hpozwj0jtj.execute-api.us-east-1.amazonaws.com/default";

// Helper to handle standard JSON API fetching
async function apiCall(endpoint, method = "GET", body = null) {
    const options = {
        method,
        headers: {},
    };

    if (method !== "GET") {
        options.headers["Content-Type"] = "application/json";
    }

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, options);

        // Safely parse response — Lambda sometimes returns plain text on 500 errors
        let data;
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            data = await response.json();
        } else {
            const text = await response.text();
            data = { detail: text || `Server error (${response.status})` };
        }

        if (!response.ok) {
            console.error(`API Error (${response.status}):`, data);
            throw new Error(data.detail || data.message || `Server error (${response.status})`);
        }

        return data;
    } catch (error) {
        console.error("Orbit API Exception:", error);
        throw error;
    }
}

// ==========================================================
// 1. Fetching Curriculum & Unlocking Days
// ==========================================================

export async function getStudentProgress(studentId) {
    return await apiCall(`/api/progress/${studentId}`);
}

export async function getCurriculumByDay(dayId) {
    return await apiCall(`/api/curriculum/${dayId}`);
}

// ==========================================================
// 2. Core Interaction Loop (The Architecture Diagram)
// ==========================================================

export async function getSessionState(studentId, checkpointId) {
    return await apiCall(`/api/session/${studentId}/${checkpointId}`);
}

export async function submitStudentCode(payload) {
    return await apiCall(`/submit-code`, "POST", payload);
}

export async function requestVivaQuestion(studentId, checkpointId, userCode, languagePreference = "hinglish") {
    return await apiCall(`/get-viva/${studentId}/${checkpointId}?user_code=${encodeURIComponent(userCode)}&language_preference=${languagePreference}`);
}

export async function verifyVivaAnswer(payload) {
    return await apiCall(`/verify-viva`, "POST", payload);
}

// ==========================================================
// 3. Anytime Doubt Clearing (RAG)
// ==========================================================

export async function askMentorDoubt(payload) {
    return await apiCall(`/ask-mentor`, "POST", payload);
}
