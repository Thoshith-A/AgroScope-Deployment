import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as paymentsStore from '../data/paymentsStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// In-memory cache; persisted to server/data/payments.json so data survives backend restarts
const payments = [];

export function getPayments() {
  return payments;
}

/** Load payments from file store into memory (call once at server startup). */
export async function initPaymentsFromStore() {
  const list = await paymentsStore.getAll();
  payments.length = 0;
  payments.push(...list);
  return list;
}

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `screenshot_${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

router.post('/submit', (req, res, next) => {
  upload.single('screenshot')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large (max 10MB)' });
      }
      if (err.message === 'Only image files allowed') {
        return res.status(400).json({ error: 'Only image files (JPEG, PNG, WEBP) allowed' });
      }
      console.error('Multer error:', err);
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const {
      provisionId,
      wasteType,
      quantityTons,
      pricePerKg,
      farmerName,
      farmerUpiId,
      buyerName,
      buyerId,
      totalAmount,
      upiRef,
      note,
    } = req.body || {};

    if (!req.file) {
      return res.status(400).json({ error: 'Screenshot is required' });
    }

    const payment = {
      id: `PAY_${uuidv4().replace(/-/g, '').toUpperCase().substr(0, 12)}`,
      provisionId: provisionId || '',
      wasteType: wasteType || 'N/A',
      quantityTons: Number(quantityTons) || 0,
      pricePerKg: Number(pricePerKg) || 0,
      farmerName: farmerName || 'Farmer',
      farmerUpiId: farmerUpiId || '',
      buyerName: buyerName || 'Buyer',
      buyerId: buyerId || 'anon',
      totalAmount: Number(totalAmount) || 0,
      upiRef: upiRef || '',
      note: note || '',
      screenshotFilename: req.file.filename,
      screenshotUrl: `/uploads/${req.file.filename}`,
      status: 'pending_verification',
      submittedAt: new Date().toISOString(),
      verifiedAt: null,
      verifiedBy: null,
    };

    payments.push(payment);
    await paymentsStore.add(payment);
    console.log(`Payment submitted: ${payment.id}`);

    res.json({
      success: true,
      paymentId: payment.id,
      message: 'Payment screenshot submitted!',
    });
  } catch (err) {
    console.error('Payment submit error:', err);
    res.status(500).json({ error: 'Failed to submit payment' });
  }
});

router.get('/', (_req, res) => {
  const sorted = [...payments].sort(
    (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
  );
  res.json(sorted);
});

router.get('/:id', (req, res) => {
  const p = payments.find((x) => x.id === req.params.id);
  if (p) res.json(p);
  else res.status(404).json({ error: 'Payment not found' });
});

router.patch('/:id/verify', (req, res) => {
  const p = payments.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  p.status = 'verified';
  p.verifiedAt = new Date().toISOString();
  p.verifiedBy = req.body.verifiedBy || 'admin';
  res.json({ success: true, payment: p });
});

router.patch('/:id/reject', (req, res) => {
  const p = payments.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  p.status = 'rejected';
  p.rejectionReason = req.body.reason || 'Payment not confirmed';
  res.json({ success: true, payment: p });
});

export default router;
