const { Router } = require('express');
const pool = require('../db');
const requireApiKey = require('../middleware/auth');

const router = Router();

// Get page with all sections
router.get('/api/v1/content/:slug', async (req, res) => {
    const { slug } = req.params;
    try {
        const pageResult = await pool.query(
            'SELECT * FROM pages WHERE slug = $1',
            [slug]
        );
        if (pageResult.rows.length === 0) {
            return res.status(404).json({ error: 'Page not found' });
        }
        const page = pageResult.rows[0];
        const sectionsResult = await pool.query(
            'SELECT key, content, sort_order FROM sections WHERE page_id = $1 ORDER BY sort_order',
            [page.id]
        );
        res.json({ ...page, sections: sectionsResult.rows });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Upsert page
router.put('/api/v1/content/:slug', requireApiKey, async (req, res) => {
    const { slug } = req.params;
    const { title, sections } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'title is required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const pageResult = await client.query(
            `INSERT INTO pages (slug, title) VALUES ($1, $2)
             ON CONFLICT (slug) DO UPDATE SET title = $2, updated_at = NOW()
             RETURNING id`,
            [slug, title]
        );
        const pageId = pageResult.rows[0].id;

        if (sections && Array.isArray(sections)) {
            for (const section of sections) {
                await client.query(
                    `INSERT INTO sections (page_id, key, content, sort_order)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT (page_id, key) DO UPDATE
                     SET content = $3, sort_order = $4, updated_at = NOW()`,
                    [pageId, section.key, JSON.stringify(section.content), section.sort_order || 0]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ slug, title, sections_updated: sections?.length || 0 });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// Upsert a single section
router.put('/api/v1/content/:slug/sections/:key', requireApiKey, async (req, res) => {
    const { slug, key } = req.params;
    const { content, sort_order } = req.body;

    try {
        const pageResult = await pool.query('SELECT id FROM pages WHERE slug = $1', [slug]);
        if (pageResult.rows.length === 0) {
            return res.status(404).json({ error: 'Page not found' });
        }
        const pageId = pageResult.rows[0].id;

        await pool.query(
            `INSERT INTO sections (page_id, key, content, sort_order)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (page_id, key) DO UPDATE
             SET content = $3, sort_order = $4, updated_at = NOW()`,
            [pageId, key, JSON.stringify(content), sort_order || 0]
        );

        res.json({ slug, key, updated: true });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
