/**
 * Demo mode for hackathon: when true, always show realistic values.
 * No empty states; auto-generate forecast and market price when data is missing.
 * Set DEMO_MODE=false in env to disable (production).
 */
export const DEMO_MODE = process.env.DEMO_MODE !== 'false';
