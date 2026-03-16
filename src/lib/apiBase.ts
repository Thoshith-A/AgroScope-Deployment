/**
 * Base URL for API and auth requests. Empty in dev (Vite proxy). Set VITE_API_URL in production (e.g. Vercel) to your backend URL.
 */
export function getApiBase(): string {
  const url = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? '';
  return url.replace(/\/$/, '');
}
