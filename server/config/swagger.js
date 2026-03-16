import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AgroScope Waste-to-Value API',
      version: '1.0.0',
      description: 'Backend API for AgroScope: Fair Price, Ratings, Forecast, Carbon, Recommendations',
    },
    servers: [{ url: '/', description: 'Relative to host' }],
  },
  apis: ['./routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
