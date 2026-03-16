# AgroScope deployment (Vercel + Render)

Deploy the **frontend** on [Vercel](https://vercel.com) and the **backend** (Express) on [Render](https://render.com), using the GitHub repo [Thoshith-A/AgroScope-Deployment](https://github.com/Thoshith-A/AgroScope-Deployment).

---

## 1. Push code to GitHub

If this project is not yet in the deployment repo:

```bash
cd "AgroScope_Final1-main"
git init
git remote add origin https://github.com/Thoshith-A/AgroScope-Deployment.git
git add .
git commit -m "AgroScope app: frontend (Vite) + backend (Express)"
git branch -M main
git push -u origin main
```

If the repo already has content, you may need to force-push once (e.g. `git push -u origin main --force`) or merge; use with care.

---

## 2. Deploy backend on Render

1. Go to [Render](https://render.com) and sign in (GitHub).
2. **New** → **Web Service**.
3. Connect **Thoshith-A/AgroScope-Deployment** (or your fork).
4. Configure:
   - **Name:** `agroscope-backend` (or any name).
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Free (or paid for always-on).
5. **Environment** (in Render dashboard): add variables from `server/.env.example`, at least:
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = your MongoDB Atlas connection string
   - `JWT_SECRET` = a long random secret (e.g. 32+ chars)
   - `DEEPSEEK_API_KEY`, `TAVILY_API_KEY`, `OPENCAGE_API_KEY` as needed
   - Optional: `GEMINI_API_KEY`, `GOOGLE_VISION_API_KEY`, `FRONTEND_URL` (your Vercel URL)
6. Deploy. Note the backend URL, e.g. `https://agroscope-backend.onrender.com`.

**Optional:** Use a [Blueprint](https://render.com/docs/blueprint-spec) instead: **New** → **Blueprint**, connect the same repo; Render will use the repo’s `render.yaml` (root directory `server`, build/start as above). You still must add environment variables in the Render dashboard.

---

## 3. Deploy frontend on Vercel

1. Go to [Vercel](https://vercel.com) and sign in (GitHub).
2. **Add New** → **Project** → import **Thoshith-A/AgroScope-Deployment** (or your fork).
3. Configure:
   - **Root Directory:** leave default (project root, where `package.json` and `vite.config.ts` are).
   - **Framework Preset:** Vite (auto-detected).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Environment Variables** (Vercel project settings):
   - `VITE_API_URL` = your Render backend URL, e.g. `https://agroscope-backend.onrender.com`  
     (no trailing slash)
   - Add any other `VITE_*` you use (e.g. `VITE_GOOGLE_MAPS_API_KEY`).
5. Deploy. Your app will be at e.g. `https://agroscope-xxx.vercel.app`.

The frontend is already configured to call the backend using `VITE_API_URL` (API and auth). Socket.IO will use the same URL when `VITE_API_URL` is set.

---

## 4. Optional: CORS and backend FRONTEND_URL

On Render, you can set:

- `FRONTEND_URL` = your Vercel URL (e.g. `https://agroscope-xxx.vercel.app`)

The backend already allows all origins; setting `FRONTEND_URL` is useful if you later restrict CORS to that origin.

---

## 5. Summary

| Part      | Host   | Repo root / dir | Build        | Start     | Env (main)                    |
|----------|--------|------------------|-------------|-----------|---------------------------------|
| Frontend | Vercel | repo root        | `npm run build` | —        | `VITE_API_URL` = Render URL     |
| Backend  | Render | `server`         | `npm install`  | `npm start` | `NODE_ENV`, `MONGODB_URI`, `JWT_SECRET`, API keys |

After both are deployed, set **Vercel** → **Settings** → **Environment Variables** → `VITE_API_URL` to your **Render** backend URL (e.g. `https://agroscope-backend.onrender.com`), then redeploy the frontend once so the variable is baked into the build.
