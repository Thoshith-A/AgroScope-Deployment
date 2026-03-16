/**
 * Waste density table (kg/m³) and fill factors for vision weight estimation.
 * wasteTypeId from waste taxonomy; used by vision weight estimator.
 */

export const WASTE_DENSITY_TABLE = {
  AGR_001: 120,   // Rice straw loose
  AGR_002: 150,   // Sugarcane bagasse loose
  AGR_003: 130,   // Corn cobs loose
  AGR_004: 400,   // Coffee grounds wet
  AGR_005: 140,   // Palm EFB loose
  AGR_006: 900,   // Livestock slurry
  IND_001: 1600,  // Steel slag
  IND_002: 900,   // Fly ash
  IND_003: 920,   // Used cooking oil (liquid)
  IND_004: 870,   // Waste lubricating oil
  IND_005: 200,   // Sawdust loose
  MSW_001: 300,   // Organic food waste loose
  MSW_002: 85,    // Loose paper/cardboard
  PLA_001: 30,    // Loose PET bottles
  PLA_002: 35,    // Loose HDPE
  PLA_003: 150,   // Mixed compressed plastic
  ELE_001: 1500,  // PCBs stacked
  ELE_002: 1200,  // Li-ion batteries packed
  ELE_003: 400,   // Computers stacked
  CDW_001: 1500,  // Concrete rubble
  CDW_002: 900,   // Gypsum board
  MET_001: 2500,  // Ferrous scrap loose
  MET_002: 1500,  // Aluminium scrap loose
  MET_003: 3000,  // Copper scrap
  TEX_001: 200,   // Fabric offcuts loose
  TEX_002: 250,   // Baled clothing
  GLS_001: 1200,  // Loose cullet
  RUB_001: 400,   // Whole tyres stacked
  CHM_001: 850,   // Spent solvents (liquid)
  CHM_002: 800,   // Spent catalyst powder
  FOD_001: 550,   // Spent brewery grains wet
  FOD_002: 450,   // Fruit/veg waste
  MAR_001: 50,    // Ocean plastic loose
  MAR_002: 600,   // Wet seaweed
  MIN_001: 1800,  // Mine tailings
  MED_001: 200,   // Medical plastic loose
  PAP_001: 120,   // Loose OCC cardboard
  COCO_SHL: 600,  // Coconut shells (agro scope crop type)
  DEFAULT: 500,   // Unknown waste fallback
};

/** Map AgroScope UI crop labels to wasteTypeId (for farmer input / vision weight). */
export const LABEL_TO_WASTE_TYPE_ID = {
  'Paddy Husk': 'AGR_001',
  'Rice Straw': 'AGR_001',
  'Rice Husk': 'AGR_001',
  'Wheat Straw': 'AGR_001',
  'Barley Straw': 'AGR_001',
  'Oat Straw': 'AGR_001',
  'Corn Stalks': 'AGR_003',
  'Maize Cob': 'AGR_003',
  'Sugarcane Bagasse': 'AGR_002',
  'Coconut Shells': 'COCO_SHL',
  'Groundnut Shell': 'AGR_001',
  'Cotton Stalk': 'AGR_001',
  'Mustard Stalk': 'AGR_001',
  'Soybean Stalk': 'AGR_001',
  'Sunflower Stalk': 'AGR_001',
  'Palm Empty Fruit Bunch': 'AGR_005',
  'Coffee Husk': 'AGR_004',
  'Tea Waste': 'AGR_001',
  'Banana Waste': 'FOD_002',
  'Mango Waste': 'FOD_002',
  'Vegetable Waste': 'FOD_002',
  'Fruit Waste': 'FOD_002',
  'Jute Stalk': 'AGR_001',
  'Castor Stalk': 'AGR_001',
  'Sesame Stalk': 'AGR_001',
  'Potato Vine': 'FOD_002',
  'Tomato Waste': 'FOD_002',
  'Gram / Chickpea Stalk': 'AGR_001',
  'Tur / Pigeon Pea Stalk': 'AGR_001',
  'Oilseed Waste': 'AGR_001',
  'Brewery Spent Grains': 'FOD_001',
  'Sorghum Stalk': 'AGR_001',
  'Rye Straw': 'AGR_001',
  'Millet Straw': 'AGR_001',
  'Lentil Stalk': 'AGR_001',
  'Cowpea / Black-Eyed Pea Stalk': 'AGR_001',
  'Bean Stalk': 'AGR_001',
  'Rapeseed / Canola Stalk': 'AGR_001',
  'Olive Pomace': 'FOD_002',
  'Cocoa Pod Husk': 'AGR_004',
  'Tobacco Stalk': 'AGR_001',
  'Hemp Stalk': 'AGR_001',
  'Cassava Peel / Residue': 'FOD_002',
  'Citrus Waste': 'FOD_002',
  'Grape Pomace': 'FOD_002',
  'Almond Shell': 'AGR_001',
  'Cashew Shell': 'COCO_SHL',
  'Pea Stalk': 'AGR_001',
  'Other Agricultural Waste': 'AGR_001',
};

/** Reverse map: wasteTypeId → display label (for API responses when user selected the type). */
export const WASTE_TYPE_ID_TO_LABEL = {
  AGR_001: 'Paddy Husk / Wheat Straw / Rice / Cereal straw',
  AGR_002: 'Sugarcane Bagasse',
  AGR_003: 'Corn Stalks / Maize',
  AGR_004: 'Coffee Husk',
  AGR_005: 'Palm EFB',
  COCO_SHL: 'Coconut Shells',
  FOD_001: 'Brewery Spent Grains',
  FOD_002: 'Fruit / Vegetable Waste',
};

export const FILL_FACTORS = {
  loose_agricultural: 0.3,
  baled: 0.85,
  liquid: 1.0,
  compressed_plastic: 0.6,
  metal_scrap_loose: 0.4,
  metal_scrap_dense: 0.7,
  electronic_stacked: 0.65,
  construction_rubble: 0.55,
  powder_bulk: 0.7,
  default: 0.5,
};

export function getDensityKgM3(wasteTypeId) {
  return WASTE_DENSITY_TABLE[wasteTypeId] ?? WASTE_DENSITY_TABLE.DEFAULT;
}
