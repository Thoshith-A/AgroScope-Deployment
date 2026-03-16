/**
 * Location-aware forecast configuration for 10 Indian cities.
 * Each city has unique supply, pricing and confidence values.
 */

export const LOCATION_FORECAST_CONFIG = {
  Chennai: {
    state: 'Tamil Nadu',
    region: 'South',
    coldStorageHub: 'Chennai Port Cold Chain Facility',
    coordinates: { lat: 13.0827, lng: 80.2707 },
    baseSupplyKgPerDay: {
      paddy_husk: 3600,
      wheat_straw: 200,
      corn_stalks: 1100,
      sugarcane_bagasse: 2800,
      coconut_shells: 3200,
    },
    seasonMultipliers: {
      paddy_husk:        { kharif: 1.95, rabi: 1.20, zaid: 0.85, summer: 0.78 },
      wheat_straw:       { kharif: 0.55, rabi: 1.40, zaid: 0.60, summer: 0.55 },
      corn_stalks:       { kharif: 1.30, rabi: 0.90, zaid: 1.20, summer: 0.95 },
      sugarcane_bagasse: { kharif: 1.10, rabi: 1.40, zaid: 1.05, summer: 1.25 },
      coconut_shells:    { kharif: 1.35, rabi: 1.30, zaid: 1.40, summer: 1.45 },
    },
    pricePerKg: {
      paddy_husk: 2.4,
      wheat_straw: 5.2,
      corn_stalks: 2.6,
      sugarcane_bagasse: 2.0,
      coconut_shells: 7.4,
    },
    confidenceBase: 0.84,
    trendBias: 'stable',
    marketDemandScore: 0.90,
    avgTransportKm: 30,
    distancePenaltyPerKm: 0.0013,
    peakMonths: {
      paddy_husk: 'Jan & Aug',
      wheat_straw: 'Feb',
      corn_stalks: 'Aug',
      sugarcane_bagasse: 'Dec-Feb',
      coconut_shells: 'Year-round',
    },
    insights: {
      topBuyers: 'Coir exporters, activated carbon units, paper mills',
      challenge: 'Cyclone season disrupts Oct-Dec supply',
      opportunity: 'Export demand for coconut shell charcoal booming',
      coldStorageCapacityTons: 35000,
    },
  },

  Mumbai: {
    state: 'Maharashtra',
    region: 'West',
    coldStorageHub: 'Mumbai APMC Vashi Cold Hub',
    coordinates: { lat: 19.0760, lng: 72.8777 },
    baseSupplyKgPerDay: {
      paddy_husk: 1400,
      wheat_straw: 800,
      corn_stalks: 2200,
      sugarcane_bagasse: 7100,
      coconut_shells: 1800,
    },
    seasonMultipliers: {
      paddy_husk:        { kharif: 1.60, rabi: 0.92, zaid: 0.70, summer: 0.65 },
      wheat_straw:       { kharif: 0.42, rabi: 1.85, zaid: 0.48, summer: 0.44 },
      corn_stalks:       { kharif: 1.78, rabi: 0.68, zaid: 1.38, summer: 0.85 },
      sugarcane_bagasse: { kharif: 1.02, rabi: 1.52, zaid: 1.06, summer: 1.32 },
      coconut_shells:    { kharif: 1.12, rabi: 1.08, zaid: 1.18, summer: 1.22 },
    },
    pricePerKg: {
      paddy_husk: 3.5,
      wheat_straw: 4.8,
      corn_stalks: 3.4,
      sugarcane_bagasse: 2.6,
      coconut_shells: 8.8,
    },
    confidenceBase: 0.91,
    trendBias: 'rising',
    marketDemandScore: 0.95,
    avgTransportKm: 20,
    distancePenaltyPerKm: 0.0008,
    peakMonths: {
      paddy_husk: 'Oct',
      wheat_straw: 'Apr',
      corn_stalks: 'Nov',
      sugarcane_bagasse: 'Nov-Mar',
      coconut_shells: 'Year-round',
    },
    insights: {
      topBuyers: 'FMCG packaging, ethanol plants, paper industry',
      challenge: 'High land cost limits on-site storage',
      opportunity: 'Largest buyer network in India — fastest deals',
      coldStorageCapacityTons: 52000,
    },
  },

  Delhi: {
    state: 'Delhi NCR',
    region: 'North',
    coldStorageHub: 'Delhi Azadpur Cold Chain Terminal',
    coordinates: { lat: 28.7041, lng: 77.1025 },
    baseSupplyKgPerDay: {
      paddy_husk: 2900,
      wheat_straw: 5800,
      corn_stalks: 1650,
      sugarcane_bagasse: 1900,
      coconut_shells: 120,
    },
    seasonMultipliers: {
      paddy_husk:        { kharif: 2.15, rabi: 0.40, zaid: 0.55, summer: 0.48 },
      wheat_straw:       { kharif: 0.36, rabi: 2.70, zaid: 0.46, summer: 0.42 },
      corn_stalks:       { kharif: 1.68, rabi: 0.58, zaid: 1.32, summer: 0.72 },
      sugarcane_bagasse: { kharif: 0.82, rabi: 1.22, zaid: 0.88, summer: 1.08 },
      coconut_shells:    { kharif: 0.62, rabi: 0.68, zaid: 0.74, summer: 0.80 },
    },
    pricePerKg: {
      paddy_husk: 2.9,
      wheat_straw: 4.0,
      corn_stalks: 2.7,
      sugarcane_bagasse: 2.2,
      coconut_shells: 6.1,
    },
    confidenceBase: 0.79,
    trendBias: 'rising',
    marketDemandScore: 0.86,
    avgTransportKm: 55,
    distancePenaltyPerKm: 0.0019,
    peakMonths: {
      paddy_husk: 'Oct-Nov',
      wheat_straw: 'May',
      corn_stalks: 'Sep-Oct',
      sugarcane_bagasse: 'Feb',
      coconut_shells: 'Year-round',
    },
    insights: {
      topBuyers: 'Biomass power plants, flour mills, poultry feed',
      challenge: 'Air quality laws — strict stubble burn ban',
      opportunity: 'Govt. PUSA bio-decomposer scheme active',
      coldStorageCapacityTons: 28000,
    },
  },

  Bengaluru: {
    state: 'Karnataka',
    region: 'South',
    coldStorageHub: 'Bengaluru APMC Yeshwanthpur Cold Hub',
    coordinates: { lat: 12.9716, lng: 77.5946 },
    baseSupplyKgPerDay: {
      paddy_husk: 2200,
      wheat_straw: 380,
      corn_stalks: 3400,
      sugarcane_bagasse: 4300,
      coconut_shells: 2700,
    },
    seasonMultipliers: {
      paddy_husk:        { kharif: 1.72, rabi: 1.05, zaid: 0.78, summer: 0.70 },
      wheat_straw:       { kharif: 0.46, rabi: 1.65, zaid: 0.52, summer: 0.47 },
      corn_stalks:       { kharif: 1.98, rabi: 0.82, zaid: 1.52, summer: 1.06 },
      sugarcane_bagasse: { kharif: 1.08, rabi: 1.52, zaid: 1.10, summer: 1.32 },
      coconut_shells:    { kharif: 1.26, rabi: 1.22, zaid: 1.34, summer: 1.40 },
    },
    pricePerKg: {
      paddy_husk: 3.3,
      wheat_straw: 5.0,
      corn_stalks: 3.2,
      sugarcane_bagasse: 2.5,
      coconut_shells: 8.5,
    },
    confidenceBase: 0.89,
    trendBias: 'rising',
    marketDemandScore: 0.94,
    avgTransportKm: 22,
    distancePenaltyPerKm: 0.0009,
    peakMonths: {
      paddy_husk: 'Sep-Oct',
      wheat_straw: 'Mar',
      corn_stalks: 'Oct',
      sugarcane_bagasse: 'Nov-Feb',
      coconut_shells: 'Year-round',
    },
    insights: {
      topBuyers: 'Tech park composting, biogas startups, breweries',
      challenge: 'Urban premium compresses farmer margins',
      opportunity: 'Highest startup density — fastest buyer matching',
      coldStorageCapacityTons: 42000,
    },
  },

  Hyderabad: {
    state: 'Telangana',
    region: 'South-Central',
    coldStorageHub: 'Hyderabad Bowenpally Cold Chain',
    coordinates: { lat: 17.3850, lng: 78.4867 },
    baseSupplyKgPerDay: {
      paddy_husk: 4400,
      wheat_straw: 950,
      corn_stalks: 2800,
      sugarcane_bagasse: 3600,
      coconut_shells: 1200,
    },
    seasonMultipliers: {
      paddy_husk:        { kharif: 2.28, rabi: 1.10, zaid: 0.82, summer: 0.74 },
      wheat_straw:       { kharif: 0.50, rabi: 2.05, zaid: 0.56, summer: 0.51 },
      corn_stalks:       { kharif: 1.88, rabi: 0.78, zaid: 1.48, summer: 0.98 },
      sugarcane_bagasse: { kharif: 1.06, rabi: 1.48, zaid: 1.04, summer: 1.28 },
      coconut_shells:    { kharif: 1.20, rabi: 1.18, zaid: 1.28, summer: 1.35 },
    },
    pricePerKg: {
      paddy_husk: 2.6,
      wheat_straw: 4.4,
      corn_stalks: 2.9,
      sugarcane_bagasse: 2.3,
      coconut_shells: 7.1,
    },
    confidenceBase: 0.85,
    trendBias: 'rising',
    marketDemandScore: 0.91,
    avgTransportKm: 33,
    distancePenaltyPerKm: 0.0013,
    peakMonths: {
      paddy_husk: 'Nov',
      wheat_straw: 'Apr',
      corn_stalks: 'Oct',
      sugarcane_bagasse: 'Jan-Mar',
      coconut_shells: 'Year-round',
    },
    insights: {
      topBuyers: 'Pharma industry (corn), rice bran oil mills',
      challenge: 'Erratic monsoon — yield unpredictability',
      opportunity: 'Genome Valley biotech demand for biomass',
      coldStorageCapacityTons: 31000,
    },
  },

  Kolkata: {
    state: 'West Bengal',
    region: 'East',
    coldStorageHub: 'Kolkata Hooghly Cold Chain Terminal',
    coordinates: { lat: 22.5726, lng: 88.3639 },
    baseSupplyKgPerDay: {
      paddy_husk: 7200,
      wheat_straw: 580,
      corn_stalks: 1380,
      sugarcane_bagasse: 2350,
      coconut_shells: 1550,
    },
    seasonMultipliers: {
      paddy_husk:        { kharif: 2.62, rabi: 1.35, zaid: 0.90, summer: 0.82 },
      wheat_straw:       { kharif: 0.54, rabi: 1.45, zaid: 0.60, summer: 0.55 },
      corn_stalks:       { kharif: 1.42, rabi: 0.92, zaid: 1.24, summer: 0.96 },
      sugarcane_bagasse: { kharif: 1.00, rabi: 1.42, zaid: 0.98, summer: 1.18 },
      coconut_shells:    { kharif: 1.14, rabi: 1.10, zaid: 1.20, summer: 1.26 },
    },
    pricePerKg: {
      paddy_husk: 2.0,
      wheat_straw: 4.6,
      corn_stalks: 2.2,
      sugarcane_bagasse: 1.8,
      coconut_shells: 6.8,
    },
    confidenceBase: 0.80,
    trendBias: 'stable',
    marketDemandScore: 0.85,
    avgTransportKm: 38,
    distancePenaltyPerKm: 0.0016,
    peakMonths: {
      paddy_husk: 'Nov & Apr',
      wheat_straw: 'Mar',
      corn_stalks: 'Sep',
      sugarcane_bagasse: 'Jan',
      coconut_shells: 'Year-round',
    },
    insights: {
      topBuyers: 'Jute mills, rice bran oil, aquaculture feed',
      challenge: 'Monsoon flooding disrupts Jul-Sep supply chain',
      opportunity: 'Port Kolkata enables SE Asia waste export',
      coldStorageCapacityTons: 32000,
    },
  },

  Pune: {
    state: 'Maharashtra',
    region: 'West',
    coldStorageHub: 'Pune Agri Logistics Cold Hub',
    coordinates: { lat: 18.5204, lng: 73.8567 },
    baseSupplyKgPerDay: {
      paddy_husk: 1850,
      wheat_straw: 1150,
      corn_stalks: 2750,
      sugarcane_bagasse: 6100,
      coconut_shells: 660,
    },
    seasonMultipliers: {
      paddy_husk:        { kharif: 1.76, rabi: 0.50, zaid: 0.66, summer: 0.59 },
      wheat_straw:       { kharif: 0.48, rabi: 1.96, zaid: 0.56, summer: 0.51 },
      corn_stalks:       { kharif: 1.92, rabi: 0.72, zaid: 1.46, summer: 0.89 },
      sugarcane_bagasse: { kharif: 1.06, rabi: 1.56, zaid: 1.12, summer: 1.36 },
      coconut_shells:    { kharif: 1.11, rabi: 1.15, zaid: 1.21, summer: 1.26 },
    },
    pricePerKg: {
      paddy_husk: 3.0,
      wheat_straw: 4.2,
      corn_stalks: 2.8,
      sugarcane_bagasse: 2.4,
      coconut_shells: 6.2,
    },
    confidenceBase: 0.86,
    trendBias: 'rising',
    marketDemandScore: 0.92,
    avgTransportKm: 28,
    distancePenaltyPerKm: 0.0012,
    peakMonths: {
      paddy_husk: 'Oct',
      wheat_straw: 'Mar',
      corn_stalks: 'Oct-Nov',
      sugarcane_bagasse: 'Nov-Apr',
      coconut_shells: 'Year-round',
    },
    insights: {
      topBuyers: 'Praj Industries, ethanol plants, paper mills',
      challenge: 'Urban sprawl reducing nearby farmland fast',
      opportunity: 'Pune startup ecosystem actively buying agri-waste',
      coldStorageCapacityTons: 28000,
    },
  },

  Ahmedabad: {
    state: 'Gujarat',
    region: 'West',
    coldStorageHub: 'Ahmedabad Sabarmati Agri Cold Chain',
    coordinates: { lat: 23.0225, lng: 72.5714 },
    baseSupplyKgPerDay: {
      paddy_husk: 1550,
      wheat_straw: 2750,
      corn_stalks: 3750,
      sugarcane_bagasse: 4500,
      coconut_shells: 360,
    },
    seasonMultipliers: {
      paddy_husk:        { kharif: 1.64, rabi: 0.54, zaid: 0.70, summer: 0.62 },
      wheat_straw:       { kharif: 0.40, rabi: 2.22, zaid: 0.50, summer: 0.46 },
      corn_stalks:       { kharif: 2.06, rabi: 0.74, zaid: 1.56, summer: 0.94 },
      sugarcane_bagasse: { kharif: 0.94, rabi: 1.40, zaid: 0.98, summer: 1.20 },
      coconut_shells:    { kharif: 0.94, rabi: 0.97, zaid: 1.04, summer: 1.11 },
    },
    pricePerKg: {
      paddy_husk: 3.1,
      wheat_straw: 3.6,
      corn_stalks: 3.1,
      sugarcane_bagasse: 2.3,
      coconut_shells: 6.5,
    },
    confidenceBase: 0.87,
    trendBias: 'rising',
    marketDemandScore: 0.92,
    avgTransportKm: 28,
    distancePenaltyPerKm: 0.0011,
    peakMonths: {
      paddy_husk: 'Oct',
      wheat_straw: 'Apr',
      corn_stalks: 'Oct-Nov',
      sugarcane_bagasse: 'Jan-Mar',
      coconut_shells: 'Year-round',
    },
    insights: {
      topBuyers: 'Amul biogas units, textile mills, pharma corn',
      challenge: 'Cotton dominates cold storage priority window',
      opportunity: 'Gujarat CBG mission — 500 plants by 2026',
      coldStorageCapacityTons: 38000,
    },
  },

  Jaipur: {
    state: 'Rajasthan',
    region: 'North-West',
    coldStorageHub: 'Jaipur Muhana Mandi Cold Storage',
    coordinates: { lat: 26.9124, lng: 75.7873 },
    baseSupplyKgPerDay: {
      paddy_husk: 780,
      wheat_straw: 5100,
      corn_stalks: 2350,
      sugarcane_bagasse: 1150,
      coconut_shells: 55,
    },
    seasonMultipliers: {
      paddy_husk:        { kharif: 1.38, rabi: 0.36, zaid: 0.49, summer: 0.43 },
      wheat_straw:       { kharif: 0.33, rabi: 2.68, zaid: 0.43, summer: 0.39 },
      corn_stalks:       { kharif: 1.76, rabi: 0.56, zaid: 1.38, summer: 0.69 },
      sugarcane_bagasse: { kharif: 0.74, rabi: 1.14, zaid: 0.80, summer: 1.04 },
      coconut_shells:    { kharif: 0.56, rabi: 0.61, zaid: 0.67, summer: 0.73 },
    },
    pricePerKg: {
      paddy_husk: 3.5,
      wheat_straw: 3.4,
      corn_stalks: 2.8,
      sugarcane_bagasse: 2.0,
      coconut_shells: 5.2,
    },
    confidenceBase: 0.75,
    trendBias: 'stable',
    marketDemandScore: 0.79,
    avgTransportKm: 60,
    distancePenaltyPerKm: 0.0022,
    peakMonths: {
      paddy_husk: 'Oct',
      wheat_straw: 'May',
      corn_stalks: 'Oct',
      sugarcane_bagasse: 'Feb',
      coconut_shells: 'Year-round',
    },
    insights: {
      topBuyers: 'Cattle farms, handicraft industry, biomass boilers',
      challenge: 'Arid climate reduces biomass moisture content',
      opportunity: 'Pink City tourism drives organic compost demand',
      coldStorageCapacityTons: 9500,
    },
  },

  Surat: {
    state: 'Gujarat',
    region: 'West',
    coldStorageHub: 'Surat Diamond & Agri Cold Hub',
    coordinates: { lat: 21.1702, lng: 72.8311 },
    baseSupplyKgPerDay: {
      paddy_husk: 1180,
      wheat_straw: 1750,
      corn_stalks: 2850,
      sugarcane_bagasse: 5700,
      coconut_shells: 510,
    },
    seasonMultipliers: {
      paddy_husk:        { kharif: 1.54, rabi: 0.49, zaid: 0.64, summer: 0.57 },
      wheat_straw:       { kharif: 0.39, rabi: 2.12, zaid: 0.47, summer: 0.43 },
      corn_stalks:       { kharif: 1.96, rabi: 0.71, zaid: 1.49, summer: 0.91 },
      sugarcane_bagasse: { kharif: 0.99, rabi: 1.51, zaid: 1.03, summer: 1.31 },
      coconut_shells:    { kharif: 1.01, rabi: 1.03, zaid: 1.11, summer: 1.19 },
    },
    pricePerKg: {
      paddy_husk: 3.4,
      wheat_straw: 3.8,
      corn_stalks: 3.3,
      sugarcane_bagasse: 2.5,
      coconut_shells: 7.0,
    },
    confidenceBase: 0.88,
    trendBias: 'rising',
    marketDemandScore: 0.93,
    avgTransportKm: 24,
    distancePenaltyPerKm: 0.0010,
    peakMonths: {
      paddy_husk: 'Oct',
      wheat_straw: 'Apr',
      corn_stalks: 'Nov',
      sugarcane_bagasse: 'Nov-Mar',
      coconut_shells: 'Year-round',
    },
    insights: {
      topBuyers: 'Textile sizing units, ethanol plants, paper mills',
      challenge: 'Industrial competition for transport capacity',
      opportunity: 'Port proximity enables processed waste export',
      coldStorageCapacityTons: 29000,
    },
  },
};

const WASTE_LABELS = {
  paddy_husk: 'Paddy Husk',
  wheat_straw: 'Wheat Straw',
  corn_stalks: 'Corn Stalks',
  sugarcane_bagasse: 'Sugarcane Bagasse',
  coconut_shells: 'Coconut Shells',
};

function getSeasonForMonth(monthIndex) {
  // monthIndex: 0 = Jan ... 11 = Dec
  if (monthIndex >= 5 && monthIndex <= 9) return 'kharif'; // Jun–Oct
  if (monthIndex >= 10 || monthIndex <= 1) return 'rabi'; // Nov–Feb
  if (monthIndex === 2 || monthIndex === 3) return 'zaid'; // Mar–Apr
  return 'summer'; // May
}

export function calculateForecast({ city, wasteType }) {
  const location = LOCATION_FORECAST_CONFIG[city];
  if (!location) {
    throw new Error(`Unknown city: ${city}`);
  }
  const cropKey = wasteType;
  const basePerDay = location.baseSupplyKgPerDay[cropKey] ?? 0;
  const season = getSeasonForMonth(new Date().getMonth());
  const seasonMultiplier = location.seasonMultipliers[cropKey]?.[season] ?? 1.0;

  const dailyBase = basePerDay * seasonMultiplier;
  const predictedQuantityKg = dailyBase * 30;

  const confidenceLevel = Math.max(
    0.5,
    Math.min(
      0.98,
      location.confidenceBase * (0.9 + location.marketDemandScore * 0.2)
    )
  );

  const dailyBreakdown = Array.from({ length: 30 }, (_, idx) => {
    const wave = 1 + 0.08 * Math.sin((idx / 30) * Math.PI * 2);
    const predictedKg = dailyBase * wave;
    return {
      day: idx + 1,
      predictedKg,
      lowerBound: predictedKg * 0.9,
      upperBound: predictedKg * 1.1,
    };
  });

  const key = cropKey in WASTE_LABELS ? WASTE_LABELS[cropKey] : cropKey;

  return {
    city,
    state: location.state,
    hubName: location.coldStorageHub,
    wasteTypeKey: cropKey,
    wasteTypeLabel: key,
    predictedQuantityKg,
    confidenceLevel,
    trend: location.trendBias,
    dataPoints: dailyBreakdown.length,
    pricePerKg: location.pricePerKg[cropKey] ?? 0,
    peakMonth: location.peakMonths[cropKey] ?? '',
    marketDemandScore: location.marketDemandScore,
    dailyBreakdown,
    message:
      'Predicted quantity is based on configured city-season supply patterns and market demand for this crop waste.',
  };
}

