import express from 'express';
import cors from 'cors';
import { db_manager } from './database.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from the React app
const clientPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientPath));

// Auth middleware (simple token for now, expandable to OAuth)
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.headers.authorization;
    if (token === process.env.DASHBOARD_TOKEN || !process.env.DASHBOARD_TOKEN) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

import { client } from './bot.js';

app.get('/api/stats', (req, res) => {
    const data = db_manager.getLogs(1000); // Get all for count, or optimize later
    const stats = {
        uptime: process.uptime(),
        guilds: client.guilds.cache.size,
        users: client.users.cache.size,
        commandsRun: data.length,
    };
    res.json(stats);
});

app.get('/api/logs', (req, res) => {
    res.json(db_manager.getLogs(10));
});

app.get('/api/config', (req, res) => {
    res.json(db_manager.getConfig());
});

app.post('/api/config', authMiddleware, (req, res) => {
    const { key, value } = req.body;
    try {
        db_manager.updateConfig(key, value);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update config' });
    }
});

// All other GET requests not handled before will return the React app
app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
});

app.listen(port, () => {
    console.log(`Dashboard API and Bot running on port ${port}`);
});
