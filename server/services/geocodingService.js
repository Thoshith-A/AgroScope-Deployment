// server/services/geocodingService.js
// Location detection and reverse geocoding using OpenCage API

import axios from 'axios';

/**
 * Reverse geocode coordinates to get location details
 */
export async function reverseGeocode(latitude, longitude, apiKey) {
  if (!apiKey || apiKey === 'demo_key') {
    console.log('⚠️  Using demo mode - Geocoding API not configured');
    return getFallbackLocation(latitude, longitude);
  }

  try {
    const response = await axios.get('https://api.opencagedata.com/geocode/v1/json', {
      params: {
        q: `${latitude},${longitude}`,
        key: apiKey,
        language: 'en',
        no_annotations: 1
      },
      timeout: 5000
    });

    if (response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      const components = result.components;

      return {
        city: components.city || components.town || components.village || components.county || 'Unknown',
        state: components.state || components.region || 'Unknown',
        country: components.country || 'Unknown',
        countryCode: components.country_code?.toUpperCase() || 'XX',
        coordinates: {
          lat: latitude,
          lng: longitude
        },
        formatted: result.formatted,
        raw: result
      };
    }

    return getFallbackLocation(latitude, longitude);
  } catch (error) {
    console.error('Geocoding error:', error.response?.data || error.message);
    return getFallbackLocation(latitude, longitude);
  }
}

/**
 * Get location details from IP address (fallback method)
 */
export async function getLocationFromIP() {
  try {
    const response = await axios.get('https://ipapi.co/json/', {
      timeout: 5000
    });

    return {
      city: response.data.city || 'Unknown',
      state: response.data.region || 'Unknown',
      country: response.data.country_name || 'Unknown',
      countryCode: response.data.country_code || 'XX',
      coordinates: {
        lat: response.data.latitude,
        lng: response.data.longitude
      },
      formatted: `${response.data.city}, ${response.data.region}, ${response.data.country_name}`
    };
  } catch (error) {
    console.error('IP geolocation error:', error.message);
    return {
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      countryCode: 'IN',
      coordinates: { lat: 28.6139, lng: 77.2090 },
      formatted: 'Delhi, India'
    };
  }
}

function getFallbackLocation(lat, lng) {
  const locations = [
    { lat: 28.6139, lng: 77.2090, city: 'Delhi', state: 'Delhi', country: 'India' },
    { lat: 30.7333, lng: 76.7794, city: 'Chandigarh', state: 'Punjab', country: 'India' },
    { lat: 19.0760, lng: 72.8777, city: 'Mumbai', state: 'Maharashtra', country: 'India' },
    { lat: 13.0827, lng: 80.2707, city: 'Chennai', state: 'Tamil Nadu', country: 'India' },
    { lat: 22.5726, lng: 88.3639, city: 'Kolkata', state: 'West Bengal', country: 'India' },
    { lat: 12.9716, lng: 77.5946, city: 'Bangalore', state: 'Karnataka', country: 'India' }
  ];

  let nearest = locations[0];
  let minDistance = Infinity;

  for (const loc of locations) {
    const distance = Math.sqrt(
      Math.pow(loc.lat - lat, 2) + Math.pow(loc.lng - lng, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearest = loc;
    }
  }

  return {
    city: nearest.city,
    state: nearest.state,
    country: nearest.country,
    countryCode: 'IN',
    coordinates: { lat, lng },
    formatted: `${nearest.city}, ${nearest.state}, ${nearest.country}`
  };
}

export function getAgricultureRegion(location) {
  const { state, country } = location;

  const indianStates = {
    'Punjab': 'North India - Wheat Belt',
    'Haryana': 'North India - Wheat Belt',
    'Uttar Pradesh': 'North India - Sugarcane Belt',
    'Maharashtra': 'West India - Cotton & Sugarcane',
    'Gujarat': 'West India - Cotton Belt',
    'Madhya Pradesh': 'Central India - Soybean Belt',
    'Rajasthan': 'North India - Bajra Belt',
    'Karnataka': 'South India - Coffee & Spice',
    'Tamil Nadu': 'South India - Rice Belt',
    'Andhra Pradesh': 'South India - Rice Belt',
    'Telangana': 'South India - Rice Belt',
    'West Bengal': 'East India - Rice Belt',
    'Bihar': 'East India - Maize Belt',
    'Odisha': 'East India - Rice Belt',
    'Kerala': 'South India - Spice Belt'
  };

  if (country === 'India' && indianStates[state]) {
    return indianStates[state];
  }

  if (country === 'United States') return 'North America - Corn Belt';
  if (country === 'Brazil') return 'South America - Soybean Belt';
  if (country === 'China') return 'Asia - Rice Belt';
  if (country === 'Australia') return 'Oceania - Wheat Belt';

  return 'Global Agriculture Region';
}

export function getLocationKeywords(location) {
  const keywords = [
    location.city,
    location.state,
    location.country
  ];

  if (location.countryCode === 'IN') {
    keywords.push('India', 'Indian', 'Delhi');
    const stateGroups = {
      'Punjab': ['Haryana', 'North India', 'IGP'],
      'Haryana': ['Punjab', 'Delhi', 'North India'],
      'Maharashtra': ['Mumbai', 'Pune', 'West India'],
      'Karnataka': ['Bangalore', 'South India'],
      'Tamil Nadu': ['Chennai', 'South India']
    };
    if (stateGroups[location.state]) {
      keywords.push(...stateGroups[location.state]);
    }
  }

  return [...new Set(keywords)];
}

export function isValidCoordinates(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}
