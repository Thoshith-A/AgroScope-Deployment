import express from 'express';
import Farmer from '../models/Farmer.js';
import Startup from '../models/Startup.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get current user's profile
router.get('/', requireAuth, async (req, res) => {
  try {
    const { userId, role } = req.user;
    let user = role === 'farmer' ? await Farmer.findById(userId) : await Startup.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const u = user.toJSON();
    return res.json({
      id: u._id,
      email: u.email,
      role: role,
      name: u.name || null,
      company_name: u.company_name || null,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// Update current user's profile
router.put('/', requireAuth, async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { email, name, company_name } = req.body;

    let user = role === 'farmer' ? await Farmer.findById(userId) : await Startup.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (email) user.email = String(email).toLowerCase();
    if (role === 'farmer' && typeof name === 'string') user.name = name;
    if (role === 'startup' && typeof company_name === 'string') user.company_name = company_name;

    await user.save();
    const u = user.toJSON();

    return res.json({
      message: 'Profile updated',
      user: {
        id: u._id,
        email: u.email,
        role: role,
        name: u.name || null,
        company_name: u.company_name || null,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    return res.status(500).json({ message: 'Failed to update profile' });
  }
});

export default router;
