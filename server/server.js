import express from 'express';
import { createServer } from 'http';
import mongoose from 'mongoose';
import { initSocket, seedProvisionsFromList } from './socket.js';
import { provisions } from './socket.js';
import { initProvisionsFromStore, getDemoProvisions } from './routes/provisions.js';
import { initPaymentsFromStore } from './routes/payments.js';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import provisionsRoutes from './routes/provisions.js';
import matchmakingRoutes from './routes/matchmaking.js';
import wasteRoutes from './routes/waste.js';
import notificationsRoutes from './routes/notifications.js';
import ordersRoutes from './routes/orders.js';
import cropsRoutes from './routes/crops.js';
import priceRoutes from './routes/price.js';
import startupRatingRoutes from './routes/startupRating.js';
import farmerRatingRoutes from './routes/farmerRating.js';
import startupsRoutes from './routes/startups.js';
import farmersRoutes from './routes/farmers.js';
import forecastRoutes from './routes/forecast.js';
import carbonRoutes from './routes/carbon.js';
import recommendationsRoutes from './routes/recommendations.js';
import marketPriceRoutes from './routes/marketPrice.js';
import coldStorageRoutes from './routes/coldStorage.js';
import cropMonitorRouter from './routes/cropMonitor.js';
import weightEstimatorRouter from './routes/weightEstimator.js';
import priceNegotiationRoutes from './routes/priceNegotiation.js';
import translationRoute from './routes/translationRoute.js';
import agriNewsRoutes from './routes/agriNews.js';
import walletRoutes from './routes/wallet.js';
import weatherForecastRoutes from './routes/weatherForecast.js';
import loyaltyRoutes from './routes/loyalty.js';
import paymentsRouter from './routes/payments.js';
import cropVisionRoutes from './routes/cropVision.js';
import visionWeightEstimatorRoutes from './routes/visionWeightEstimator.js';
import cropWasteUploadRouter from './routes/cropWasteUpload.js';
import adminRoutes from './routes/admin.js';
import { seedMarketPricesIfEmpty } from './services/marketPriceService.js';
import { seedCropWasteHistoryIfEmpty } from './scripts/seedCropWasteHistory.js';
import { seedPriceDatasetIfEmpty } from './scripts/seedPriceDataset.js';
import { seedSupplyForecastIfEmpty } from './scripts/seedSupplyForecast.js';
import { apiErrorHandler } from './utils/errorHandler.js';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
// Load .env: cwd (when run from project root), then project root, then server/.env overrides
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

// Resolve GOOGLE_APPLICATION_CREDENTIALS to absolute path when relative (so Google libs find the JSON)
const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (creds && !path.isAbsolute(creds)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, creds);
}

const app = express();
const PORT = process.env.PORT || 5000;
const BODY_LIMIT = process.env.BODY_LIMIT || '12mb';

// Middleware
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());
// Allow base64 image payloads for Vision routes (default 100kb is too small).
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));

// MongoDB Atlas Connection
const MONGODB_URI = (process.env.MONGODB_URI || '').trim();
const isPlaceholder = !MONGODB_URI || MONGODB_URI.includes('your-') || (MONGODB_URI.includes('password') && !MONGODB_URI.includes('@'));

if (MONGODB_URI && !isPlaceholder) {
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  })
    .then(() => {
      console.log('✅ Connected to MongoDB Atlas successfully');
      seedMarketPricesIfEmpty();
      seedCropWasteHistoryIfEmpty();
      seedPriceDatasetIfEmpty();
      seedSupplyForecastIfEmpty();
    })
    .catch((error) => {
      console.warn('⚠️ MongoDB Atlas connection error:', error.message);
      console.warn('⚠️ Server will continue without database (development mode)');
      console.warn('   Run: node scripts/check-mongo.js (from server/) for connection help.');
    });
} else {
  if (isPlaceholder && MONGODB_URI) {
    console.warn('⚠️ MONGODB_URI looks like a placeholder - update server/.env with your Atlas URI.');
  } else {
    console.warn('⚠️ MONGODB_URI not set - running in development mode without database');
  }
  console.warn('   Copy server/.env.example to server/.env and set MONGODB_URI from https://cloud.mongodb.com');
  console.warn('   Crop waste verification will use file store (server/data/crop-waste-verifications.json) until MongoDB is connected.');
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/provisions', provisionsRoutes);
app.use('/api/matchmaking', matchmakingRoutes);
app.use('/api/waste', wasteRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/crops', cropsRoutes);
app.use('/api/price', priceRoutes);
app.use('/api/startup', startupRatingRoutes);
app.use('/api/farmer', farmerRatingRoutes);
app.use('/api/startups', startupsRoutes);
app.use('/api/farmers', farmersRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/carbon', carbonRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/market-price', marketPriceRoutes);
app.use('/api/cold-storage', coldStorageRoutes);
app.use('/api/crop-monitor', cropMonitorRouter);
app.use('/api/price-negotiation', priceNegotiationRoutes);
app.use('/api/translate', translationRoute);
app.use('/api/agri-news', agriNewsRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/weather-forecast', weatherForecastRoutes);
app.use('/api/loyalty', loyaltyRoutes);
// Payments: POST /api/payments/submit, GET /api/payments (must be before generic /api)
app.use('/api/payments', paymentsRouter);
// Crop type detection + weight estimation via Google Cloud Vision
app.use('/api/vision', cropVisionRoutes);
app.use('/api/vision', visionWeightEstimatorRoutes);
app.use('/api/crop-waste-upload', cropWasteUploadRouter);
app.use('/api/admin', adminRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api', weightEstimatorRouter);
// Compatibility routes for current frontend
app.use('/', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'AgroScope Backend Server is running',
    timestamp: new Date().toISOString()
  });
});

// Sync provisions (Socket.IO in-memory store)
app.get('/api/sync/provisions', (req, res) => {
  res.json(provisions);
});
app.get('/api/sync/provisions/:id', (req, res) => {
  const p = provisions.find((x) => x.id === req.params.id);
  if (p) res.json(p);
  else res.status(404).json({ error: 'Not found' });
});

// Swagger (optional - mount before error handler)
try {
  const swaggerUi = require('swagger-ui-express');
  const { swaggerSpec } = require('./config/swagger.cjs');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log('📚 Swagger UI: http://localhost:' + PORT + '/api-docs');
} catch (e) {
  console.log('📚 Swagger skipped (install swagger-jsdoc & swagger-ui-express for /api-docs)');
}

// API error handler (must be after routes)
app.use(apiErrorHandler);

// ── Production: Serve React frontend ──────────────────
const distPath = path.join(__dirname, '../dist');
const indexHtml = path.join(distPath, 'index.html');
if (process.env.NODE_ENV === 'production') {
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
      res.sendFile(indexHtml, (err) => { if (err) next(err); });
    });
  } else {
    console.warn('⚠️ dist/index.html not found — set NODE_ENV=production only after build. Serving API only.');
  }
}
// ──────────────────────────────────────────────────────

// Start server with Socket.IO — bind to 0.0.0.0 when PORT is set (Railway) or in production
const isRailwayOrProduction = process.env.PORT || process.env.NODE_ENV === 'production';
const HOST = isRailwayOrProduction ? '0.0.0.0' : undefined;
const httpServer = createServer(app);
const io = initSocket(httpServer);
app.set('io', io);
if (process.env.NODE_ENV === 'production') {
  const secret = process.env.JWT_SECRET || '';
  if (!secret || secret === 'your-secret-key-change-in-production') {
    console.warn('⚠️ JWT_SECRET not set or default — set JWT_SECRET in Railway (or .env) for production.');
  }
}

httpServer.listen(PORT, HOST, async () => {
  const hostLabel = HOST || 'localhost';
  console.log(`🚀 Server listening on http://${hostLabel}:${PORT} (NODE_ENV=${process.env.NODE_ENV || 'undefined'})`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📊 Health: http://localhost:${PORT}/api/health`);
    console.log(`💳 Payments: POST /api/payments/submit, GET /api/payments`);
  }
  // Load persisted data so farmer provisions, startup dashboard, payments and wallets survive restarts
  try {
    await initProvisionsFromStore();
    await initPaymentsFromStore();
    seedProvisionsFromList(getDemoProvisions());
    console.log('✅ Loaded persisted provisions and payments from file store');
  } catch (e) {
    console.warn('⚠️ Could not load persisted data:', e?.message || e);
  }
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_VISION_API_KEY || '').trim();
  const geminiModel = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
  if (geminiKey) {
    (async () => {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${encodeURIComponent(geminiKey)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'Reply OK' }] }] }),
        });
        if (res.ok) {
          console.log('✅ Gemini API ready for weight estimation');
        } else {
          const err = await res.json().catch(() => ({}));
          console.warn('⚠️ Gemini API check failed:', err?.error?.message || res.status);
        }
      } catch (e) {
        console.warn('⚠️ Gemini API check failed:', e.message);
      }
    })();
  } else {
    console.warn('⚠️ GEMINI_API_KEY not set — AI weight estimates will use fallback only');
  }
});

