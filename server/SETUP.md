# Quick Setup Guide

## Step 1: Get MongoDB Atlas Connection String

1. **Sign up/Login**: Go to [https://cloud.mongodb.com](https://cloud.mongodb.com)

2. **Create a Cluster**:
   - Click "Build a Database"
   - Choose FREE tier (M0)
   - Select your preferred region
   - Create cluster

3. **Create Database User**:
   - Go to "Database Access" (left sidebar)
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Create username and password
   - **IMPORTANT**: Save these credentials!
   - Click "Add User"

4. **Whitelist IP Address**:
   - Go to "Network Access" (left sidebar)
   - Click "Add IP Address"
   - For development: Click "Allow Access from Anywhere" (adds 0.0.0.0/0)
   - Click "Confirm"

5. **Get Connection String**:
   - Go to "Clusters" (left sidebar)
   - Click "Connect" button on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - It looks like: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   - **Replace** `<username>` with your database username
   - **Replace** `<password>` with your database password
   - **Add database name** before the `?`: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/agroscope?retryWrites=true&w=majority`

## Step 2: Configure Environment Variables

1. In the `server` folder, create a file named `.env`
2. Copy this content and fill in your values:

```env
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/agroscope?retryWrites=true&w=majority
JWT_SECRET=change-this-to-a-random-secret-key-in-production
PORT=5000
NODE_ENV=development
```

## Step 3: Start the Backend Server

```bash
cd server
npm run dev
```

You should see:
```
✅ Connected to MongoDB Atlas successfully
🚀 Server is running on http://localhost:5000
```

## Step 4: Test the Connection

Open your browser and go to:
- `http://localhost:5000/api/health`

You should see a JSON response with status "OK".

## Troubleshooting

**Connection Error?**
- Check that your MongoDB username/password are correct in the connection string
- Verify your IP is whitelisted in Network Access
- Make sure you added the database name in the connection string

**Port Already in Use?**
- Change PORT in `.env` to a different number (e.g., 5001)
- Or stop the process using port 5000

