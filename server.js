import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// -----------------------------------------------------------------------------
// DATABASE DRIVER: MYSQL DENGAN FALLBACK KE LOCAL JSON STORE
// -----------------------------------------------------------------------------
let mysqlPool = null;
let isUsingMySQL = false;
let dbInitError = null;

const DATA_DIR = path.join(__dirname, 'data');
const JSON_DB_FILE = path.join(DATA_DIR, 'records.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJsonDB() {
  try {
    if (!fs.existsSync(JSON_DB_FILE)) {
      fs.writeFileSync(JSON_DB_FILE, JSON.stringify({}), 'utf-8');
      return {};
    }
    const content = fs.readFileSync(JSON_DB_FILE, 'utf-8');
    return JSON.parse(content || '{}');
  } catch (e) {
    console.error('[JSON DB] Gagal membaca file:', e);
    return {};
  }
}

function writeJsonDB(data) {
  try {
    fs.writeFileSync(JSON_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('[JSON DB] Gagal menulis file:', e);
  }
}

async function initDatabase() {
  const dbHost = process.env.DB_HOST || '127.0.0.1';
  const dbPort = Number(process.env.DB_PORT) || 3306;
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'bisa_absen';

  try {
    // 1. Buat koneksi awal untuk memastikan database ada
    const tempConnection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      connectTimeout: 4000,
    });

    await tempConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await tempConnection.end();

    // 2. Buat Connection Pool untuk database target
    mysqlPool = mysql.createPool({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 15,
      queueLimit: 0,
      connectTimeout: 5000,
    });

    // 3. Pastikan tabel records tersedia
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS \`records\` (
        \`id\` VARCHAR(255) NOT NULL,
        \`tenant_id\` VARCHAR(255) NULL,
        \`user_id\` VARCHAR(255) NULL,
        \`kind\` VARCHAR(100) NOT NULL,
        \`data\` LONGTEXT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        \`deleted\` TINYINT(1) NOT NULL DEFAULT 0,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_records_kind_del\` (\`kind\`, \`deleted\`),
        INDEX \`idx_records_tenant\` (\`tenant_id\`),
        INDEX \`idx_records_user\` (\`user_id\`),
        INDEX \`idx_records_updated\` (\`updated_at\` DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    isUsingMySQL = true;
    dbInitError = null;
    console.log(`[Database] Terhubung ke MySQL aaPanel di ${dbHost}:${dbPort} [DB: ${dbName}]`);
  } catch (err) {
    isUsingMySQL = false;
    dbInitError = err.message;
    console.warn(`[Database] MySQL belum siap (${err.message}). Menggunakan penyimpanan lokal file JSON di data/records.json`);
  }
}

initDatabase();

// -----------------------------------------------------------------------------
// REST API ENDPOINTS
// -----------------------------------------------------------------------------

// 1. Health & Status Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'aaPanel / Node.js Express',
    database: isUsingMySQL ? 'mysql' : 'json_file',
    mysqlConnected: isUsingMySQL,
    mysqlError: dbInitError,
    timestamp: Date.now(),
  });
});

// 2. Get Records by Kind
app.get('/api/records', async (req, res) => {
  const { kind, includeDeleted, tenantId } = req.query;
  const incDel = includeDeleted === 'true' || includeDeleted === '1';

  try {
    if (isUsingMySQL && mysqlPool) {
      let query = 'SELECT id, tenant_id, user_id, kind, data, updated_at, deleted FROM records WHERE 1=1';
      const params = [];

      if (kind) {
        query += ' AND kind = ?';
        params.push(kind);
      }
      if (!incDel) {
        query += ' AND deleted = 0';
      }
      if (tenantId) {
        query += ' AND (tenant_id = ? OR tenant_id IS NULL)';
        params.push(tenantId);
      }
      query += ' ORDER BY updated_at DESC';

      const [rows] = await mysqlPool.query(query, params);
      const parsed = rows.map((r) => ({
        id: r.id,
        tenant_id: r.tenant_id,
        user_id: r.user_id,
        kind: r.kind,
        data: typeof r.data === 'string' ? JSON.parse(r.data) : r.data,
        updatedAt: Number(r.updated_at),
        deleted: Number(r.deleted),
      }));

      return res.json({ success: true, count: parsed.length, data: parsed });
    }

    // JSON Fallback
    const store = readJsonDB();
    let records = Object.values(store);

    if (kind) {
      records = records.filter((r) => r.kind === kind);
    }
    if (!incDel) {
      records = records.filter((r) => !r.deleted || r.deleted === 0);
    }
    if (tenantId) {
      records = records.filter((r) => !r.tenantId || r.tenantId === tenantId);
    }

    records.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return res.json({ success: true, count: records.length, data: records });
  } catch (err) {
    console.error('[API GET /records] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Get Single Record by ID
app.get('/api/records/:id', async (req, res) => {
  const { id } = req.params;

  try {
    if (isUsingMySQL && mysqlPool) {
      const [rows] = await mysqlPool.query(
        'SELECT id, tenant_id, user_id, kind, data, updated_at, deleted FROM records WHERE id = ? LIMIT 1',
        [id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Record not found' });
      }
      const r = rows[0];
      return res.json({
        success: true,
        data: {
          id: r.id,
          tenant_id: r.tenant_id,
          user_id: r.user_id,
          kind: r.kind,
          data: typeof r.data === 'string' ? JSON.parse(r.data) : r.data,
          updatedAt: Number(r.updated_at),
          deleted: Number(r.deleted),
        },
      });
    }

    const store = readJsonDB();
    const item = store[id];
    if (!item) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    return res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Upsert Record (Create or Update)
app.post('/api/records', async (req, res) => {
  const { id, kind, data, updatedAt, deleted, tenantId, userId } = req.body;

  if (!id || !kind) {
    return res.status(400).json({ success: false, error: 'Field id dan kind wajib diisi' });
  }

  const now = updatedAt ? Number(updatedAt) : Date.now();
  const isDeleted = deleted ? 1 : 0;
  const rawData = typeof data === 'string' ? data : JSON.stringify(data || {});

  try {
    if (isUsingMySQL && mysqlPool) {
      const query = `
        INSERT INTO records (id, tenant_id, user_id, kind, data, updated_at, deleted)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          tenant_id = VALUES(tenant_id),
          user_id = VALUES(user_id),
          kind = VALUES(kind),
          data = VALUES(data),
          updated_at = VALUES(updated_at),
          deleted = VALUES(deleted)
      `;
      await mysqlPool.query(query, [
        id,
        tenantId || 'tenant-demo-smpn2',
        userId || 'usr-guru-budi',
        kind,
        rawData,
        now,
        isDeleted,
      ]);

      return res.json({ success: true, id, updatedAt: now });
    }

    const store = readJsonDB();
    store[id] = {
      id,
      tenantId: tenantId || 'tenant-demo-smpn2',
      userId: userId || 'usr-guru-budi',
      kind,
      data: typeof data === 'string' ? JSON.parse(data) : data,
      updatedAt: now,
      deleted: isDeleted,
    };
    writeJsonDB(store);

    return res.json({ success: true, id, updatedAt: now });
  } catch (err) {
    console.error('[API POST /records] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Bulk Upsert (Import / Multi-save)
app.post('/api/records/bulk', async (req, res) => {
  const { records } = req.body;
  if (!Array.isArray(records)) {
    return res.status(400).json({ success: false, error: 'records harus berupa array' });
  }

  try {
    if (isUsingMySQL && mysqlPool) {
      const query = `
        INSERT INTO records (id, tenant_id, user_id, kind, data, updated_at, deleted)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          tenant_id = VALUES(tenant_id),
          user_id = VALUES(user_id),
          kind = VALUES(kind),
          data = VALUES(data),
          updated_at = VALUES(updated_at),
          deleted = VALUES(deleted)
      `;

      for (const r of records) {
        const rawData = typeof r.data === 'string' ? r.data : JSON.stringify(r.data || {});
        await mysqlPool.query(query, [
          r.id,
          r.tenantId || 'tenant-demo-smpn2',
          r.userId || 'usr-guru-budi',
          r.kind,
          rawData,
          Number(r.updatedAt || Date.now()),
          r.deleted ? 1 : 0,
        ]);
      }

      return res.json({ success: true, count: records.length });
    }

    const store = readJsonDB();
    for (const r of records) {
      store[r.id] = {
        ...r,
        data: typeof r.data === 'string' ? JSON.parse(r.data) : r.data,
      };
    }
    writeJsonDB(store);

    return res.json({ success: true, count: records.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Delete Record (Soft by default, or hard)
app.delete('/api/records/:id', async (req, res) => {
  const { id } = req.params;
  const hard = req.query.hard === 'true';

  try {
    if (isUsingMySQL && mysqlPool) {
      if (hard) {
        await mysqlPool.query('DELETE FROM records WHERE id = ?', [id]);
      } else {
        await mysqlPool.query('UPDATE records SET deleted = 1, updated_at = ? WHERE id = ?', [
          Date.now(),
          id,
        ]);
      }
      return res.json({ success: true, id, hard });
    }

    const store = readJsonDB();
    if (hard) {
      delete store[id];
    } else if (store[id]) {
      store[id].deleted = 1;
      store[id].updatedAt = Date.now();
    }
    writeJsonDB(store);

    return res.json({ success: true, id, hard });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Count Records
app.get('/api/records-count', async (req, res) => {
  const { kind, tenantId } = req.query;

  try {
    if (isUsingMySQL && mysqlPool) {
      let query = 'SELECT COUNT(*) as total FROM records WHERE deleted = 0';
      const params = [];
      if (kind) {
        query += ' AND kind = ?';
        params.push(kind);
      }
      if (tenantId) {
        query += ' AND (tenant_id = ? OR tenant_id IS NULL)';
        params.push(tenantId);
      }
      const [rows] = await mysqlPool.query(query, params);
      return res.json({ success: true, count: Number(rows[0].total) });
    }

    const store = readJsonDB();
    let records = Object.values(store).filter((r) => !r.deleted || r.deleted === 0);
    if (kind) records = records.filter((r) => r.kind === kind);
    return res.json({ success: true, count: records.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// STATIC FILE SERVING UNTUK AAPANEL (VITE DIST)
// -----------------------------------------------------------------------------
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // SPA fallback: seluruh rute frontend diarahkan ke index.html
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Esduta Gate - aaPanel Backend Server</title></head>
      <body style="font-family: sans-serif; padding: 40px; text-align: center; background: #0f172a; color: #fff;">
        <h1 style="color: #14b8a6;">Esduta Gate Server Aktif di aaPanel!</h1>
        <p>Backend API berjalan normal.</p>
        <p style="color: #94a3b8;">Jalankan <code>npm run build</code> agar tampilan antarmuka web muncul di halaman ini.</p>
        <p><a href="/api/health" style="color: #38bdf8;">Cek Status Database (/api/health)</a></p>
      </body>
      </html>
    `);
  });
}

// Jalankan Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 Esduta Gate Server berjalan di http://0.0.0.0:${PORT}`);
  console.log(`📂 Node environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🗄️ Database Driver: ${isUsingMySQL ? 'MySQL / MariaDB' : 'Local JSON'}`);
  console.log(`=======================================================`);
});
