#!/usr/bin/env node
/**
 * Load PDF files from a directory into the documents table.
 *
 * Usage:
 *   DATABASE_URL=<url> node scripts/load-pdfs.js <directory>
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const dir = process.argv[2];
if (!dir) {
    console.error('Usage: node scripts/load-pdfs.js <pdf-directory>');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function loadPdfs() {
    const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.pdf'));
    console.log(`Found ${files.length} PDF files`);

    let loaded = 0;
    let skipped = 0;

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        // Check if already loaded
        const existing = await pool.query(
            'SELECT id FROM documents WHERE filename = $1',
            [file]
        );
        if (existing.rows.length > 0) {
            console.log(`  SKIP (exists): ${file}`);
            skipped++;
            continue;
        }

        // Derive a readable title from filename
        const title = file
            .replace(/\.pdf$/i, '')
            .replace(/-/g, ' ')
            .replace(/-copy$/i, '')
            .replace(/-reprint$/i, ' (reprint)');

        const data = fs.readFileSync(filePath);

        await pool.query(
            `INSERT INTO documents (filename, title, file_size, mime_type, data)
             VALUES ($1, $2, $3, $4, $5)`,
            [file, title, stat.size, 'application/pdf', data]
        );

        console.log(`  OK: ${file} (${(stat.size / 1024).toFixed(0)} KB)`);
        loaded++;
    }

    console.log(`\nDone: ${loaded} loaded, ${skipped} skipped`);
    await pool.end();
}

loadPdfs().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
