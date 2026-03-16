/**
 * Seed synthetic price dataset (50–100 records) for demo/AI.
 * market_status derived from price_per_kg: < 50 Below, 60–80 Current, > 100 Above.
 */
import PriceDataset from '../models/PriceDataset.js';
import { DEMO_MODE } from '../config/demoMode.js';

function getMarketStatus(pricePerKg) {
  const p = Number(pricePerKg);
  if (p < 50) return 'Below Market Price';
  if (p > 100) return 'Above Market Price';
  return 'Current Market Price'; // 50 to 100
}

const WASTE_TYPES = ['Paddy Husk', 'Wheat Straw', 'Corn Stalks', 'Sugarcane Bagasse', 'Coconut Shells'];
const LOCATIONS = ['Tamil Nadu', 'Punjab', 'Maharashtra', 'Uttar Pradesh', 'Kerala', 'Karnataka', 'Gujarat'];

export async function seedPriceDatasetIfEmpty() {
  if (!DEMO_MODE) return;
  const existing = await PriceDataset.countDocuments();
  if (existing >= 50) return;

  const now = new Date();
  const docs = [];
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  for (let i = 0; i < 75; i++) {
    const waste_type = WASTE_TYPES[i % WASTE_TYPES.length];
    const price_per_kg = Math.round((45 + (i * 0.87) % 66) * 100) / 100;
    const market_status = getMarketStatus(price_per_kg);
    const quantity_tons = Math.round((3 + (i % 6) + (i % 10) / 10) * 100) / 100;
    const moisture_percent = 8 + (i % 15);
    const location = LOCATIONS[i % LOCATIONS.length];
    const date = new Date(now.getTime() - (i % 90) * MS_PER_DAY);

    docs.push({
      waste_type,
      price_per_kg,
      market_status,
      quantity_tons,
      moisture_percent,
      location,
      date,
    });
  }

  await PriceDataset.insertMany(docs);
  console.log('✅ Price dataset seeded with', docs.length, 'records (market_status by rules)');
}
