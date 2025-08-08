const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const app = express();
const PORT = process.env.PORT || 3000;

// Logging middleware
const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Query:', JSON.stringify(req.query, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  next();
};

// Security and rate limiting
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use(limiter);
app.use(logRequest);

// Use urlencoded with extended: false for Twilio compatibility
app.use(bodyParser.urlencoded({ extended: false, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.raw({ type: 'application/xml', limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Dynamic webhook forwarding
app.all('/webhook/:service', async (req, res) => {
  const service = req.params.service;
  const targetUrl = process.env[`${service.toUpperCase()}_WEBHOOK_URL`];
  if (!targetUrl) {
    return res.status(404).json({
      error: `Service ${service} not configured`,
      availableServices: Object.keys(process.env)
        .filter(key => key.endsWith('_WEBHOOK_URL'))
        .map(key => key.replace('_WEBHOOK_URL', '').toLowerCase())
    });
  }
  try {
    let body;
    let headers = { ...req.headers, 'User-Agent': req.get('User-Agent') || 'Railway-Proxy/1.0' };
    if (req.method !== 'GET') {
      if (req.is('application/x-www-form-urlencoded')) {
        body = new URLSearchParams(req.body).toString();
        headers['Content-Type'] = req.get('Content-Type') || 'application/x-www-form-urlencoded; charset=UTF-8';
      } else if (req.is('application/json')) {
        body = JSON.stringify(req.body);
        headers['Content-Type'] = req.get('Content-Type') || 'application/json';
      } else {
        body = req.body;
      }
    }
    delete headers.host;
    delete headers['content-length'];
    const requestData = { method: req.method, headers, body };
    console.log('Outgoing body:', body);
    const response = await fetch(targetUrl, requestData);
    const responseData = await response.text();
    res.status(response.status);
    response.headers.forEach((value, name) => {
      res.set(name, value);
    });
    res.send(responseData);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: 'Proxy forwarding failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Legacy Twilio webhook endpoint (backward compatibility)
app.post('/twilio-webhook', async (req, res) => {
  req.url = '/webhook/n8n';
  req.params = { service: 'n8n' };
  return app._router.handle(req, res);
});

// Current Twilio webhook endpoint
app.post('/whatsapp-webhook', async (req, res) => {
  req.url = '/webhook/n8n';
  req.params = { service: 'n8n' };
  return app._router.handle(req, res);
});

// Catch-all endpoint for debugging
app.all('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'GET /health',
      'POST /webhook/:service',
      'POST /twilio-webhook (legacy)'
    ],
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Railway Proxy Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Webhook endpoint: http://localhost:${PORT}/webhook/:service`);
  const services = Object.keys(process.env)
    .filter(key => key.endsWith('_WEBHOOK_URL'))
    .map(key => ({
      service: key.replace('_WEBHOOK_URL', '').toLowerCase(),
      url: process.env[key]
    }));
  if (services.length > 0) {
    console.log('\n📋 Configured webhook services:');
    services.forEach(({ service, url }) => {
      console.log(`   ${service}: ${url}`);
    });
  } else {
    console.log('\n⚠️  No webhook services configured. Set environment variables like N8N_WEBHOOK_URL');
  }
});
