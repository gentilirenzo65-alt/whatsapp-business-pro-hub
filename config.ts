// Centralized configuration for API URLs
// Uses environment variables with fallback to localhost

// @ts-ignore - Vite environment variables
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const API_URL = env.VITE_API_URL || '/api';
export const SOCKET_URL = env.VITE_SOCKET_URL || '';
export const BACKEND_URL = env.VITE_BACKEND_URL || '';
