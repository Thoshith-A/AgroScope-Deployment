/**
 * Test MongoDB connection using server/.env.
 * Run from server/: node scripts/check-mongo.js
 * Helps fix MONGODB_URI (wrong host, placeholder, or password encoding).
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const uri = (process.env.MONGODB_URI || '').trim();

function hint(msg) {
  console.log('\n💡 ' + msg);
}

async function main() {
  console.log('MongoDB connection check (using server/.env)\n');

  if (!uri) {
    console.error('❌ MONGODB_URI is not set in server/.env');
    hint('Add: MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.xxxxx.mongodb.net/agroscope?retryWrites=true&w=majority');
    hint('Get the URI from: https://cloud.mongodb.com → your cluster → Connect → Connect your application');
    process.exit(1);
  }

  if (uri.includes('your-') || uri.includes('password') && !uri.includes('@')) {
    console.error('❌ MONGODB_URI looks like a placeholder. Replace with your real Atlas connection string.');
    hint('Copy the URI from MongoDB Atlas and replace <password> with your actual password (URL-encode special chars).');
    process.exit(1);
  }

  console.log('URI format:', uri.startsWith('mongodb+srv://') ? 'mongodb+srv (Atlas)' : uri.startsWith('mongodb://') ? 'mongodb (standard)' : 'unknown');
  console.log('Attempting to connect...\n');

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log('✅ Connected to MongoDB successfully.');
    const admin = mongoose.connection.db.admin();
    const status = await admin.ping();
    console.log('   Ping:', status.ok === 1 ? 'OK' : status);
    await mongoose.disconnect();
    console.log('   Disconnected.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    if (err.message.includes('ENOTFOUND') || err.message.includes('querySrv')) {
      hint('DNS could not resolve the Atlas host. Fix: In MongoDB Atlas go to your Cluster → Connect → Connect your application → copy the connection string again (the cluster hostname may have changed). Paste it into server/.env as MONGODB_URI.');
      hint('If you use a VPN or corporate DNS, try disabling VPN or use mobile hotspot to rule out DNS blocking.');
    }
    if (err.message.includes('auth failed') || err.message.includes('Authentication')) {
      hint('Wrong username or password. In the URI, replace <password> with your DB user password; if it has special characters (e.g. @ #), URL-encode them (e.g. @ → %40).');
    }
    if (err.message.includes('IP')) {
      hint('Your IP is not allowed. In Atlas: Network Access → Add IP Address → add your current IP or 0.0.0.0/0 for development.');
    }
    process.exit(1);
  }
}

main();
