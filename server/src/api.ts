import express from 'express';
import cors from 'cors';
import { db_manager } from './database.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { client, startBot } from './bot.js';

startBot();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from the React app
const clientPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientPath));

// Auth middleware for /api routes
app.use('/api', (req, res, next) => {
    // Public routes (if any)
    if (req.path === '/stats' || req.path === '/logs') {
        return next();
    }

    const auth = req.headers.authorization;
    if (auth !== process.env.DASHBOARD_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
});

app.get('/api/stats', (req, res) => {
    const data = db_manager.getLogs(1000);
    res.json({
        uptime: process.uptime(),
        guilds: client.guilds.cache.size,
        users: client.users.cache.size,
        commandsRun: data.length,
    });
});

app.get('/api/logs', (req, res) => {
    res.json(db_manager.getLogs(10));
});

// Auto-Mod Config Endpoints
app.get('/api/automod', (req, res) => {
    res.json(db_manager.getAutoModConfig());
});

app.post('/api/automod', (req, res) => {
    try {
        db_manager.updateAutoModConfig(req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update automod config' });
    }
});

// Welcome System Config Endpoints
app.get('/api/welcome', (req, res) => {
    res.json(db_manager.getWelcomeConfig());
});

app.post('/api/welcome', (req, res) => {
    try {
        db_manager.updateWelcomeConfig(req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update welcome config' });
    }
});

app.get('/api/violations', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    res.json(db_manager.getViolations(limit));
});

app.get('/api/warnings/:userId', (req, res) => {
    const { userId } = req.params;
    const hours = parseInt(req.query.hours as string) || 24;
    res.json(db_manager.getUserWarnings(userId, hours));
});

app.get('/api/config', (req, res) => {
    res.json(db_manager.getConfig());
});

app.post('/api/config', (req, res) => {
    const { key, value } = req.body;
    try {
        db_manager.updateConfig(key, value);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update config' });
    }
});

// All other GET requests return the React app
app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
});

app.listen(port, () => {
    console.log(`Dashboard API and Bot running on port ${port}`);
});
