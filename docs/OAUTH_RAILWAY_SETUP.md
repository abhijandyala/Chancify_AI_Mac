# 🔐 Google OAuth Setup for Railway

## ⚠️ Current Issue

The OAuth redirect URL logic has been fixed, but you need to set up environment variables on Railway.

---

## 📋 Steps to Fix OAuth on Railway

### **Step 1: Get Your Google OAuth Credentials**

If you haven't already created a Google OAuth app:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Set up OAuth consent screen if prompted
6. Create an OAuth 2.0 Client ID with:
   - **Application type:** Web application
   - **Name:** Chancify AI
   - **Authorized redirect URIs:**
     - `https://chancifyai.up.railway.app/api/auth/callback/google`
     - `http://localhost:3000/api/auth/callback/google` (for local dev)

7. Copy your **Client ID** and **Client Secret**

---

### **Step 2: Add Environment Variables to Railway**

1. Go to your Railway dashboard
2. Select your frontend service
3. Go to "Variables" tab
4. Add these environment variables:

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=271825853515-ji8bgnlsur2tel6p7gsgn7vn76drdnui.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
```

**Important:** Replace `your_actual_client_secret_here` with your actual client secret from Google Cloud Console.

---

### **Step 3: Redeploy**

After adding the environment variables, Railway will automatically redeploy. Or manually trigger a redeploy:

1. Go to "Deployments" tab
2. Click "Redeploy"

---

## 🧪 Testing

1. Visit your Railway URL: `https://chancifyai.up.railway.app`
2. Click "Continue with Google"
3. You should be redirected to Google's sign-in page
4. After signing in, you should be redirected back to the home page

---

## 🐛 Troubleshooting

### **Error: "redirect_uri_mismatch"**

**Cause:** The redirect URI in Google Cloud Console doesn't match Railway's URL.

**Fix:**
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add this authorized redirect URI:
   - `https://chancifyai.up.railway.app/api/auth/callback/google`

### **Error: "missing_config"**

**Cause:** Environment variables are not set on Railway.

**Fix:**
1. Double-check that `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
2. Make sure to redeploy after adding variables
3. Check Railway logs for error messages

### **OAuth works locally but not on Railway**

**Cause:** Local `.env` file has the variables, but Railway doesn't.

**Fix:**
1. Make sure you added the variables to Railway (not just locally)
2. Check that Railway is using the correct environment variables
3. Redeploy after adding variables

---

## ✅ Checklist

- [ ] Google OAuth app created in Google Cloud Console
- [ ] Authorized redirect URIs added (both localhost and Railway)
- [ ] Client ID and Secret copied
- [ ] Environment variables added to Railway
- [ ] Railway service redeployed
- [ ] OAuth tested on Railway URL

---

## 📝 Notes

- The `NEXT_PUBLIC_` prefix makes the variable accessible in the browser
- The client secret (`GOOGLE_CLIENT_SECRET`) should NOT have `NEXT_PUBLIC_` prefix (keep it server-only)
- Make sure the redirect URIs in Google Cloud Console exactly match your Railway URL
