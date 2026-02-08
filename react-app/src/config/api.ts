/**
 * API Configuration
 * 
 * Base URLs and API helpers for the AI Guard DAO backend
 */

// Backend API base URL (environment variable or default to localhost)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Vite provides import.meta.env at runtime
export const API_BASE_URL: string = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * Construct full API URL
 */
export function apiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Default fetch options with credentials
 */
export const defaultFetchOptions: RequestInit = {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * Helper to make authenticated API calls
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = apiUrl(path);
  
  const response = await fetch(url, {
    ...defaultFetchOptions,
    ...options,
    headers: {
      ...defaultFetchOptions.headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}
