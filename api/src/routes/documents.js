const { Router } = require('express');
const pool = require('../db');
const requireApiKey = require('../middleware/auth');
const { getEmbedding } = require('../embeddings');

const router = Router();

// Search documents by semantic similarity
router.get('/api/v1/documents/search', async (req, res) => {
    const { q, limit } = req.query;
    if (!q || !q.trim()) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ error: 'Search is not configured' });
    }

    try {
        const embedding = await getEmbedding(q.trim());
        const embeddingStr = `[${embedding.join(',')}]`;
        const maxResults = Math.min(parseInt(limit, 10) || 10, 27);

        const result = await pool.query(
            `SELECT id, filename, title, file_size, mime_type, created_at,
                    1 - (embedding <=> $1::vector) AS similarity
             FROM documents
             WHERE embedding IS NOT NULL
             ORDER BY embedding <=> $1::vector
             LIMIT $2`,
            [embeddingStr, maxResults]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Search error:', err.message);
        res.status(500).json({ error: 'Search failed' });
    }
});

// List all documents (metadata only, no binary data)
router.get('/api/v1/documents', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, filename, title, file_size, mime_type, created_at FROM documents ORDER BY filename'
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Download a document by ID
router.get('/api/v1/documents/:id/download', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'SELECT filename, mime_type, data FROM documents WHERE id = $1',
            [parseInt(id, 10)]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }
        const doc = result.rows[0];
        res.setHeader('Content-Type', doc.mime_type);
        res.setHeader('Content-Disposition', `inline; filename="${doc.filename}"`);
        res.send(doc.data);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a document (requires API key)
router.delete('/api/v1/documents/:id', requireApiKey, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'DELETE FROM documents WHERE id = $1 RETURNING id, filename',
            [parseInt(id, 10)]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }
        res.json({ deleted: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
