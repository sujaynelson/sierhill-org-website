const { Router } = require('express');
const pool = require('../db');
const requireApiKey = require('../middleware/auth');

const router = Router();

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
