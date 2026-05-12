require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// Caminho absoluto para a pasta de uploads (compatível com Railway Volume)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuração do Multer para armazenamento local
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname)); // Mantém a extensão do arquivo (.pdf, .pptx)
    }
});
const upload = multer({ storage: storage });

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Serve arquivos estáticos (Landing Page + CRM)
app.use(express.static(path.join(__dirname)));
// Permite acesso público à pasta de uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rotas amigáveis: /admin e /crm → admin.html
app.get(['/admin', '/crm'], (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Conexão com o banco de dados PostgreSQL
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error('❌ ERRO: A variável DATABASE_URL não foi definida no arquivo .env');
}

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { 
        rejectUnauthorized: false // Permite conexões com bancos online no ambiente local
    }
});

// Cria a tabela de leads caso não exista
async function initDB() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS leads (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                email VARCHAR(255),
                origin VARCHAR(100),
                status VARCHAR(50) DEFAULT 'novos',
                note TEXT DEFAULT '',
                annotation TEXT DEFAULT '',
                link TEXT DEFAULT '',
                est_rec NUMERIC DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ Banco de dados inicializado com sucesso.');
    } catch (err) {
        console.error('❌ Erro ao inicializar banco de dados:', err);
    } finally {
        client.release();
    }
}

// ==================== ROTAS DA API ====================

// GET /api/leads — Retorna todos os leads (com filtros opcionais se necessário no futuro)
app.get('/api/leads', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM leads ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Erro GET /api/leads:', err);
        res.status(500).json({ error: 'Erro ao buscar leads.' });
    }
});

// POST /api/leads — Cria um novo lead
app.post('/api/leads', async (req, res) => {
    const { name, phone, email, origin, note, est_rec } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Nome e telefone são obrigatórios.' });

    try {
        const result = await pool.query(
            `INSERT INTO leads (name, phone, email, origin, note, est_rec) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [name, phone, email || '', origin || 'Site/Busca', note || '', est_rec || 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Erro POST /api/leads:', err);
        res.status(500).json({ error: 'Erro ao criar lead.' });
    }
});

// PUT /api/leads/:id — Atualiza status, nota ou link de um lead (ação do CRM)
app.put('/api/leads/:id', async (req, res) => {
    const { id } = req.params;
    const { status, note, link, origin, annotation } = req.body;

    try {
        const fields = [];
        const values = [];
        let idx = 1;
        if (status     !== undefined) { fields.push(`status = $${idx++}`);     values.push(status); }
        if (note       !== undefined) { fields.push(`note = $${idx++}`);       values.push(note); }
        if (link       !== undefined) { fields.push(`link = $${idx++}`);       values.push(link); }
        if (origin     !== undefined) { fields.push(`origin = $${idx++}`);     values.push(origin); }
        if (annotation !== undefined) { fields.push(`annotation = $${idx++}`); values.push(annotation); }

        if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar.' });

        values.push(id);
        const result = await pool.query(
            `UPDATE leads SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Lead não encontrado.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao atualizar lead.' });
    }
});

// POST /api/leads/:id/upload — Upload de arquivo (PDF, PPT, etc.) para o card
app.post('/api/leads/:id/upload', upload.single('file'), async (req, res) => {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    // O arquivo agora estará disponível em /uploads/nome-do-arquivo.extensao
    const fileUrl = `/uploads/${req.file.filename}`;
    
    try {
        const result = await pool.query(
            `UPDATE leads SET link = $1 WHERE id = $2 RETURNING *`,
            [fileUrl, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Lead não encontrado.' });
        res.json({ success: true, link: fileUrl });
    } catch (err) {
        console.error('Erro no upload para o lead:', err);
        res.status(500).json({ error: 'Erro ao salvar o arquivo no banco de dados.' });
    }
});

// POST /api/leads/questionario — Cria lead via questionário de briefing (com fotos)
app.post('/api/leads/questionario', upload.array('fotos', 10), async (req, res) => {
    const { name, phone, email, note } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Nome e telefone são obrigatórios.' });

    const fotos = (req.files || []).map(f => `/uploads/${f.filename}`);
    console.log(`📸 Questionário: ${fotos.length} foto(s) salvas em ${uploadsDir}`, fotos);

    try {
        const result = await pool.query(
            `INSERT INTO leads (name, phone, email, origin, note, status, link)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [
                name,
                phone,
                email || '',
                'Questionário Briefing',
                note || '',
                'contato',
                fotos.length > 0 ? JSON.stringify(fotos) : ''
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Erro POST /api/leads/questionario:', err);
        res.status(500).json({ error: 'Erro ao criar lead do questionário.' });
    }
});

// DELETE /api/leads/:id — Remove um lead definitivamente
app.delete('/api/leads/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM leads WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao deletar lead.' });
    }
});

// Inicializa o banco e sobe o servidor
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor AMO CRM rodando em http://localhost:${PORT}`);
    });
});
