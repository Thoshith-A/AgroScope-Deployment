# AgroScope Deployment (Backend: Render, Frontend: Vercel)

This guide deploys your current architecture without rewriting:
- Frontend (React + Vite): Vercel
- Backend (Node + Express): Render
- Database: MongoDB Atlas

## 1. Backend Deploy on Render

1. Push latest code to GitHub.
2. In Render, click `New +` -> `Blueprint` and select your repo.
3. Render will read `render.yaml` and create service `agroscope-backend`.
4. Set these env vars in Render service settings:
   - `NODE_ENV=production`
   - `MONGODB_URI=...`
   - `JWT_SECRET=...`
   - `DEEPSEEK_API_KEY=...`
   - `TAVILY_API_KEY=...`
   - `OPENCAGE_API_KEY=...`
   - `FRONTEND_URL=https://<your-vercel-domain>.vercel.app`
5. Deploy and verify:
   - `https://<render-domain>/api/health`

## 2. Frontend Deploy on Vercel

1. In Vercel, import the same GitHub repository.
2. Framework preset: `Vite`.
3. Root directory: project root (`AgroScope_Final1`).
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add environment variable:
   - `VITE_API_URL=https://<render-domain>`
7. Deploy.

## 3. Frontend API Base

Frontend API calls use `VITE_API_URL`.

Set this in Vercel:
- `VITE_API_URL=https://<render-domain>`

No API rewrites are required when this value is set correctly.

## 4. Post-Deploy Smoke Test

1. Open frontend URL on Vercel.
2. Test login/register.
3. Test `Agro News Live` global + location feed.
4. Check backend logs in Render for any 4xx/5xx errors.
5. Confirm MongoDB connection message appears in Render logs.

## 5. Security

- Never commit `.env` files.
- Rotate API keys if they were ever exposed.
- Keep secrets only in Render/Vercel environment settings.
