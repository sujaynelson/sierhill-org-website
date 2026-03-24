const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS _migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        const migrationsDir = path.join(__dirname, '..', 'migrations');
        const files = fs.readdirSync(migrationsDir).sort();

        for (const file of files) {
            if (!file.endsWith('.sql')) continue;

            const { rows } = await client.query(
                'SELECT 1 FROM _migrations WHERE name = $1',
                [file]
            );

            if (rows.length > 0) continue;

            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
            await client.query('COMMIT');
            console.log(`Migration applied: ${file}`);
        }

        console.log('Migrations complete');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

module.exports = migrate;
