const crypto = require('crypto');
const { Router } = require('express');
const pool = require('../db');
const requireApiKey = require('../middleware/auth');

const router = Router();

function hashIp(ip) {
    return crypto.createHash('sha256').update(ip + (process.env.IP_SALT || 'sierhill')).digest('hex');
}

// Record page view
router.post('/api/v1/analytics/pageview', async (req, res) => {
    const { path, referrer } = req.body;
    if (!path) {
        return res.status(400).json({ error: 'path is required' });
    }
    try {
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
        await pool.query(
            'INSERT INTO page_views (page_path, referrer, user_agent, ip_hash) VALUES ($1, $2, $3, $4)',
            [path, referrer || null, req.headers['user-agent'] || null, hashIp(ip)]
        );
        res.status(201).json({ recorded: true });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Record event
router.post('/api/v1/analytics/event', async (req, res) => {
    const { name, path, metadata } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'name is required' });
    }
    try {
        await pool.query(
            'INSERT INTO events (name, page_path, metadata) VALUES ($1, $2, $3)',
            [name, path || null, JSON.stringify(metadata || {})]
        );
        res.status(201).json({ recorded: true });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Analytics summary (protected)
router.get('/api/v1/analytics/summary', requireApiKey, async (req, res) => {
    const days = parseInt(req.query.days) || 30;
    try {
        const viewsResult = await pool.query(
            `SELECT page_path, COUNT(*) as views
             FROM page_views
             WHERE created_at > NOW() - INTERVAL '1 day' * $1
             GROUP BY page_path
             ORDER BY views DESC
             LIMIT 20`,
            [days]
        );

        const totalResult = await pool.query(
            `SELECT COUNT(*) as total,
                    COUNT(DISTINCT ip_hash) as unique_visitors
             FROM page_views
             WHERE created_at > NOW() - INTERVAL '1 day' * $1`,
            [days]
        );

        const eventsResult = await pool.query(
            `SELECT name, COUNT(*) as count
             FROM events
             WHERE created_at > NOW() - INTERVAL '1 day' * $1
             GROUP BY name
             ORDER BY count DESC
             LIMIT 20`,
            [days]
        );

        const dailyResult = await pool.query(
            `SELECT DATE(created_at) as date, COUNT(*) as views
             FROM page_views
             WHERE created_at > NOW() - INTERVAL '1 day' * $1
             GROUP BY DATE(created_at)
             ORDER BY date`,
            [days]
        );

        res.json({
            period_days: days,
            total_views: parseInt(totalResult.rows[0].total),
            unique_visitors: parseInt(totalResult.rows[0].unique_visitors),
            top_pages: viewsResult.rows,
            top_events: eventsResult.rows,
            daily_views: dailyResult.rows,
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
