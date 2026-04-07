require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await pool.query(`
            ALTER TABLE leads ADD COLUMN IF NOT EXISTS origin VARCHAR(100);
            ALTER TABLE leads ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'novos';
            ALTER TABLE leads ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '';
            ALTER TABLE leads ADD COLUMN IF NOT EXISTS annotation TEXT DEFAULT '';
            ALTER TABLE leads ADD COLUMN IF NOT EXISTS est_rec NUMERIC DEFAULT 0;
            ALTER TABLE leads ADD COLUMN IF NOT EXISTS link TEXT DEFAULT '';
            ALTER TABLE leads ADD COLUMN IF NOT EXISTS email VARCHAR(255);
            ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        `);
        console.log('Tabela atualizada com sucesso!');
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
run();
