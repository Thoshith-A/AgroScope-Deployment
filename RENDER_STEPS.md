# Render deployment – step by step

Use **one** of these: **Option A (Blueprint)** or **Option B (manual Web Service)**.

---

## Option A: Deploy with Blueprint (after fix)

1. Open **Render** → [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**.
2. Connect **GitHub** and choose repo **Thoshith-A/AgroScope-Deployment**.
3. **Blueprint Name:** e.g. `agroscope`.
4. **Branch:** `main`.
5. **Blueprint Path:** `render.yaml`.
6. Click **Apply** (or **Retry** if it previously failed).
7. If it still says "A Blueprint file was found, but there was an issue", use **Option B** below.
8. After the Blueprint is applied, open the new **agroscope-backend** service → **Environment** and add:
   - `MONGODB_URI` (your MongoDB Atlas connection string)
   - `JWT_SECRET` (long random string, 32+ chars)
   - Any API keys you use: `DEEPSEEK_API_KEY`, `TAVILY_API_KEY`, `OPENCAGE_API_KEY`, etc.  
   See `server/.env.example` for the full list.
9. **Save** and let the service **deploy**. Copy the service URL (e.g. `https://agroscope-backend.onrender.com`).

---

## Option B: Deploy without Blueprint (manual Web Service)

If the Blueprint keeps failing, create the backend manually:

1. **Render** → [dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service** (not Blueprint).
2. Connect **GitHub** and select **Thoshith-A/AgroScope-Deployment**.
3. Configure:
   - **Name:** `agroscope-backend`
   - **Region:** choose one (e.g. Oregon).
   - **Branch:** `main`
   - **Root Directory:** type `server` (important).
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Free (or paid if you want always-on).
4. Click **Advanced** and add **Environment Variables**:
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = your MongoDB Atlas URI
   - `JWT_SECRET` = a long random secret (32+ characters)
   - Add others from `server/.env.example` as needed (e.g. `DEEPSEEK_API_KEY`, `TAVILY_API_KEY`).
5. Click **Create Web Service**.
6. Wait for the first deploy to finish. Copy the service URL (e.g. `https://agroscope-backend.onrender.com`).

---

## Next: Point frontend to the backend

1. In **Vercel**, open your project (frontend) → **Settings** → **Environment Variables**.
2. Add:
   - **Name:** `VITE_API_URL`
   - **Value:** your Render backend URL, e.g. `https://agroscope-backend.onrender.com` (no trailing slash).
3. **Redeploy** the Vercel project so the new variable is used in the build.

After that, the Vercel app will use the Render backend.
