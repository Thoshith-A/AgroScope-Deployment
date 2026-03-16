import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({
      error: 'Please sign in to submit verified crop waste. Uploads are linked to your farmer account.',
      message: 'Missing Authorization token',
    });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, email, role }
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Please sign in to submit verified crop waste. Uploads are linked to your farmer account.',
      message: 'Invalid or expired token',
    });
  }
}
