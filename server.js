const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse form data from Twilio
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'Twilio Webhook Proxy is running! 🚀',
        purpose: 'Fixes n8n Cloud Content-Type issues with Twilio WhatsApp webhooks',
        timestamp: new Date().toISOString(),
        endpoints: {
            webhook: 'POST /whatsapp-webhook',
            health: 'GET /'
        },
        flow: 'Twilio → Railway Proxy → n8n Cloud → WhatsApp Response'
    });
});

// Main webhook endpoint that Twilio will call
app.post('/whatsapp-webhook', async (req, res) => {
    try {
        console.log('📱 Received webhook from Twilio:', {
            From: req.body.From,
            Body: req.body.Body,
            MessageSid: req.body.MessageSid,
            timestamp: new Date().toISOString()
        });
        
        // Forward the exact same request to n8n workflow
        const n8nResponse = await axios.post(
            process.env.N8N_WEBHOOK_URL || 'https://anshpatidar21.app.n8n.cloud/webhook/whatsapp-webhook',
            req.body,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 30000 // 30 second timeout
            }
        );
        
        console.log('✅ Successfully forwarded to n8n workflow');
        console.log('📤 n8n will handle WhatsApp response via Twilio API');
        
        // Return proper TwiML XML response to Twilio (fixes Content-Type issue)
        res.set('Content-Type', 'application/xml');
        res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
        
    } catch (error) {
        console.error('❌ Error forwarding to n8n:', error.message);
        
        // Always return valid TwiML to prevent Twilio errors
        res.set('Content-Type', 'application/xml');
        res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }
});

// Handle unknown routes
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        hint: 'Use POST /whatsapp-webhook for Twilio webhooks',
        availableEndpoints: {
            webhook: 'POST /whatsapp-webhook',
            health: 'GET /'
        }
    });
});

app.listen(PORT, () => {
    console.log('🚀 Twilio webhook proxy server started');
    console.log('📡 Listening on port:', PORT);
    console.log('🔗 Configure Twilio webhook to: https://your-railway-domain.up.railway.app/whatsapp-webhook');
    console.log('🎯 Forwards requests to:', process.env.N8N_WEBHOOK_URL || 'https://anshpatidar21.app.n8n.cloud/webhook/whatsapp-webhook');
    console.log('✨ This fixes the n8n Content-Type issue for Twilio WhatsApp webhooks');
});
