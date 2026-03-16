/**
 * Rule-based waste-to-product recommendations. Can be extended with ML later.
 */
const WASTE_TO_PRODUCTS = {
  'paddy husk': ['Biogas', 'Compost', 'Animal feed', 'Biochar', 'Silica extraction'],
  'wheat straw': ['Bioethanol', 'Compost', 'Biomass briquettes', 'Paper pulp', 'Animal bedding'],
  'corn stalks': ['Biogas', 'Biofuel', 'Compost', 'Biomass briquettes', 'Fertilizer'],
  'sugarcane bagasse': ['Bioelectricity', 'Bioethanol', 'Paper', 'Particleboard', 'Compost'],
  'coconut shells': ['Activated carbon', 'Biomass briquettes', 'Coir products', 'Charcoal'],
  organic: ['Biogas', 'Compost', 'Fertilizer', 'Animal feed'],
  agricultural: ['Biofuel', 'Biomass briquettes', 'Compost', 'Biogas', 'Animal feed'],
  plastic: ['Recycled pellets', 'Composite materials', 'Fuel oil', 'Construction materials'],
  default: ['Compost', 'Biogas', 'Biomass briquettes', 'Recycling'],
};

function normalizeWasteType(wasteType) {
  if (!wasteType || typeof wasteType !== 'string') return 'default';
  const t = wasteType.toLowerCase().trim();
  if (WASTE_TO_PRODUCTS[t]) return t;
  for (const key of Object.keys(WASTE_TO_PRODUCTS)) {
    if (key !== 'default' && t.includes(key)) return key;
  }
  return 'default';
}

/**
 * @param {string} wasteType - Type of waste
 * @returns {{ wasteType: string, normalizedType: string, products: string[] }}
 */
export function getRecommendations(wasteType) {
  const normalized = normalizeWasteType(wasteType);
  const products = [...(WASTE_TO_PRODUCTS[normalized] || WASTE_TO_PRODUCTS.default)];

  return {
    wasteType: (wasteType || '').trim() || 'Unknown',
    normalizedType: normalized,
    products,
  };
}
