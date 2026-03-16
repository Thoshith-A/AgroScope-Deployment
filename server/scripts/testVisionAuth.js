/**
 * Test Google Vision auth and API access.
 * Run from server/: node scripts/testVisionAuth.js
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_VISION_API_KEY in .env
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { GoogleAuth } from 'google-auth-library';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Minimal 1x1 JPEG base64
const MINIMAL_JPEG_B64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AdkA//2Q==';

async function main() {
  console.log('Testing Google Vision API access...\n');

  const apiKey = (process.env.GOOGLE_VISION_API_KEY || '').trim();
  let authType;
  let headers = { 'Content-Type': 'application/json' };
  let url = 'https://vision.googleapis.com/v1/images:annotate';

  if (apiKey) {
    authType = 'API key';
    url += `?key=${apiKey}`;
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    authType = 'Service account (' + process.env.GOOGLE_APPLICATION_CREDENTIALS + ')';
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    const client = await auth.getClient();
    const creds = await client.authorize();
    if (!creds?.access_token) {
      console.error('FAIL: Could not get access token from service account.');
      process.exit(1);
    }
    headers.Authorization = `Bearer ${creds.access_token}`;
  } else {
    console.error('FAIL: Set GOOGLE_VISION_API_KEY or GOOGLE_APPLICATION_CREDENTIALS in server/.env');
    process.exit(1);
  }

  console.log('Auth:', authType);

  const body = JSON.stringify({
    requests: [{
      image: { content: MINIMAL_JPEG_B64 },
      features: [{ type: 'TEXT_DETECTION', maxResults: 5 }],
    }],
  });

  const res = await fetch(url, { method: 'POST', headers, body });
  const text = await res.text();

  if (res.ok) {
    console.log('OK: Vision API responded successfully.');
    const data = JSON.parse(text);
    console.log('Response:', JSON.stringify(data.responses?.[0] || data, null, 2).slice(0, 500) + '...');
    process.exit(0);
  }

  console.error('FAIL: Vision API returned', res.status);
  let parsed;
  try {
    parsed = JSON.parse(text);
    const msg = parsed?.error?.message || text;
    if (msg.includes('billing') || (parsed?.error?.details && JSON.stringify(parsed.error.details).includes('BILLING'))) {
      console.error('\n→ Enable billing for your Google Cloud project:');
      console.error('  https://console.cloud.google.com/billing/enable');
      console.error('  (Free tier: 1000 Vision requests/month still requires billing to be linked.)');
    } else {
      console.error(msg);
    }
  } catch {
    console.error(text);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
