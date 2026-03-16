// server/middleware/requireAuth.js
// Lightweight auth middleware for loyalty endpoint (decode only; allows demo in dev).

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(payload, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token && process.env.NODE_ENV !== 'production') {
    req.user = {
      id: 'startup_demo_001',
      role: 'startup',
      createdAt: '2024-01-01T00:00:00.000Z',
    };
    return next();
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: missing bearer token',
    });
  }

  const payload = decodeJwtPayload(token) || {};
  req.user = {
    id: payload.id || payload.userId || 'startup_authenticated',
    role: payload.role || 'startup',
    createdAt: payload.createdAt || payload.created_at || '2024-01-01T00:00:00.000Z',
    token,
  };

  return next();
}
