/**
 * CO2 saved by diverting waste from landfill/incineration.
 * 1 ton organic/agricultural waste diverted ≈ 1.9 tons CO2 equivalent saved (EPA-style factors).
 */

const CO2_PER_TON = {
  default: 1.9,
  organic: 1.9,
  agricultural: 1.9,
  'paddy husk': 1.7,
  'wheat straw': 1.8,
  'corn stalks': 1.8,
  'sugarcane bagasse': 1.9,
  'coconut shells': 1.6,
  plastic: 2.5,
  biomass: 1.9,
};

const TREES_EQUIVALENT_PER_TON_CO2 = 50; // ~50 trees absorb 1 ton CO2 per year (approx)
const CREDITS_PER_TON_CO2 = 0.1; // Example: 0.1 carbon credit per ton CO2

/**
 * @param {string} wasteType - Type of waste
 * @param {number} quantityTons - Quantity in tons
 * @returns {{ co2SavedTons: number, equivalentTrees: number, carbonCreditsEarned: number, wasteType: string, quantityTons: number }}
 */
export function simulateCarbon(wasteType, quantityTons) {
  if (!wasteType || typeof quantityTons !== 'number' || quantityTons <= 0) {
    throw new Error('wasteType and quantityTons (positive number) are required');
  }

  const key = (wasteType || '').toLowerCase().trim();
  const factor = CO2_PER_TON[key] || CO2_PER_TON.default;
  const co2SavedTons = Math.round(factor * quantityTons * 100) / 100;
  const equivalentTrees = Math.round(co2SavedTons * TREES_EQUIVALENT_PER_TON_CO2);
  const carbonCreditsEarned = Math.round(co2SavedTons * CREDITS_PER_TON_CO2 * 100) / 100;

  return {
    wasteType: wasteType.trim(),
    quantityTons,
    co2SavedTons,
    equivalentTrees,
    carbonCreditsEarned,
  };
}
