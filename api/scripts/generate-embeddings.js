/**
 * Extract text from PDFs stored in PostgreSQL and generate vector embeddings.
 *
 * Usage:
 *   DATABASE_URL=<url> OPENAI_API_KEY=<key> node scripts/generate-embeddings.js
 *
 * Options:
 *   --force   Re-generate embeddings even for documents that already have them
 */

const { Pool } = require('pg');
const pdfParse = require('pdf-parse');
const { getEmbedding } = require('../src/embeddings');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const force = process.argv.includes('--force');

async function run() {
    if (!process.env.OPENAI_API_KEY) {
        console.error('Error: OPENAI_API_KEY environment variable is required');
        process.exit(1);
    }

    const whereClause = force ? '' : 'WHERE embedding IS NULL';
    const { rows: docs } = await pool.query(
        `SELECT id, filename, data FROM documents ${whereClause} ORDER BY id`
    );

    console.log(`Found ${docs.length} document(s) to process`);

    for (const doc of docs) {
        try {
            console.log(`Processing: ${doc.filename} (id=${doc.id})`);

            // Extract text from PDF
            const pdf = await pdfParse(doc.data);
            const text = pdf.text.trim();

            if (!text) {
                console.log(`  Skipped: no extractable text`);
                continue;
            }

            console.log(`  Extracted ${text.length} chars of text`);

            // Generate embedding
            const embedding = await getEmbedding(text);
            const embeddingStr = `[${embedding.join(',')}]`;

            // Store text content and embedding
            await pool.query(
                `UPDATE documents SET text_content = $1, embedding = $2, updated_at = NOW() WHERE id = $3`,
                [text, embeddingStr, doc.id]
            );

            console.log(`  Done`);
        } catch (err) {
            console.error(`  Error processing ${doc.filename}: ${err.message}`);
        }
    }

    console.log('Finished');
    await pool.end();
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
