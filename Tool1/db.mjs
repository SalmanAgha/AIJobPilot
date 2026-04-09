import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://jobpilot:password@localhost:5432/jobpilot_db',
});

// Helper for schema initialization
export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        clerk_id VARCHAR(255) UNIQUE,
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create user_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        anthropic_api_key TEXT,
        openai_api_key TEXT,
        target_roles TEXT[],
        plan VARCHAR(50) DEFAULT 'free',
        evaluations_used INTEGER DEFAULT 0,
        email_digest BOOLEAN DEFAULT false,
        cv_json JSONB,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create applications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        company VARCHAR(255) NOT NULL,
        role VARCHAR(255) NOT NULL,
        score_grade VARCHAR(10),
        score_num NUMERIC(5,2),
        status VARCHAR(50) DEFAULT 'Pending',
        has_pdf BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create reports table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE UNIQUE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create bridge_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bridge_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        page_url TEXT,
        page_title TEXT,
        fields_count INTEGER,
        mapping JSONB,
        provider VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create resumes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS resumes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) DEFAULT 'Main CV',
        data JSONB NOT NULL,
        is_primary BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Database schema initialized');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Database initialization failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

// ──────────────────────────────────────────────
// MIGRATION SCRIPT FOR LOCAL DATA
// ──────────────────────────────────────────────
// In the intermediate phase without Clerk logic active, we will create a dummy default user.

export async function getDefaultUser() {
  const res = await pool.query('SELECT id FROM users LIMIT 1');
  if (res.rows.length > 0) return res.rows[0].id;

  // Create default
  const insertRes = await pool.query(
    'INSERT INTO users (email) VALUES ($1) RETURNING id',
    ['default@local.dev']
  );
  const userId = insertRes.rows[0].id;
  
  // Create default settings
  await pool.query(
    'INSERT INTO user_settings (user_id, plan) VALUES ($1, $2)',
    [userId, 'free']
  );

  return userId;
}

// ──────────────────────────────────────────────
// APPLICATION + REPORT SERVICES
// ──────────────────────────────────────────────

export async function getApplications(userId, { limit = 50, offset = 0, search = '' } = {}) {
  const searchTerm = `%${search}%`;
  const result = await pool.query(
    `SELECT id, company, role, score_grade as score, score_num as "scoreNum", status, has_pdf as pdf, TO_CHAR(created_at, 'YYYY-MM-DD') as date 
     FROM applications
     WHERE user_id = $1 AND (company ILIKE $4 OR role ILIKE $4)
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset, searchTerm]
  );
  
  const countRes = await pool.query(
    'SELECT COUNT(*) FROM applications WHERE user_id = $1 AND (company ILIKE $2 OR role ILIKE $2)',
    [userId, searchTerm]
  );

  return {
    items: result.rows.map(row => ({
      ...row,
      reportPath: String(row.id)
    })),
    total: parseInt(countRes.rows[0].count)
  };
}

export async function addApplication(userId, appData, reportContent) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Insert application
    const appRes = await client.query(
      `INSERT INTO applications (user_id, company, role, score_grade, score_num, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, TO_CHAR(created_at, 'YYYY-MM-DD') as date`,
      [userId, appData.company, appData.role, appData.score, appData.scoreNum, appData.status]
    );
    const newAppId = appRes.rows[0].id;

    // 2. Insert report
    await client.query(
      `INSERT INTO reports (application_id, content) VALUES ($1, $2)`,
      [newAppId, reportContent]
    );

    // 3. Increment usage limit
    await client.query(
      `UPDATE user_settings SET evaluations_used = evaluations_used + 1 WHERE user_id = $1`,
      [userId]
    );

    await client.query('COMMIT');
    return { id: newAppId, date: appRes.rows[0].date };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteApplication(userId, appId) {
  await pool.query('DELETE FROM applications WHERE id = $1 AND user_id = $2', [appId, userId]);
}

export async function getReportContent(userId, appId) {
  const result = await pool.query(
    `SELECT r.content 
     FROM reports r 
     JOIN applications a ON a.id = r.application_id 
     WHERE r.application_id = $1 AND a.user_id = $2`,
    [appId, userId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0].content;
}

// ──────────────────────────────────────────────
// SETTINGS SERVICES
// ──────────────────────────────────────────────

export async function getUserSettings(userId) {
  const result = await pool.query(
    `SELECT anthropic_api_key as "anthropicApiKey", openai_api_key as "openaiApiKey", target_roles as "targetRoles", plan, evaluations_used as "usageThisMonth", email_digest as "emailDigest"
     FROM user_settings WHERE user_id = $1`,
    [userId]
  );
  // Also merge with process.env
  const dbSettings = result.rows[0] || {};
  return {
    ...dbSettings,
    ...(process.env.ANTHROPIC_API_KEY && { anthropicApiKey: process.env.ANTHROPIC_API_KEY }),
    ...(process.env.OPENAI_API_KEY && { openaiApiKey: process.env.OPENAI_API_KEY }),
    ...(process.env.PLAN && { plan: process.env.PLAN }),
  };
}

export async function updateUserSettings(userId, data) {
  const current = await pool.query('SELECT 1 FROM user_settings WHERE user_id = $1', [userId]);
  if (current.rows.length === 0) {
    await pool.query('INSERT INTO user_settings (user_id) VALUES ($1)', [userId]);
  }
  
  if (data.anthropicApiKey !== undefined) {
    await pool.query('UPDATE user_settings SET anthropic_api_key = $1 WHERE user_id = $2', [data.anthropicApiKey, userId]);
  }
  if (data.openaiApiKey !== undefined) {
    await pool.query('UPDATE user_settings SET openai_api_key = $1 WHERE user_id = $2', [data.openaiApiKey, userId]);
  }
}

// ──────────────────────────────────────────────
// MULTI-VERSION CV SERVICES
// ──────────────────────────────────────────────

export async function getResumes(userId) {
  const result = await pool.query(
    'SELECT id, name, is_primary as "isPrimary", TO_CHAR(updated_at, \'YYYY-MM-DD\') as date FROM resumes WHERE user_id = $1 ORDER BY updated_at DESC',
    [userId]
  );
  return result.rows;
}

export async function getPrimaryResume(userId) {
  const result = await pool.query(
    'SELECT data FROM resumes WHERE user_id = $1 ORDER BY is_primary DESC, updated_at DESC LIMIT 1',
    [userId]
  );
  return result.rows[0]?.data;
}

export async function getResumeById(userId, resumeId) {
  const result = await pool.query(
    'SELECT data FROM resumes WHERE id = $1 AND user_id = $2',
    [resumeId, userId]
  );
  return result.rows[0]?.data;
}

export async function saveResume(userId, { id, name, data, isPrimary }) {
  if (id) {
    // Update existing
    await pool.query(
      'UPDATE resumes SET name = $1, data = $2, is_primary = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND user_id = $5',
      [name, data, isPrimary, id, userId]
    );
    return id;
  } else {
    // Create new
    const res = await pool.query(
      'INSERT INTO resumes (user_id, name, data, is_primary) VALUES ($1, $2, $3, $4) RETURNING id',
      [userId, name, data, isPrimary]
    );
    return res.rows[0].id;
  }
}

export async function deleteResume(userId, resumeId) {
  await pool.query('DELETE FROM resumes WHERE id = $1 AND user_id = $2', [resumeId, userId]);
}

export async function logBridgeRequest(userId, data) {
  const { pageUrl, pageTitle, fieldsCount, mapping, provider } = data;
  await pool.query(
    [userId, pageUrl, pageTitle, fieldsCount, mapping, provider]
  );
}

export async function getJobs({ limit = 10, offset = 0, search = '' } = {}) {
  const searchTerm = `%${search}%`;
  const result = await pool.query(
    `SELECT id, external_id, site, title, company, location, job_url, job_url_direct, description, TO_CHAR(date_posted, 'YYYY-MM-DD') as date_posted, created_at 
     FROM jobs 
     WHERE (title ILIKE $3 OR company ILIKE $3 OR location ILIKE $3)
     ORDER BY created_at DESC 
     LIMIT $1 OFFSET $2`,
    [limit, offset, searchTerm]
  );

  const countRes = await pool.query(
    'SELECT COUNT(*) FROM jobs WHERE (title ILIKE $1 OR company ILIKE $1 OR location ILIKE $1)',
    [searchTerm]
  );

  return {
    items: result.rows,
    total: parseInt(countRes.rows[0].count)
  };
}

export default pool;
