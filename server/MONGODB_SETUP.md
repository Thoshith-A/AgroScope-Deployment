# Fix MongoDB connection (MONGODB_URI)

If you see **`querySrv ENOTFOUND`** or **MongoDB Atlas connection error**, your `server/.env` has a URI that points to a hostname that no longer resolves (e.g. old cluster deleted or renamed).

## Steps to fix

1. **Open [MongoDB Atlas](https://cloud.mongodb.com)** and log in.

2. **Get a new connection string:**
   - Click **Database** → select your cluster (or create one: **Build a Database** → Free tier).
   - Click **Connect** on the cluster.
   - Choose **Connect your application** → **Drivers** (Node.js).
   - Copy the connection string (looks like `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/...`).

3. **Edit `server/.env`:**
   - Set `MONGODB_URI=` and paste the copied string.
   - Replace `<password>` with your **database user** password (not your Atlas account password).
   - If the password contains `@`, `#`, or `%`, URL-encode them: `@` → `%40`, `#` → `%23`, `%` → `%25`.

4. **Allow network access (if needed):**
   - In Atlas: **Network Access** → **Add IP Address** → add your current IP or `0.0.0.0/0` for development.

5. **Test:** From the `server/` folder run:
   ```bash
   npm run check-mongo
   ```
   You should see: `✅ Connected to MongoDB successfully.`

6. **Restart the server:** Stop and run `npm run dev` again.

The app works without MongoDB for many features (AgroGuide, health, etc.), but **login, profile, orders, and provisions** need a working database.
