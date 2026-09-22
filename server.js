import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import webhookRoutes from './routes/webhook.js';
import apiRoutes from './routes/api.js';
import { checkAndSendAppointmentReminders } from './services/reminderService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Live diagnostic log store for remote inspection
const logStore = [];
const maxLogs = 150;
function captureLog(type, args) {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
    const timestamp = new Date().toISOString();
    logStore.push(`[${timestamp}] [${type}] ${message}`);
    if (logStore.length > maxLogs) logStore.shift();
}
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...args) => { captureLog('INFO', args); originalLog(...args); };
console.error = (...args) => { captureLog('ERROR', args); originalError(...args); };
console.warn = (...args) => { captureLog('WARN', args); originalWarn(...args); };

const app = express();
const PORT = process.env.PORT || 10000;


app.use(cors());
app.use((req, res, next) => {
    if (req.url.includes('\\') || req.url.includes('%5C')) {
        console.warn(`[URL Normalizer] Sanitizing backslash in request URL: ${req.url}`);
        req.url = req.url.replace(/\\|%5C/gi, '/');
    }
    next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Remote diagnostics endpoint
app.get('/logs', (req, res) => {
    res.type('text/plain').send(logStore.join('\n'));
});

// Meta & AutobotChat WhatsApp Webhook endpoints (Support /api/webhook, /webhook, /api/v1/webhook and direct /)
app.use('/api/webhook', webhookRoutes);
app.use('/webhook', webhookRoutes);
app.use('/api/v1/webhook', webhookRoutes);
app.post('/', webhookRoutes);

// Admin REST APIs
app.use('/api', apiRoutes);

// Serve public and compiled assets
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'dist')));

// Interactive Calendar & IST Clock Slot Picker Webview
app.get('/select-slot', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'select-slot.html'));
});

// Root Landing / Status Page
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
    }
    res.send(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>AMPLR Health - Bot Server</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b132b; color: #f8fafc; padding: 40px; text-align: center; }
                    .card { max-width: 600px; margin: 30px auto; padding: 25px; background: #1c2541; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.4); text-align: left; }
                    .badge { background: #10b981; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-weight: bold; font-size: 14px; }
                    code { background: #3a506b; padding: 3px 8px; border-radius: 6px; color: #6fffe9; font-size: 14px; }
                    a { color: #6fffe9; text-decoration: none; }
                </style>
            </head>
            <body>
                <h1 style="color: #6fffe9;">🏥 AMPLR HEALTH WhatsApp Bot Server</h1>
                <p>Status: <span class="badge">LIVE &amp; READY 24/7</span></p>
                <div class="card">
                    <h3 style="margin-top: 0; color: #5bc0be;">🔗 Active Endpoints:</h3>
                    <p>📲 <strong>Webhook URL:</strong> <code>/api/webhook</code></p>
                    <p>🩺 <strong>Health Check:</strong> <a href="/health"><code>/health</code></a></p>
                    <p>📊 <strong>Live Stats:</strong> <a href="/api/stats"><code>/api/stats</code></a></p>
                    <p>📜 <strong>Server Logs:</strong> <a href="/logs"><code>/logs</code></a></p>
                </div>
            </body>
        </html>
    `);
});

import https from 'https';

// Keep-alive tracking stats
const keepAliveStats = {
    totalPings: 0,
    lastPingAt: null,
    lastStatus: null
};

app.get('/health', (req, res) => {
    res.json({
        status: 'UP',
        service: 'AMPLR Health WhatsApp Bot & ERP Backend',
        uptimeSeconds: Math.floor(process.uptime()),
        keepAlive: keepAliveStats,
        timestamp: new Date().toISOString()
    });
});


const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`\n======================================================`);
    console.log(`🏥 AMPLR Health WhatsApp Bot Server Running on Port ${PORT}`);
    console.log(`📲 Webhook Endpoint URL: /api/webhook`);
    console.log(`📊 Admin REST API URL: /api/stats`);
    console.log(`======================================================\n`);

    // ── KEEP-ALIVE PING (Render Free Tier 24/7 Awake) ───────────────────────────
    // Render free instances sleep after 15 minutes of inactivity.
    // Self-pinging every 5 minutes ensures it NEVER sleeps or slows down.
    const SELF_URL = (
        process.env.RENDER_EXTERNAL_URL || 
        process.env.APP_URL || 
        'https://amplr-health-care-chatbot.onrender.com'
    ).replace(/\/$/, '');
    
    if (SELF_URL) {
        function performKeepAlivePing() {
            const pingUrl = `${SELF_URL}/health`;
            const req = https.get(pingUrl, (res) => {
                keepAliveStats.totalPings++;
                keepAliveStats.lastPingAt = new Date().toISOString();
                keepAliveStats.lastStatus = res.statusCode;
                console.log(`[Keep-Alive] 🔄 Self-ping #${keepAliveStats.totalPings} to ${pingUrl} → ${res.statusCode}`);
            });

            req.on('error', (err) => {
                keepAliveStats.lastPingAt = new Date().toISOString();
                keepAliveStats.lastStatus = `Error: ${err.message}`;
                console.warn(`[Keep-Alive] ⚠️ Self-ping failed: ${err.message}`);
            });

            req.setTimeout(10000, () => {
                req.destroy();
            });
        }

        // Initial ping 15 seconds after boot to confirm connectivity
        setTimeout(performKeepAlivePing, 15 * 1000);

        // Recurring ping every 5 minutes (well before Render's 15-minute inactivity limit)
        setInterval(performKeepAlivePing, 5 * 60 * 1000);
        console.log(`[Keep-Alive] ✅ Automatic 24/7 Keep-Alive active for ${SELF_URL} (Pinging every 5 min)`);
    }

    // ── AUTOMATED APPOINTMENT REMINDER RUNNER ──────────────────────────────────
    // Runs an initial check 10 seconds after server start, then every 5 minutes.
    setTimeout(() => {
        checkAndSendAppointmentReminders().catch(e => console.warn('[Reminder Init Error]:', e.message));
    }, 10 * 1000);

    const REMINDER_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
    setInterval(() => {
        checkAndSendAppointmentReminders().catch(e => console.warn('[Reminder Interval Error]:', e.message));
    }, REMINDER_INTERVAL_MS);
    console.log(`[Reminders] ⏰ Automated 24h & 2h WhatsApp Appointment Reminder Engine Active (Checking every 5m)`);
});

export default app;





