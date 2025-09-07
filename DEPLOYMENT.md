# Backend Deployment Instructions for Vercel

## Quick Fix for CORS Issues

The backend has been updated with an improved CORS configuration that automatically allows:
- All localhost origins for development
- The main production URL: `https://jobhunt-client-eta.vercel.app`
- All Vercel preview deployments matching patterns:
  - `https://jobhunt-client-*.vercel.app`
  - `https://*-karan-prajapats-projects.vercel.app`

## Deployment Steps

### 1. Push Changes to GitHub
```bash
git add .
git commit -m "Fix CORS configuration for multiple origins"
git push origin main
```

### 2. Deploy to Vercel

#### Option A: Automatic Deployment
If your repository is connected to Vercel, it will automatically deploy when you push to main.

#### Option B: Manual Deployment via CLI
```bash
cd "E:\New folder\jobhunt.server"
vercel --prod
```

### 3. Set Environment Variables on Vercel

Go to your Vercel project dashboard → Settings → Environment Variables and add:


### 4. Redeploy After Setting Environment Variables

After setting environment variables, redeploy:
1. Go to Deployments tab
2. Click on the three dots menu of your latest deployment
3. Select "Redeploy"

## Testing CORS

After deployment, test CORS is working:

1. Open your frontend application
2. Open browser Developer Tools → Network tab
3. Make a request to the backend
4. Check that the response headers include:
   - `Access-Control-Allow-Origin: [your-frontend-url]`
   - `Access-Control-Allow-Credentials: true`

## Troubleshooting

### Issue: Still getting CORS errors
1. Check that the backend is deployed with the new corsConfig.js file
2. Verify environment variables are set correctly on Vercel
3. Clear your browser cache
4. Check the browser console for the exact origin being blocked

### Issue: 401 Unauthorized errors
1. Ensure cookies are being sent with credentials
2. Check that JWT_SECRET is the same in both development and production

### Issue: Database connection errors
1. Verify MONGO_URI is set correctly
2. Check MongoDB Atlas whitelist includes Vercel IP addresses (or allow from anywhere)

## Security Notes

⚠️ **Important**: The current `.env` file contains sensitive credentials. Please:
1. Change the JWT_SECRET to a new secure value
2. Consider rotating database passwords
3. Never commit `.env` files to version control
4. Add `.env` to `.gitignore` if not already done
