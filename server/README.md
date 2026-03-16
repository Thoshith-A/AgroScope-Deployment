# AgroScope Backend Server

Backend server for AgroScope application with MongoDB Atlas authentication.

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. MongoDB Atlas Setup

1. Create a MongoDB Atlas account at [https://cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a new cluster (free tier is fine)
3. Create a database user:
   - Go to Database Access → Add New Database User
   - Create username and password (remember these!)
4. Whitelist your IP:
   - Go to Network Access → Add IP Address
   - Add `0.0.0.0/0` for development (allows all IPs)
   - Or add your specific IP for better security
5. Get your connection string:
   - Go to Clusters → Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<database>` with your database name (e.g., `agroscope`)

### 3. Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```

2. Edit `.env` and add your MongoDB Atlas connection string:
   - Get it from: [MongoDB Atlas](https://cloud.mongodb.com) → your cluster → **Connect** → **Connect your application** → copy the URI.
   - Replace `<password>` with your database user password. If the password contains `@`, `#`, or `%`, [URL-encode](https://www.w3schools.com/tags/ref_urlencode.asp) them (e.g. `@` → `%40`).
   - Example: `MONGODB_URI=mongodb+srv://myuser:mypass%40word@cluster0.xxxxx.mongodb.net/agroscope?retryWrites=true&w=majority`
   - **Test the connection:** from `server/` run: `npm run check-mongo`
   - If you see `ENOTFOUND` or `querySrv`: check the URI is copied exactly; ensure the cluster is not paused; try different network (e.g. disable VPN).
   - Optional for local dev: `MONGODB_URI=mongodb://localhost:27017/agroscope` (requires MongoDB installed locally).

### 4. Run the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will run on `http://localhost:5000`

## Optional: Start the ML Service (Python)

This service loads `crop_classification_model.pkl` and `matchmaking_model.pkl` and exposes HTTP endpoints consumed by the Node backend.

1) Create venv and install deps

   **If you see "No module named 'pandas'"** the existing `.venv` may point to a Python that is not installed on this machine. Recreate it:

   **Windows (PowerShell):**
   ```powershell
   cd server/ml
   .\setup_venv.ps1
   .\.venv\Scripts\Activate.ps1
   ```

   **Or manually (any OS):**
   ```bash
   cd server/ml
   python -m venv .venv
   . .venv/Scripts/activate   # Windows PowerShell: .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

2) Start service
```bash
uvicorn app:app --host 127.0.0.1 --port 8000
```

3) Configure backend (optional)
Set `ML_URL=http://127.0.0.1:8000` in `server/.env` to point Node to the ML service.

## Optional: Weight Estimator (Google Vision + DeepSeek)

The "Estimate Weight via Camera" feature uses Google Cloud Vision API then DeepSeek.

1. **Credentials** — use either:
   - **Service account:** Set `GOOGLE_APPLICATION_CREDENTIALS` in `server/.env` to the path of your Google Cloud service account JSON (e.g. `C:/Users/you/Downloads/your-key.json`).
   - **Or API key:** Set `GOOGLE_VISION_API_KEY` in `server/.env` to a Vision API key from [Google Cloud Console](https://console.cloud.google.com/apis/credentials).

2. **Google Cloud project:** Enable [Cloud Vision API](https://console.cloud.google.com/apis/library/vision.googleapis.com) and **enable billing** for the project (Vision free tier still requires a billing account to be linked): [Enable billing](https://console.cloud.google.com/billing/enable).

3. **DeepSeek:** Set `DEEPSEEK_API_KEY` in `server/.env` (get from [platform.deepseek.com](https://platform.deepseek.com)). Used by AgroGuide (Help chatbot) and price negotiation. **Restart the server** after adding or changing it.

4. **Test:** From `server/` run:
   ```bash
   node scripts/testVisionAuth.js
   ```
   If you see "OK: Vision API responded successfully", the pipeline is ready.

Endpoints:
- `GET /health`
- `POST /classify`
- `POST /match`

## API Endpoints

### POST /api/auth/register
Register a new user (farmer or startup)

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "farmer",
  "name": "John Doe"
}
```

For startup:
```json
{
  "email": "company@example.com",
  "password": "password123",
  "role": "startup",
  "company_name": "AgriTech Solutions"
}
```

**Response:**
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "farmer",
    "name": "John Doe"
  },
  "message": "Farmer account created successfully"
}
```

### POST /api/auth/login
Login with email and password

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "farmer",
    "name": "John Doe"
  },
  "message": "Login successful"
}
```

### GET /api/health
Health check endpoint

**Response:**
```json
{
  "status": "OK",
  "message": "AgroScope Backend Server is running",
  "timestamp": "2025-01-29T..."
}
```

## Database Schema

### User Model
- `email` (String, required, unique)
- `password` (String, required, hashed)
- `role` (String, required, enum: ['farmer', 'startup'])
- `name` (String, required if role is 'farmer')
- `company_name` (String, required if role is 'startup')
- `createdAt` (Date)
- `updatedAt` (Date)

## Security Notes

- Passwords are automatically hashed using bcrypt before saving
- JWT tokens expire after 7 days
- Change `JWT_SECRET` in production to a secure random string
- In production, restrict IP whitelist in MongoDB Atlas

