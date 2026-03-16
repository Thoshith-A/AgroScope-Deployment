/**
 * Seed SupplyForecastDataset with 30 days per crop (ML-ready).
 * Schema: date, crop_type, predicted_supply_tons, season, region, moisture_percent, demand_index.
 */
import SupplyForecastDataset from '../models/SupplyForecastDataset.js';
import { DEMO_MODE } from '../config/demoMode.js';

const CROPS = [
  { crop_type: 'Paddy Husk', season: 'Rabi', region: 'South India', moistureBase: 12, demandBase: 0.72 },
  { crop_type: 'Wheat Straw', season: 'Rabi', region: 'North India', moistureBase: 10.5, demandBase: 0.68 },
  { crop_type: 'Corn Stalks', season: 'Zaid', region: 'Central India', moistureBase: 14, demandBase: 0.65 },
  { crop_type: 'Sugarcane Bagasse', season: 'Annual', region: 'West India', moistureBase: 45, demandBase: 0.80 },
  { crop_type: 'Coconut Shells', season: 'Perennial', region: 'South India', moistureBase: 8, demandBase: 0.60 },
];

/** Base daily supply (day 0) and trend for 30 days - from user CSV pattern. */
const SUPPLY_BASE = {
  'Paddy Husk': { start: 5.8, step: 0.05 },
  'Wheat Straw': { start: 4.2, step: 0.04 },
  'Corn Stalks': { start: 3.6, step: 0.035 },
  'Sugarcane Bagasse': { start: 8.5, step: 0.07 },
  'Coconut Shells': { start: 2.4, step: 0.025 },
};

export async function seedSupplyForecastIfEmpty() {
  if (!DEMO_MODE) return;
  const existing = await SupplyForecastDataset.countDocuments();
  if (existing >= 30) return;

  const baseDate = new Date('2026-03-01');
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const docs = [];

  for (const crop of CROPS) {
    const supplyConf = SUPPLY_BASE[crop.crop_type] || { start: 5, step: 0.05 };
    for (let d = 0; d < 30; d++) {
      const date = new Date(baseDate.getTime() + d * MS_PER_DAY);
      const predicted_supply_tons = Math.round((supplyConf.start + d * supplyConf.step + (d % 3) * 0.1) * 100) / 100;
      const moisture_percent = crop.moistureBase + (d % 5) * 0.2;
      const demand_index = Math.round((crop.demandBase + d * 0.003) * 100) / 100;
      docs.push({
        date,
        crop_type: crop.crop_type,
        predicted_supply_tons,
        season: crop.season,
        region: crop.region,
        moisture_percent: Math.min(100, moisture_percent),
        demand_index: Math.min(1, demand_index),
      });
    }
  }

  await SupplyForecastDataset.insertMany(docs);
  console.log('✅ SupplyForecastDataset seeded with', docs.length, 'records (30 days × 5 crops)');
}
