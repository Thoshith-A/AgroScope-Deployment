# 🌾 AgroScope — AI-Powered Crop Waste Marketplace

AgroScope is India's first AI-powered platform that turns crop waste into revenue and carbon credits. It connects farmers with startups and industrial buyers across 10 Indian cities.

## 🚀 Live Demo
**[agroscope.up.railway.app](https://agroscope.up.railway.app)**

Demo accounts:
- Farmer: `f1@gmail.com` / `farmer`
- Startup: `east@argo` / `east@argo`

## ✨ Features
- 🤖 AI Price Negotiation (DeepSeek)
- 📊 30-Day Supply Forecast
- 🛰️ Satellite Crop Monitor (Leaflet + NDVI)
- ⚖️ AI Weight Estimator (Puter.js + GPT-4o)
- 🌱 Carbon Credit Calculator (IPCC formulas)
- 🪙 Dual Wallet System (AgroCredits + AgroCoins)
- 🌐 50-Language Support with Voice Input/Output
- 📰 Live Agro News (Tavily API)
- 🌦️ Weather Forecast (Open-Meteo)
- 💬 AgroGuide AI Chatbot (Navigation assistant)

## 🛠️ Tech Stack
**Frontend:** React 18, TypeScript, Vite 5, Tailwind CSS, Framer Motion, Recharts, Leaflet, shadcn/ui

**Backend:** Node.js, Express, MongoDB, JWT, DeepSeek API

**APIs:** DeepSeek, Tavily, Open-Meteo, Puter.js (GPT-4o)

## 📦 Installation

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free)
- DeepSeek API key

### Setup
```bash
# Clone the repo
git clone https://github.com/Thoshith-A/AgroScope_Final1.git
cd AgroScope_Final1

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your API keys
```

### Run Locally
```bash
# Terminal 1 — Backend (port 5000)
cd server
npm start

# Terminal 2 — Frontend (port 5173)
cd ..
npm run dev
```

Open: http://localhost:5173

## 🌍 Deployment
See:
- [DEPLOYMENT_RENDER_VERCEL.md](./DEPLOYMENT_RENDER_VERCEL.md) for Backend (Render) + Frontend (Vercel)
- [DEPLOYMENT.md](./DEPLOYMENT.md) for Railway deployment guide

## 📐 Carbon Formulas
- Weight: `W = A × Y × RPR`
- CO₂ saved: `CO₂ = W × 1.5` (IPCC)
- Trees: `Trees = (CO₂ × 1000) / 20` (FAO)
- Credits: `Credits = CO₂ × 0.1` (Verra VCS)
- AgroCoins: `1000 AgroCredits = 1 Agro Coin`

## 🏙️ Supported Cities
Chennai · Mumbai · Delhi · Bengaluru · Hyderabad · Kolkata · Pune · Ahmedabad · Jaipur · Surat

## 📄 License
MIT License — © 2026 AgroScope Team
