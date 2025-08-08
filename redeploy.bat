@echo off
echo 🚀 Deploying updated Railway proxy...

REM Set environment variables
railway variables set N8N_WEBHOOK_URL="https://anshpatidar21app.n8n.cloud/webhook/whatsapp-webhook"
railway variables set NODE_ENV="production"
railway variables set RATE_LIMIT_WINDOW="60000"
railway variables set RATE_LIMIT_MAX="100"
railway variables set ALLOWED_ORIGINS="*"

echo ✅ Environment variables set

REM Deploy
railway up --detach

echo 🎉 Deployment initiated!
echo 📊 Check status at: https://railway.app/dashboard
echo.
echo 🔗 Your webhook URL will remain:
echo    https://twilio-webhook-proxy-2-production.up.railway.app/whatsapp-webhook

pause
