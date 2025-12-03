# 🚂 Chancify AI - Railway Setup Guide

## Your Configuration
- **Frontend Domain**: `chancifyaipresidential.up.railway.app`
- **Supabase Project**: `vwvqfellrhxznesaifwe`
- **Google OAuth**: Configured ✅
- **OpenAI API**: Configured ✅

---

## Step 1: Create PostgreSQL Database on Railway

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Open your project
3. Click **"+ New"** → **"Database"** → **"PostgreSQL"**
4. Wait for it to provision (takes ~30 seconds)
5. Click on the PostgreSQL service
6. Go to **"Variables"** tab
7. **Copy these values** (you'll need them):
   - `DATABASE_URL` (internal - for Railway services)
   - `DATABASE_PUBLIC_URL` (external - for local development)

**⚠️ IMPORTANT**: After you create PostgreSQL, tell me the `DATABASE_PUBLIC_URL` so I can update your local `.env` file!

---

## Step 2: Create Backend Service on Railway

1. In your Railway project, click **"+ New"** → **"GitHub Repo"**
2. Select `abhijandyala/Chancify_AI_Mac`
3. Go to **"Settings"** tab:
   - **Root Directory**: Leave empty (uses root)
   - **Watch Paths**: `/backend/**`
4. Go to **"Variables"** tab and add these:

### Backend Environment Variables (Copy-Paste into Railway)

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
SUPABASE_URL=https://vwvqfellrhxznesaifwe.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnFmZWxscmh4em5lc2FpZndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNzU2NjQsImV4cCI6MjA3NTg1MTY2NH0.TBYg6XEy1cmsPePkT2Q5tSSDcEqi0AWNCTt7pGT2ZBc
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnFmZWxscmh4em5lc2FpZndlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDI3NTY2NCwiZXhwIjoyMDc1ODUxNjY0fQ.zVtdMf9Z5gklqfmkjUdMeALE3AGqVlGz1efoNHqSiK4
SECRET_KEY=chancify-ai-prod-secret-key-2024-super-secure-random
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
FRONTEND_URL=https://chancifyaipresidential.up.railway.app
OPENAI_API_KEY=your-openai-api-key-here
ENVIRONMENT=production
DEBUG=false
```

**Note**: `${{Postgres.DATABASE_URL}}` is Railway's syntax to reference the PostgreSQL service!

---

## Step 3: Get Backend URL

After backend deploys:
1. Click on backend service → **"Settings"** → **"Domains"**
2. Click **"Generate Domain"** or use custom domain
3. Copy the URL (e.g., `https://chancify-backend-xxx.up.railway.app`)

**⚠️ Tell me this URL so I can update the frontend config!**

---

## Step 4: Create Frontend Service on Railway

1. Click **"+ New"** → **"GitHub Repo"** (same repo)
2. Go to **"Settings"**:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
3. Set domain to: `chancifyaipresidential.up.railway.app`
4. Go to **"Variables"** tab and add:

### Frontend Environment Variables

```
NEXT_PUBLIC_API_URL=https://YOUR-BACKEND-URL.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://vwvqfellrhxznesaifwe.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnFmZWxscmh4em5lc2FpZndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNzU2NjQsImV4cCI6MjA3NTg1MTY2NH0.TBYg6XEy1cmsPePkT2Q5tSSDcEqi0AWNCTt7pGT2ZBc
NEXTAUTH_URL=https://chancifyaipresidential.up.railway.app
NEXTAUTH_SECRET=chancify-nextauth-secret-2024-random-32-chars
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

---

## Step 5: Update Google OAuth Redirect URIs

Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Your OAuth Client

Add these **Authorized redirect URIs**:
```
https://chancifyaipresidential.up.railway.app/api/auth/callback/google
https://chancifyaipresidential.up.railway.app/auth/callback
http://localhost:3000/api/auth/callback/google
http://localhost:3000/auth/callback
```

Add these **Authorized JavaScript origins**:
```
https://chancifyaipresidential.up.railway.app
http://localhost:3000
```

---

## Step 6: Local Development Setup

To run locally with the Railway database:

1. Copy template to .env:
```bash
cp backend/env.template backend/.env
cp frontend/env.template frontend/.env.local
```

2. Update `backend/.env` with `DATABASE_PUBLIC_URL` from Railway
3. Update `frontend/.env.local` with backend URL

4. Start backend:
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

5. Start frontend:
```bash
cd frontend
npm install
npm run dev
```

---

## Checklist

- [ ] Created PostgreSQL on Railway
- [ ] Created Backend service with all env vars
- [ ] Got backend URL
- [ ] Created Frontend service with all env vars
- [ ] Set frontend domain to `chancifyaipresidential.up.railway.app`
- [ ] Updated Google OAuth redirect URIs
- [ ] Tested health endpoint: `https://BACKEND-URL/api/health`
- [ ] Tested frontend loads
- [ ] Tested Google login works

---

## Troubleshooting

### Backend won't start
- Check logs in Railway
- Verify all environment variables are set
- Make sure DATABASE_URL is linked to PostgreSQL

### Database tables not created
- Tables auto-create on first startup
- Check logs for "Database tables created/verified successfully"

### CORS errors
- Verify FRONTEND_URL matches your actual frontend domain
- Check browser console for actual error

### Google OAuth fails
- Verify redirect URIs are exactly correct (no trailing slashes)
- Make sure GOOGLE_CLIENT_SECRET is set in frontend env vars

---

## Need Help?

After completing each step, tell me:
1. Your PostgreSQL `DATABASE_PUBLIC_URL`
2. Your backend service URL
3. Any errors you see

I'll help you update the remaining config!

