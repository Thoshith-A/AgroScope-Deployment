/**
 * Thrown when market price is not found for given wasteType + state.
 * Global handler returns 404.
 */
export class MarketPriceNotFoundException extends Error {
  constructor(wasteType, state) {
    super(`Market price not found for wasteType="${wasteType}", state="${state}"`);
    this.name = 'MarketPriceNotFoundException';
    this.statusCode = 404;
  }
}
