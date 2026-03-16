import express from 'express';

const router = express.Router();

/**
 * Canonical crop-waste types used across AgroScope input flows.
 * Keeping this static prevents production drift caused by unrelated crop category datasets
 * (e.g. Cereal/Fiber/Fruit from crops_master_dataset.csv).
 */
const CROP_WASTE_TYPES = [
  'Paddy Husk',
  'Wheat Straw',
  'Corn Stalks',
  'Sugarcane Bagasse',
  'Coconut Shells',
];

router.get('/types', (_req, res) => {
  res.json({
    categories: CROP_WASTE_TYPES,
    wasteTypes: CROP_WASTE_TYPES,
    source: 'static_waste_types',
  });
});

export default router;


