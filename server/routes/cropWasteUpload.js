/**
 * Crop waste verification uploads — images stored in a folder per user, usable later.
 *
 * - POST: Requires auth. Saves image to uploads/crop-waste-verification/{userId}/ (one folder per account).
 *   Metadata is stored in MongoDB when connected, or in data/crop-waste-verifications.json when not.
 *   Each file is named {timestamp}-{hash}.jpg and can be accessed later via GET /uploads/...
 *
 * - GET /api/crop-waste-upload: Returns the current user's verified uploads with imageUrl for each (associated with that account).
 *
 * BACKEND MUST VERIFY:
 * 1. captured_at must be within 120 seconds of server receive time
 * 2. image_hash must not exist in the crop_waste_uploads table (deduplication)
 * 3. lat/lng must be within a valid geographic bounding box (not 0,0 or ocean)
 * 4. device_id must match the registered device for the farmer's account (optional)
 * 5. image must be a valid JPEG/PNG (validate magic bytes, not just extension)
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import CropWasteVerification from '../models/CropWasteVerification.js';
import * as verificationStore from '../data/verificationStore.js';
import { requireAuth } from '../middleware/auth.js';

/** Use MongoDB when connected; otherwise file-based store (no DB required). */
function useMongo() {
  return mongoose.connection.readyState === 1;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_BASE = path.join(__dirname, '..', 'uploads');
const CROP_WASTE_SUBDIR = 'crop-waste-verification';

const router = express.Router();
const CAPTURED_AT_TOLERANCE_MS = 120 * 1000; // 120 seconds
const MIN_LAT = -90;
const MAX_LAT = 90;
const MIN_LNG = -180;
const MAX_LNG = 180;

function isValidLatLng(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  if (lat < MIN_LAT || lat > MAX_LAT || lng < MIN_LNG || lng > MAX_LNG) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

/** Safe folder name from userId (e.g. email or ObjectId string). */
function sanitizeUserIdForPath(userId) {
  return String(userId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'anonymous';
}

/** Decode base64 image to buffer; strip data URL prefix if present. */
function base64ToBuffer(base64) {
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

/** Resolve current user id (email or id from JWT). */
function getCurrentUserId(req) {
  return req.user?.userId ?? req.user?.id ?? req.user?.email ?? null;
}

/** GET /api/crop-waste-upload — list verified uploads for the current farmer (fresh folder per account). */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'User not identified' });
    }
    let list;
    if (useMongo()) {
      try {
        list = await CropWasteVerification.find({ userId }).sort({ captured_at: -1 }).lean();
      } catch (err) {
        console.error('[crop-waste-upload] GET Mongo error (fallback to file store):', err.message);
        list = await verificationStore.findByUserId(userId);
      }
    } else {
      list = await verificationStore.findByUserId(userId);
    }
    const baseUrl = req.protocol + '://' + req.get('host');
    const items = list.map((doc) => ({
      ...doc,
      imageUrl: doc.imagePath ? `${baseUrl}/uploads/${doc.imagePath}` : null,
    }));
    res.json({ uploads: items });
  } catch (err) {
    console.error('[crop-waste-upload] GET error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to list uploads' });
  }
});

/** POST /api/crop-waste-upload — upload verified crop waste; image saved in user-specific folder. */
router.post('/', requireAuth, async (req, res) => {
  let filePathToCleanup = null;
  try {
    const userId = getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Please sign in to upload. Verification is linked to your farmer account.' });
    }

    const { image, image_hash, latitude, longitude, captured_at, device_id } = req.body || {};
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Missing image (base64)' });
    }
    if (!image_hash || typeof image_hash !== 'string') {
      return res.status(400).json({ error: 'Missing image_hash' });
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!isValidLatLng(lat, lng)) {
      return res.status(422).json({ error: 'Verification failed. Photo may be too old or location invalid.' });
    }
    const capturedAt = Number(captured_at);
    if (!Number.isFinite(capturedAt)) {
      return res.status(400).json({ error: 'Valid captured_at required' });
    }
    const now = Date.now();
    if (Math.abs(now - capturedAt) > CAPTURED_AT_TOLERANCE_MS) {
      return res.status(422).json({ error: 'Verification failed. Photo may be too old or location invalid.' });
    }

    const hash = image_hash.trim();
    let existing = null;
    try {
      if (useMongo()) {
        try {
          existing = await CropWasteVerification.findOne({ image_hash: hash }).lean();
        } catch (dbErr) {
          console.error('[crop-waste-upload] DB findOne error (will try file store):', dbErr.message);
        }
      }
      if (!existing) {
        existing = await verificationStore.findByImageHash(hash);
      }
    } catch (fileErr) {
      console.error('[crop-waste-upload] Find by hash error:', fileErr.message);
    }
    if (existing) {
      return res.status(409).json({ error: 'This photo has already been submitted. Please take a new photo.' });
    }

    // Always save image to user-specific folder first (usable later, associated with account)
    await fs.mkdir(UPLOADS_BASE, { recursive: true });
    const userDirName = sanitizeUserIdForPath(userId);
    const userFolder = path.join(UPLOADS_BASE, CROP_WASTE_SUBDIR, userDirName);
    await fs.mkdir(userFolder, { recursive: true });

    const ext = (image.match(/^data:image\/(\w+);base64,/)?.[1] || 'jpg').replace(/jpeg/i, 'jpg');
    const filename = `${capturedAt}-${Buffer.from(image_hash).toString('base64').slice(0, 12).replace(/[/+=]/g, '')}.${ext}`;
    const filePath = path.join(userFolder, filename);
    filePathToCleanup = filePath;
    const relativePath = path.join(CROP_WASTE_SUBDIR, userDirName, filename).replace(/\\/g, '/');

    const buffer = base64ToBuffer(image);
    await fs.writeFile(filePath, buffer);

    const doc = {
      userId,
      imagePath: relativePath,
      image_hash: hash,
      latitude: lat,
      longitude: lng,
      captured_at: capturedAt,
      device_id: device_id || null,
    };

    // Persist metadata (MongoDB if connected, else file store) so image is associated with user and listable later
    let listing;
    if (useMongo()) {
      try {
        const created = await CropWasteVerification.create(doc);
        listing = created.toObject ? created.toObject() : created;
      } catch (createErr) {
        console.error('[crop-waste-upload] Mongo create error (will try file store):', createErr.message);
        if (createErr.code === 11000) {
          try {
            await fs.unlink(filePath);
          } catch {
            // ignore
          }
          return res.status(409).json({ error: 'This photo has already been submitted. Please take a new photo.' });
        }
        listing = null;
      }
    }
    if (!listing) {
      try {
        listing = await verificationStore.create(doc);
      } catch (storeErr) {
        console.error('[crop-waste-upload] File store create error:', storeErr.message);
        try {
          await fs.unlink(filePath);
        } catch {
          // ignore
        }
        return res.status(500).json({ error: 'Upload failed. Please try again.' });
      }
    }

    filePathToCleanup = null;
    const created = listing;
    const baseUrl = req.protocol + '://' + req.get('host');
    res.status(201).json({
      ...created,
      imageUrl: `${baseUrl}/uploads/${relativePath}`,
    });
  } catch (err) {
    console.error('[crop-waste-upload] Error:', err.message);
    if (filePathToCleanup) {
      try {
        await fs.unlink(filePathToCleanup);
      } catch {
        // ignore
      }
    }
    res.status(500).json({ error: 'Upload failed. Please try again.' });
  }
});

/** True if string looks like a MongoDB ObjectId (24 hex chars). */
function isMongoId(id) {
  return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
}

/** DELETE /api/crop-waste-upload/:id — delete a verified upload (own uploads only). */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Please sign in to delete.' });
    }
    const id = (req.params.id || '').trim();
    if (!id) {
      return res.status(400).json({ error: 'Missing upload id.' });
    }

    let doc = null;
    if (useMongo() && isMongoId(id)) {
      try {
        const found = await CropWasteVerification.findOne({ _id: id, userId }).lean();
        if (found) {
          doc = found;
          await CropWasteVerification.deleteOne({ _id: id, userId });
        }
      } catch (err) {
        console.error('[crop-waste-upload] DELETE Mongo error:', err.message);
      }
    }
    if (!doc) {
      const found = await verificationStore.findById(id);
      const docUserId = found?.userId;
      const userMatch = docUserId != null && (String(docUserId) === String(userId));
      if (found && userMatch) {
        doc = found;
        await verificationStore.deleteById(id);
      }
    }

    if (!doc) {
      return res.status(404).json({ error: 'Upload not found or you do not have permission to delete it.' });
    }

    const fullPath = doc.imagePath ? path.join(UPLOADS_BASE, doc.imagePath) : null;
    if (fullPath) {
      try {
        await fs.unlink(fullPath);
      } catch (unlinkErr) {
        if (unlinkErr.code !== 'ENOENT') console.error('[crop-waste-upload] DELETE unlink error:', unlinkErr.message);
      }
    }

    res.status(200).json({ success: true, deleted: id });
  } catch (err) {
    console.error('[crop-waste-upload] DELETE error:', err.message);
    res.status(500).json({ error: 'Failed to delete photo. Please try again.' });
  }
});

export default router;
