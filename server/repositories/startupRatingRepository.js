import StartupRating from '../models/StartupRating.js';
import mongoose from 'mongoose';

export async function findById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return StartupRating.findById(id).lean();
}

export async function save(doc) {
  const created = await StartupRating.create(doc);
  return created.toObject ? created.toObject() : created;
}

export async function updatePerformance(id, data) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const updated = await StartupRating.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  ).lean();
  return updated;
}
