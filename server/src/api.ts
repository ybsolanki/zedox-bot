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
const requiredEnv = ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_BOT_TOKEN'];
const missingEnv = requiredEnv.filter(env => !process.env[env]);

if (missingEnv.length > 0) {
    console.error('CRITICAL ERROR: Missing required environment variables:');
    missingEnv.forEach(env => console.error(`- ${env}`));
    console.error('\nPlease add these to your environment (or .env file) to continue.');
    console.error('If you are deploying on Render, add them in the "Environment" tab.');
    process.exit(1);
}

const app = express();
app.set('trust proxy', 1); // Required for Render/Proxies to handle HTTPS correctly
const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.DASHBOARD_TOKEN || 'zedox-secret-key';
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN; // Unified name
const CALLBACK_URL = process.env.CALLBACK_URL || '/auth/callback';

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
    try {
        const user = db_manager.getUser(id);
        done(null, user ? user.profile : null);
    } catch (err) {
        done(err);
    }
});

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    callbackURL: CALLBACK_URL,
    scope: ['identify', 'guilds'],
    state: true // Enable state protection
}, (accessToken, refreshToken, profile, done) => {
    try {
        console.log(`[AUTH] Strategy callback for user: ${profile.username} (${profile.id})`);
        db_manager.upsertUser(profile.id, accessToken, refreshToken, profile);
        return done(null, profile);
    } catch (error) {
        console.error('[AUTH] Strategy error:', error);
        return done(error as Error);
    }
}));

// Auth Routes
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/callback', (req, res, next) => {
    console.log('[AUTH] Callback received');
    passport.authenticate('discord', (err: any, user: any, info: any) => {
        if (err) {
            console.error('[AUTH] Passport authenticate error:', err);

            // Handle Discord/Cloudflare Rate Limits (429/1015)
            if (err.oauthError && (err.oauthError.statusCode === 429 || err.oauthError.data?.includes('1015'))) {
                return res.status(500).send(`
                    <div style="font-family: sans-serif; padding: 40px; text-align: center; background: #2f3136; color: white; height: 100vh; display: flex; flex-direction: column; justify-content: center;">
                        <h1 style="color: #ed4245;">Rate Limit Encountered</h1>
                        <p style="font-size: 1.2rem; color: #b9bbbe; max-width: 600px; margin: 20px auto;">
                            Discord (via Cloudflare) is temporarily rate-limiting requests from Render's shared IP addresses (Error 1015).
                        </p>
                        <p style="color: #b9bbbe;">Please wait 2-5 minutes and try logging in again.</p>
                        <a href="/" style="margin-top: 30px; padding: 12px 24px; background: #5865f2; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Return to Dashboard</a>
                    </div>
                `);
            }

            return res.status(500).send(`Authentication Error: ${err.message || err}`);
        }
        if (!user) {
            console.error('[AUTH] No user found in callback:', info);
            return res.status(401).send('Authentication Failed: No user profile received.');
        }

        req.logIn(user, (loginErr) => {
            if (loginErr) {
                console.error('[AUTH] Login error:', loginErr);
                return res.status(500).send('Login Error');
            }

            console.log(`[AUTH] User ${user.username} logged in successfully`);
            const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
            res.cookie('token', token, { httpOnly: false });
            res.redirect('/');
        });
    })(req, res, next);
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
        if (err) {
            console.error('[AUTH] JWT Verification failed:', err.message);
            return res.status(401).json({ error: 'Unauthorized' });
        }
        req.user = decoded;
        next();
    });
};

console.log('[INIT] Dashboard configuration:');
console.log(`- Port: ${port}`);
console.log(`- Callback URL: ${CALLBACK_URL}`);
console.log(`- Client ID set: ${!!process.env.DISCORD_CLIENT_ID}`);
console.log(`- Client Secret set: ${!!process.env.DISCORD_CLIENT_SECRET}`);
if (process.env.DISCORD_CLIENT_ID) {
    console.log(`- Client ID starts with: ${process.env.DISCORD_CLIENT_ID.substring(0, 4)}...`);
}

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

app.get('/api/roles/:guildId', authenticateJWT, checkGuildAccess, (req, res) => {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const roles = guild.roles.cache.map(r => ({
        id: r.id,
        name: r.name,
        color: r.hexColor
    })).filter(r => r.name !== '@everyone').sort((a, b) => a.name.localeCompare(b.name));

    res.json(roles);
});

app.get('/api/members/:guildId', authenticateJWT, checkGuildAccess, async (req, res) => {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    try {
        const members = await guild.members.fetch();
        const mappedMembers = members.map(m => ({
            id: m.id,
            username: m.user.username,
            displayName: m.displayName,
            avatar: m.user.displayAvatarURL()
        })).sort((a, b) => a.displayName.localeCompare(b.displayName));
        res.json(mappedMembers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});

// All other GET requests return the React app
app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
});

app.listen(port, () => {
    console.log(`Dashboard API and Bot running on port ${port}`);
});
