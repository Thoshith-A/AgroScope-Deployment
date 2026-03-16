/**
 * Seed CropWasteHistory with realistic past 90 days data (30–90 records).
 * DEMO_MODE: ensures synthetic dataset for forecast; no empty states.
 */
import CropWasteHistory from '../models/CropWasteHistory.js';
import { DEMO_MODE } from '../config/demoMode.js';

const BASE_DATA = [
  { wasteType: 'Corn Stalks', quantities: [12, 15, 10, 18, 14, 11, 16, 13, 17, 12, 19, 15, 14], location: 'Punjab' },
  { wasteType: 'Paddy Husk', quantities: [20, 25, 22, 30, 24, 28, 26, 23, 31, 27, 21, 29, 25, 24, 22], location: 'Tamil Nadu' },
  { wasteType: 'Wheat Straw', quantities: [8, 9, 11, 7, 10, 12, 8, 9, 11, 10], location: 'Uttar Pradesh' },
  { wasteType: 'Sugarcane Bagasse', quantities: [35, 40, 38, 42, 36, 39, 41, 37, 43, 40, 38], location: 'Maharashtra' },
  { wasteType: 'Coconut Shells', quantities: [5, 6, 4, 7, 5, 6, 5, 4, 6], location: 'Kerala' },
];

export async function seedCropWasteHistoryIfEmpty() {
  const existing = await CropWasteHistory.countDocuments();
  if (existing > 0) return;

  const now = new Date();
  const docs = [];
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  for (const { wasteType, quantities, location } of BASE_DATA) {
    for (let i = 0; i < quantities.length; i++) {
      const daysAgo = 90 - Math.floor((i / Math.max(1, quantities.length - 1)) * 90);
      const dateCollected = new Date(now.getTime() - daysAgo * MS_PER_DAY);
      docs.push({
        wasteType,
        quantityTons: quantities[i],
        dateCollected,
        location: location || '',
      });
    }
  }

  if (DEMO_MODE && docs.length < 90) {
    const locations = ['Punjab', 'Tamil Nadu', 'Uttar Pradesh', 'Maharashtra', 'Kerala', 'Gujarat', 'Rajasthan'];
    for (const { wasteType, quantities, location } of BASE_DATA) {
      const baseLoc = location || locations[0];
      for (let k = 0; k < 6; k++) {
        const idx = k % quantities.length;
        const daysAgo = 80 - k * 12 + (idx % 5);
        const dateCollected = new Date(now.getTime() - Math.max(1, daysAgo) * MS_PER_DAY);
        const q = quantities[idx];
        const variation = (wasteType.length % 3) - 1;
        docs.push({
          wasteType,
          quantityTons: Math.max(0.5, q + variation * 2),
          dateCollected,
          location: locations[(docs.length + k) % locations.length] || baseLoc,
        });
      }
    }
  }

  const toInsert = docs.slice(0, 90);
  await CropWasteHistory.insertMany(toInsert);
  console.log('✅ CropWasteHistory seeded with', toInsert.length, 'training records (last 90 days)');
}
