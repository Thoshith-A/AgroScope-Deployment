import express from 'express';
import jwt from 'jsonwebtoken';
import Farmer from '../models/Farmer.js';
import Startup from '../models/Startup.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// NOTE: Demo-mode auth that does NOT use MongoDB.
// For real use, restore the original implementation that uses Farmer/Startup models.

// Hardcoded demo users — checked first on login (exact email + password match)
const DEMO_USERS = [
  {
    email: 'f1@gmail.com',
    password: 'farmer',
    role: 'farmer',
    name: 'Demo Farmer',
    _id: 'demo-farmer-001',
    rating: 4.5,
    location: 'Chennai, Tamil Nadu',
    company: '',
  },
  {
    email: 'east@argo',
    password: 'east@argo',
    role: 'startup',
    name: 'East Argo Startup',
    _id: 'demo-startup-001',
    rating: 4.2,
    location: 'Bengaluru, Karnataka',
    company: 'East Argo Technologies',
  },
  {
    email: 'admin@gmail.com',
    password: 'admin@gmail.com',
    role: 'admin',
    name: 'Admin',
    _id: 'demo-admin-001',
  },
];

// Fallback: email → role for other logins (no DB)
const DEMO_CREDENTIALS = {
  'f1@gmail.com': { role: 'farmer', password: 'farmer' },
  'f1@gmail': { role: 'farmer', password: 'farmer' },
  'east@argo': { role: 'startup', password: 'east@argo' },
  'east@agro': { role: 'startup', password: 'east@argo' },
  'admin@gmail.com': { role: 'admin', password: 'admin@gmail.com' },
};

function getRoleForEmail(email) {
  const key = String(email || '').trim().toLowerCase();
  if (DEMO_CREDENTIALS[key]) return DEMO_CREDENTIALS[key].role;
  return key.includes('startup') ? 'startup' : 'farmer';
}

// Register endpoint (demo)
router.post('/register', (req, res) => {
  const { email, password, role: roleBody, name, company_name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  const key = String(email).trim().toLowerCase();
  const role = DEMO_CREDENTIALS[key]?.role ?? (roleBody && ['farmer', 'startup'].includes(roleBody) ? roleBody : null);
  if (!role) {
    return res.status(400).json({ message: 'Role must be either "farmer" or "startup"' });
  }

  const token = jwt.sign(
    { userId: email, email, role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    token,
    user: {
      id: email,
      email,
      role,
      name: role === 'farmer' ? (name || 'Demo Farmer') : null,
      company_name: role === 'startup' ? (company_name || 'Demo Startup') : null,
    },
    message: role === 'farmer'
      ? 'Farmer account created successfully (demo mode)'
      : 'Startup account created successfully (demo mode)',
  });
});

// Login endpoint (demo)
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const emailNorm = String(email).trim().toLowerCase();
  const passwordStr = String(password);

  // Check hardcoded demo credentials FIRST
  const demoUser = DEMO_USERS.find(
    (u) => u.email.toLowerCase() === emailNorm && u.password === passwordStr
  );

  if (demoUser) {
    const token = jwt.sign(
      { userId: demoUser.email, email: demoUser.email, role: demoUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.json({
      token,
      user: {
        id: demoUser.email,
        email: demoUser.email,
        role: demoUser.role,
        name: demoUser.role === 'farmer' ? demoUser.name : demoUser.role === 'admin' ? demoUser.name : null,
        company_name: demoUser.role === 'startup' ? demoUser.company : null,
      },
      message: 'Login successful (demo mode)',
    });
  }

  // Fallback: other emails (legacy demo behaviour)
  const creds = DEMO_CREDENTIALS[emailNorm];
  if (creds && passwordStr !== creds.password) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const role = creds ? creds.role : getRoleForEmail(email);

  const token = jwt.sign(
    { userId: email, email, role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: email,
      email,
      role,
      name: role === 'farmer' ? 'Demo Farmer User' : null,
      company_name: role === 'startup' ? 'Demo Startup User' : null,
    },
    message: 'Login successful (demo mode)',
  });
});

export default router;

