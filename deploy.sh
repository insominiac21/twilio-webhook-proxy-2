#!/bin/bash
# Railway Deployment Script

echo "🚀 Deploying Enhanced Railway Proxy Server..."

# Install Railway CLI if not exists
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Login to Railway (if not already logged in)
echo "🔐 Checking Railway authentication..."
railway login

# Deploy to Railway
echo "🚢 Deploying to Railway..."
railway up

echo "✅ Deployment completed!"
echo "🔗 Your webhook URL will be: https://[your-app-name].up.railway.app/webhook/n8n"
echo "📋 Don't forget to update your Twilio webhook URL!"
