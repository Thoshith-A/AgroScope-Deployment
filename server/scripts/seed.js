/**
 * Seed script: Market Price default data (offline, database only).
 * Run: npm run seed (from server directory). Requires MONGODB_URI.
 * No duplicate insertion (upsert by wasteType + state).
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import MarketPrice from '../models/MarketPrice.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MARKET_PRICES = [
  { wasteType: 'Paddy Husk', state: 'Tamil Nadu', avgPricePerKg: 5.5, source: 'Admin - Jan 2026' },
  { wasteType: 'Wheat Straw', state: 'Tamil Nadu', avgPricePerKg: 1.8, source: 'Admin - Jan 2026' },
  { wasteType: 'Corn Stalks', state: 'Tamil Nadu', avgPricePerKg: 0.8, source: 'Admin - Jan 2026' },
  { wasteType: 'Sugarcane Bagasse', state: 'Tamil Nadu', avgPricePerKg: 5.5, source: 'Admin - Jan 2026' },
  { wasteType: 'Coconut Shells', state: 'Tamil Nadu', avgPricePerKg: 30.0, source: 'Admin - Jan 2026' },
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('MONGODB_URI not set. Skipping seed.');
    process.exit(0);
  }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  for (const row of MARKET_PRICES) {
    await MarketPrice.findOneAndUpdate(
      { wasteType: row.wasteType, state: row.state },
      { $set: { ...row, lastUpdated: new Date() } },
      { upsert: true, runValidators: true }
    );
  }
  console.log('MarketPrice seed data inserted/updated. POST /api/market-price to add/update.');

  await mongoose.disconnect();
  console.log('Done.');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
