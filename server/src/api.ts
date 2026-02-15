import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { db_manager } from './database.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { client, startBot } from './bot.js';
import { PermissionsBitField } from 'discord.js';

startBot();

import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate environment variables
const requiredEnv = ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_TOKEN'];
const missingEnv = requiredEnv.filter(env => !process.env[env]);

if (missingEnv.length > 0) {
    console.error('CRITICAL ERROR: Missing required environment variables:');
    missingEnv.forEach(env => console.error(`- ${env}`));
    console.error('\nPlease add these to your environment (or .env file) to continue.');
    console.error('If you are deploying on Render, add them in the "Environment" tab.');
    process.exit(1);
}

const app = express();
const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.DASHBOARD_TOKEN || 'zedox-secret-key';

app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: JWT_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser((id: string, done) => {
    const user = db_manager.getUser(id);
    done(null, user ? user.profile : null);
});

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    callbackURL: '/auth/callback',
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    db_manager.upsertUser(profile.id, accessToken, refreshToken, profile);
    return done(null, profile);
}));

// Auth Routes
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), (req, res) => {
    const user: any = req.user;
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: false }); // Allow frontend to read for now
    res.redirect('/');
});

app.get('/auth/logout', (req, res) => {
    res.clearCookie('token');
    req.logout(() => {
        res.redirect('/');
    });
});

// Middleware to check JWT
const authenticateJWT = (req: any, res: any, next: any) => {
    const token = req.headers.authorization || req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
        if (err) return res.status(401).json({ error: 'Unauthorized' });
        req.user = decoded;
        next();
    });
};

// Serve static files from the React app
const clientPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientPath));

// API Routes
app.get('/api/me', authenticateJWT, (req: any, res) => {
    const userData = db_manager.getUser(req.user.id);
    res.json(userData ? userData.profile : null);
});

app.get('/api/guilds', authenticateJWT, async (req: any, res) => {
    const userData = db_manager.getUser(req.user.id);
    if (!userData) return res.status(401).json({ error: 'User data not found' });

    try {
        // Fetch user's guilds from Discord API using their access token
        const response = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${userData.accessToken}` }
        });
        const guilds: any = await response.json();

        // Filter guilds: User must be Admin or Manage Guild, AND Bot must be in the guild
        const mutualGuilds = guilds.filter((g: any) => {
            const isOwner = g.owner;
            const hasPermissions = (BigInt(g.permissions) & PermissionsBitField.Flags.Administrator) === PermissionsBitField.Flags.Administrator ||
                (BigInt(g.permissions) & PermissionsBitField.Flags.ManageGuild) === PermissionsBitField.Flags.ManageGuild;
            return (isOwner || hasPermissions) && client.guilds.cache.has(g.id);
        });

        res.json(mutualGuilds);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch guilds' });
    }
});

// Guild-specific middleware
const checkGuildAccess = (req: any, res: any, next: any) => {
    const { guildId } = req.params;
    const userId = req.user.id;
    const guild = client.guilds.cache.get(guildId);

    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const member = guild.members.cache.get(userId);
    if (!member || !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};

app.get('/api/stats/:guildId', authenticateJWT, checkGuildAccess, (req, res) => {
    const { guildId } = req.params;
    const data = db_manager.getLogs(guildId, 1000);
    const guild = client.guilds.cache.get(guildId);
    res.json({
        uptime: process.uptime(),
        guilds: client.guilds.cache.size,
        users: guild?.memberCount || 0,
        commandsRun: data.length,
    });
});

app.get('/api/logs/:guildId', authenticateJWT, checkGuildAccess, (req, res) => {
    const { guildId } = req.params;
    res.json(db_manager.getLogs(guildId, 10));
});

app.get('/api/automod/:guildId', authenticateJWT, checkGuildAccess, (req, res) => {
    const { guildId } = req.params;
    res.json(db_manager.getAutoModConfig(guildId));
});

app.post('/api/automod/:guildId', authenticateJWT, checkGuildAccess, (req, res) => {
    const { guildId } = req.params;
    try {
        db_manager.updateAutoModConfig(guildId, req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update automod config' });
    }
});

app.get('/api/welcome/:guildId', authenticateJWT, checkGuildAccess, (req, res) => {
    const { guildId } = req.params;
    res.json(db_manager.getWelcomeConfig(guildId));
});

app.post('/api/welcome/:guildId', authenticateJWT, checkGuildAccess, (req, res) => {
    const { guildId } = req.params;
    try {
        db_manager.updateWelcomeConfig(guildId, req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update welcome config' });
    }
});

app.get('/api/violations/:guildId', authenticateJWT, checkGuildAccess, (req, res) => {
    const { guildId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    res.json(db_manager.getViolations(guildId, limit));
});

app.get('/api/config/:guildId', authenticateJWT, checkGuildAccess, (req, res) => {
    const { guildId } = req.params;
    res.json(db_manager.getConfig(guildId));
});

app.post('/api/config/:guildId', authenticateJWT, checkGuildAccess, (req, res) => {
    const { guildId } = req.params;
    const { key, value } = req.body;
    try {
        db_manager.updateConfig(guildId, key, value);
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
