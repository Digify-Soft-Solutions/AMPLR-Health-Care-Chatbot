import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import webhookRoutes from './routes/webhook.js';
import apiRoutes from './routes/api.js';

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
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Remote diagnostics endpoint
app.get('/logs', (req, res) => {
    res.type('text/plain').send(logStore.join('\n'));
});

// Meta & AutobotChat WhatsApp Webhook endpoints (Support /api/webhook, /webhook, /api/v1/webhook)
app.use('/api/webhook', webhookRoutes);
app.use('/webhook', webhookRoutes);
app.use('/api/v1/webhook', webhookRoutes);

// Admin REST APIs
app.use('/api', apiRoutes);

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

app.get('/health', (req, res) => {
    res.json({
        status: 'UP',
        service: 'AMPLR Health WhatsApp Bot & ERP Backend',
        timestamp: new Date().toISOString()
    });
});


app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🏥 Health Saathi WhatsApp Bot Server Running on Port ${PORT}`);
    console.log(`📲 Meta Webhook Verification URL: http://localhost:${PORT}/api/webhook`);
    console.log(`📊 Admin REST API URL: http://localhost:${PORT}/api/stats`);
    console.log(`======================================================\n`);
});
