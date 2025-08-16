#!/bin/bash

# MHP Reporting Portal - Railway Deployment Script
# This script helps you deploy your application to Railway

echo "🚀 MHP Reporting Portal - Railway Deployment Helper"
echo "================================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
else
    echo "✅ Railway CLI found"
fi

# Login to Railway
echo "\n🔐 Logging into Railway..."
railway login

# Create new project
echo "\n📦 Creating new Railway project..."
railway project create

# Deploy backend
echo "\n🔧 Deploying Backend (FastAPI)..."
cd backend
railway up
cd ..

# Deploy frontend
echo "\n🎨 Deploying Frontend (Next.js)..."
cd frontend
railway up
cd ..

echo "\n✅ Deployment initiated!"
echo "\n📋 Next Steps:"
echo "1. Go to https://railway.app/dashboard"
echo "2. Add PostgreSQL database to your project"
echo "3. Configure environment variables for both services"
echo "4. Update CORS origins with your Railway URLs"
echo "\n📖 For detailed instructions, see RAILWAY_DEPLOYMENT.md"

echo "\n🎉 Happy deploying!"