# Railway Deployment Guide for MHP Reporting Portal

This guide will help you deploy your MHP Reporting Portal to Railway with both backend (FastAPI) and frontend (Next.js) services.

## Prerequisites

1. Railway account (sign up at [railway.app](https://railway.app))
2. GitHub repository with your code (already done ✅)
3. Railway CLI (optional but recommended)

## Deployment Steps

### Step 1: Install Railway CLI (Optional)

```bash
npm install -g @railway/cli
railway login
```

### Step 2: Create a New Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Empty Project" (we'll add services manually)
4. Give your project a name like "MHP Reporting Portal"

### Step 3: Deploy Backend (FastAPI)

1. **Add PostgreSQL Database:**
   - In your Railway project dashboard
   - Click "+ New Service"
   - Select "Database" → "PostgreSQL"
   - Railway will automatically create a PostgreSQL instance

2. **Deploy Backend Service:**
   - Click "+ New Service"
   - Select "GitHub Repo"
   - Choose your `MHP-Reporting-Portal` repository
   - **IMPORTANT**: Set **Root Directory** to: `backend`
   - **IMPORTANT**: Set **Service Name** to: `backend` or `api`
   - Railway will automatically detect the FastAPI app using Nixpacks

3. **Configure Backend Environment Variables:**
   Go to your backend service → Variables tab and add:
   ```
   DATABASE_URL=postgresql+psycopg2://postgres:password@host:port/database
   SECRET_KEY=your-super-secret-jwt-key-here
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your@gmail.com
   SMTP_PASSWORD=your_app_password
   MAIL_FROM_NAME=MHP Portal
   SEND_EMAIL_TO=recipient@example.com
   ```
   
   **Important:** Railway will automatically provide the `DATABASE_URL` from your PostgreSQL service. You can find it in the PostgreSQL service variables.

### Step 4: Deploy Frontend (Next.js)

1. **Add Frontend Service:**
   - Click "+ New Service"
   - Select "GitHub Repo"
   - Choose your `MHP-Reporting-Portal` repository again
   - **IMPORTANT**: Set **Root Directory** to: `frontend`
   - **IMPORTANT**: Set **Service Name** to: `frontend` or `web`
   - Railway will automatically detect the Next.js app using Nixpacks

2. **Configure Frontend Environment Variables:**
   Go to your frontend service → Variables tab and add:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-service.railway.app
   ```
   
   Replace `your-backend-service.railway.app` with your actual backend service URL from Railway.

### Step 5: Update CORS Settings

After deployment, update your backend's CORS origins in `backend/app/main.py`:

```python
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://your-frontend-service.railway.app",  # Add your Railway frontend URL
]
```

### Step 6: Custom Domains (Optional)

1. Go to each service → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed by Railway

## Service URLs

After deployment, you'll have:
- **Backend API**: `https://your-backend-service.railway.app`
- **Frontend App**: `https://your-frontend-service.railway.app`
- **Database**: Accessible only from your Railway services

## Environment Variables Reference

### Backend Variables
| Variable | Description | Example |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Auto-provided by Railway |
| `SECRET_KEY` | JWT secret key | `your-super-secret-key` |
| `SMTP_HOST` | Email server host | `smtp.gmail.com` |
| `SMTP_PORT` | Email server port | `587` |
| `SMTP_USER` | Email username | `your@gmail.com` |
| `SMTP_PASSWORD` | Email password/app password | `your_app_password` |
| `MAIL_FROM_NAME` | Sender name | `MHP Portal` |
| `SEND_EMAIL_TO` | Default recipient | `admin@example.com` |

### Frontend Variables
| Variable | Description | Example |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://your-backend.railway.app` |

## Troubleshooting

### Common Issues

1. **Nixpacks Build Failed Error:**
   - **Problem**: "Nixpacks was unable to generate a build plan for this app"
   - **Solution**: Make sure you set the **Root Directory** correctly:
     - Backend service: Root Directory = `backend`
     - Frontend service: Root Directory = `frontend`
   - **DO NOT** deploy from the root directory of the repository

2. **Database Connection Issues:**
   - Ensure `DATABASE_URL` is correctly set
   - Check PostgreSQL service is running

3. **CORS Errors:**
   - Add your Railway frontend URL to CORS origins
   - Redeploy backend after updating CORS

4. **Build Failures:**
   - Check build logs in Railway dashboard
   - Ensure all dependencies are in requirements.txt/package.json

### Viewing Logs

1. Go to your service in Railway dashboard
2. Click on "Deployments" tab
3. Click on the latest deployment to view logs

## Cost Estimation

- **Hobby Plan**: $5/month per service (after free tier)
- **Free Tier**: $5 credit per month
- **Database**: Included in service cost

## Next Steps

1. Set up monitoring and alerts
2. Configure custom domains
3. Set up CI/CD for automatic deployments
4. Add environment-specific configurations

---

**Need Help?** Check Railway's [documentation](https://docs.railway.app) or their Discord community.