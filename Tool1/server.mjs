import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import yaml from 'js-yaml';

import { 
  initDb, getDefaultUser, getApplications, 
  addApplication, deleteApplication, 
  getUserSettings, updateUserSettings, getReportContent,
  logBridgeRequest, getJobs, 
  getResumes, getPrimaryResume, getResumeById, saveResume, deleteResume
} from './db.mjs';
import { exec } from 'child_process';
import { generateATSPDF } from '../CVBuilder/pdf-worker.mjs';
import { CVExtractor } from '../CVBuilder/extractor.mjs';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const PROFILE_PATH = path.join(__dirname, 'config', 'profile.yml');
const CV_PATH = path.join(__dirname, 'cv.md');
const LOGS_DIR = path.join(__dirname, 'logs');
const AUDIT_LOG_PATH = path.join(LOGS_DIR, 'bridge_audit.log');

// Ensure Logs Directory exists
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR);

let defaultUserId = null;

// Initialize Postgres Database
async function setupDatabase() {
  try {
    await initDb();
    defaultUserId = await getDefaultUser();
    console.log('✅ Connected to PostgreSQL. Default User ID:', defaultUserId);
  } catch (err) {
    console.warn('\n⚠️ WARNING: Could not connect to PostgreSQL.');
    console.warn('   Make sure you have a Postgres instance running at the DATABASE_URL in .env');
    console.warn('   Or run: docker compose up -d\n');
  }
}

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────

function getProfile() {
  if (!fs.existsSync(PROFILE_PATH)) return null;
  try { return yaml.load(fs.readFileSync(PROFILE_PATH, 'utf-8')); }
  catch { return null; }
}

function getCV() {
  if (!fs.existsSync(CV_PATH)) return '';
  return fs.readFileSync(CV_PATH, 'utf-8');
}

function auditLog(event, details) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${event.toUpperCase()}: ${JSON.stringify(details)}\n`;
  fs.appendFileSync(AUDIT_LOG_PATH, logEntry);
  console.log(`📝 AUDIT: ${event} logged.`);
}

// ──────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => res.send('OK'));
app.get('/api/test', (req, res) => res.json({ message: 'Server is responding to new routes' }));

// GET /api/profile
app.get('/api/profile', (req, res) => {
  const profile = getProfile();
  if (!profile) return res.status(404).json({ error: 'profile.yml not found' });
  res.json(profile);
});

// GET /api/applications
app.get('/api/applications', async (req, res) => {
  if (!defaultUserId) return res.json([]);
  try {
    const { limit, offset, search } = req.query;
    const data = await getApplications(defaultUserId, { 
      limit: parseInt(limit) || 50, 
      offset: parseInt(offset) || 0,
      search: search || ''
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/report?path=ID
app.get('/api/report', async (req, res) => {
  const id = req.query.path;
  if (!id || !defaultUserId) return res.status(400).send('No path provided');
  try {
    const content = await getReportContent(defaultUserId, id);
    if (!content) return res.status(404).send('Report not found in DB');
    res.send(content);
  } catch (err) {
    res.status(500).send('DB Error');
  }
});

// POST /api/scrape
app.post('/api/scrape', async (req, res) => {
  const { searchTerm, location, resultsWanted = 5 } = req.body;
  const tool4Path = path.join(__dirname, '..', 'tool4');
  
  console.log(`📡 Triggering scrape: "${searchTerm}" in "${location}"...`);
  
  // Use absolute path for DATABASE_URL for consistency
  const dbUrl = process.env.DATABASE_URL || 'postgres://jobpilot:password@localhost:5432/jobpilot_db';
  
  const cmd = `npx tsx scraper.ts "${searchTerm}" "${location}" ${resultsWanted}`;
  
  exec(cmd, { 
    cwd: tool4Path,
    env: { ...process.env, DATABASE_URL: dbUrl }
  }, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Scrape error: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    console.log(`✅ Scrape complete for "${searchTerm}"`);
    res.json({ success: true, output: stdout });
  });
});
app.get('/api/jobs', async (req, res) => {
  try {
    const { limit, offset, search } = req.query;
    const data = await getJobs({
      limit: parseInt(limit) || 10,
      offset: parseInt(offset) || 0,
      search: search || ''
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings
app.get('/api/settings', async (req, res) => {
  if (!defaultUserId) return res.json({});
  try {
    const settings = await getUserSettings(defaultUserId);
    const profile = getProfile();
    res.json({
      hasApiKey: !!settings.anthropicApiKey,
      apiKeyPreview: settings.anthropicApiKey ? `sk-ant-...${settings.anthropicApiKey.slice(-6)}` : null,
      targetRoles: settings.targetRoles || profile?.target_roles?.primary || [],
      emailDigest: settings.emailDigest || false,
      plan: settings.plan || 'free',
      usageThisMonth: settings.usageThisMonth || 0,
      pdfThisMonth: settings.pdfThisMonth || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings
app.post('/api/settings', async (req, res) => {
  if (!defaultUserId) return res.status(400).json({ error: 'DB not ready' });
  try {
    await updateUserSettings(defaultUserId, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats
app.get('/api/stats', async (req, res) => {
  if (!defaultUserId) return res.json({});
  try {
    const data = await getApplications(defaultUserId, { limit: 1000 });
    const apps = data.items;
    const settings = await getUserSettings(defaultUserId);
    const PLAN_LIMITS = { free: 3, pro: 30, accelerator: Infinity };
    const limit = PLAN_LIMITS[settings.plan || 'free'];
    const used = settings.usageThisMonth || 0;

    const byStatus = apps.reduce((acc, a) => {
      const s = a.status.toLowerCase();
      if (s.includes('eval')) acc.evaluated = (acc.evaluated || 0) + 1;
      else if (s.includes('apli') || s.includes('env')) acc.applied = (acc.applied || 0) + 1;
      else if (s.includes('inter') || s.includes('entrev')) acc.interview = (acc.interview || 0) + 1;
      else acc.pending = (acc.pending || 0) + 1;
      return acc;
    }, {});

    const avgScore = apps.length > 0
      ? (apps.reduce((sum, a) => sum + parseFloat(a.scoreNum || 0), 0) / apps.length).toFixed(1)
      : null;

    const topApp = apps.sort((a, b) => parseFloat(b.scoreNum || 0) - parseFloat(a.scoreNum || 0))[0] || null;

    res.json({
      total: apps.length,
      avgScore,
      byStatus,
      topApp,
      plan: settings.plan || 'free',
      usageLimit: limit,
      usageThisMonth: used,
      usageRemaining: limit === Infinity ? 'Unlimited' : Math.max(0, limit - used),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/evaluate
app.post('/api/evaluate', async (req, res) => {
  if (!defaultUserId) return res.status(500).json({ error: 'Database disconnected' });

  const { jobUrl, jobText, company, role } = req.body;
  if (!jobUrl && !jobText) return res.status(400).json({ error: 'Provide jobUrl or jobText' });

  const settings = await getUserSettings(defaultUserId);
  const apiKey = settings.openaiApiKey || settings.anthropicApiKey;
  if (!apiKey) {
    return res.status(401).json({ error: 'No API key configured (OpenAI or Anthropic).' });
  }

  // Usage
  const PLAN_LIMITS = { free: 3, pro: 30, accelerator: Infinity };
  const plan = settings.plan || 'free';
  const limit = PLAN_LIMITS[plan];
  const used = settings.usageThisMonth || 0;
  if (limit !== Infinity && used >= limit) {
    return res.status(403).json({
      error: `Limit reached. Month: ${used}/${limit}`,
      upgradeRequired: true,
    });
  }

  const cv = getCV();
  const profile = getProfile();
  const profileSummary = profile ? `Name: ${profile.candidate?.full_name}` : '';

  const jobContent = jobText || `URL: ${jobUrl} (Please analyze this job posting)`;
  const systemPrompt = `You are an expert career strategist and AI evaluator. Analyze job descriptions and evaluate candidate fit. Respond in English. Be concise.`;
  const userPrompt = `Evaluate this job opportunity:\nCANDIDATE: ${profileSummary}\nCV: ${cv}\nJOB: ${jobContent}\nCompany: ${company}\nRole: ${role}\n
Produce 6 sections:
A) ROLE SUMMARY
B) CV MATCH
C) LEVEL & STRATEGY
D) COMPENSATION
E) CV PLAN
F) INTERVIEW PREP
End with: OVERALL SCORE: X/5 and RECOMMENDATION.`;

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullContent = '';

    if (settings.openaiApiKey) {
      const openai = new OpenAI({ apiKey: settings.openaiApiKey });
      const stream = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 4000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
        }
      }
    } else {
      const client = new Anthropic({ apiKey: settings.anthropicApiKey });
      const stream = await client.messages.stream({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
          fullContent += chunk.delta.text;
          res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
        }
      }
    }

    const detectedCompany = company || 'Unknown';
    const detectedRole = role || 'Unknown';
    const scoreMatch = fullContent.match(/OVERALL SCORE:\s*([A-F][+\-]?|[\d.]+\/5)/i);
    const score = scoreMatch ? scoreMatch[1] : 'B';
    const scoreNum = parseFloat(score.replace(/[^0-9.]/g, '')) || 0;

    const reportContent = `# Evaluation: ${detectedCompany} — ${detectedRole}\n\n**Score:** ${score}\n\n---\n\n${fullContent}`;

    // Write to PostgreSQL
    const { id, date } = await addApplication(defaultUserId, {
      company: detectedCompany,
      role: detectedRole,
      score,
      scoreNum,
      status: 'Evaluated'
    }, reportContent);

    res.write(`data: ${JSON.stringify({ done: true, id, reportPath: String(id), score })}\n\n`);
    res.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
    else { res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`); res.end(); }
  }
});

// POST /api/bridge/fill
app.post('/api/bridge/fill', async (req, res) => {
  const { formFields, pageUrl, pageTitle } = req.body;
  
  // 1. Log the incoming request to audit
  auditLog('extension_request', { 
    url: pageUrl, 
    title: pageTitle, 
    fieldsCount: formFields?.length || 0 
  });

  let settings = {};
  try {
    if (defaultUserId) {
      settings = await getUserSettings(defaultUserId);
    } else {
      settings = {
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        openaiApiKey: process.env.OPENAI_API_KEY,
        plan: process.env.PLAN || 'free'
      };
    }
  } catch (err) {
    settings = { 
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY 
    };
  }

  const apiKey = settings.anthropicApiKey || settings.openaiApiKey;
  const provider = settings.anthropicApiKey ? 'anthropic' : (settings.openaiApiKey ? 'openai' : null);

  if (!apiKey) {
    auditLog('bridge_error', { error: 'No API key provided' });
    return res.status(401).json({ error: 'No API key found (Anthropic or OpenAI). Please add one to your .env file.' });
  }

  const profile = getProfile();
  const cv = getCV();

  const systemPrompt = `You are a surgical-grade job application assistant.
Your task is to map candidate profile data to form fields accurately.
For each field, provide the most likely value from the candidate data.
If a field has 'options' (select/radio/checkbox), you MUST pick one of the strings provided in the 'options' array.
Return JSON ONLY: { "idOrName": "selected_value" }.`;

  const userPrompt = `
PAGE: ${pageTitle}
URL: ${pageUrl}
CANDIDATE PROFILE:
${profile ? yaml.dump(profile) : 'No structured profile available'}

RESUME CONTEXT:
${cv || 'No resume text available'}

FIELDS TO FILL (mapping based on labels, placeholders, and options):
${JSON.stringify(formFields, null, 2)}

Return mapping JSON:`;

  try {
    let mapping = null;
    let fallbackToOpenAI = false;
    
    // Attempt 1: Try Primary Provider (Prefer Anthropic if key exists)
    if (provider === 'anthropic') {
      try {
        const client = new Anthropic({ apiKey });
        const response = await client.messages.create({
          model: 'claude-3-5-sonnet-20240620',
          max_tokens: 2000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        });
        const text = response.content[0].text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        mapping = JSON.parse(jsonMatch[0]);
      } catch (anthropicErr) {
        console.warn('⚠️ Anthropic failed:', anthropicErr.message);
        if (settings.openaiApiKey) {
          console.log('🔄 Falling back to OpenAI...');
          fallbackToOpenAI = true;
        } else {
          throw anthropicErr;
        }
      }
    }

    // Attempt 2: Try OpenAI (Direct or Fallback)
    if (provider === 'openai' || fallbackToOpenAI) {
      const gptApiKey = settings.openaiApiKey;
      const openai = new OpenAI({ apiKey: gptApiKey });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      });
      mapping = JSON.parse(response.choices[0].message.content);
    }

    if (!mapping) throw new Error('Could not generate mapping from any provider');

    auditLog('bridge_success', { 
      provider: fallbackToOpenAI ? 'openai (fallback)' : provider, 
      fieldsFilled: Object.keys(mapping).length 
    });

    // 2. Save to database log
    if (defaultUserId) {
      await logBridgeRequest(defaultUserId, {
        pageUrl,
        pageTitle,
        fieldsCount: formFields?.length || 0,
        mapping,
        provider: fallbackToOpenAI ? 'openai (fallback)' : provider
      });
      console.log('✅ Bridge request saved to DB.');
    }

    res.json(mapping);
  } catch (err) {
    auditLog('bridge_error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/applications/:id
app.delete('/api/applications/:id', async (req, res) => {
  if (!defaultUserId) return res.status(500).json({ error: 'DB error' });
  try {
    await deleteApplication(defaultUserId, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/generate-cv
app.post('/api/generate-cv', async (req, res) => {
  try {
    const cvData = req.body;
    const buffer = await generateATSPDF(cvData);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=resume.pdf');
    res.send(buffer);
  } catch (err) {
    console.error('PDF Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cv/extract
app.post('/api/cv/extract', upload.single('cv'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    // Use available keys from settings or .env
    const settings = await getUserSettings(defaultUserId);
    const antKey = settings.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    const oaiKey = process.env.OPENAI_API_KEY; // Use .env for OpenAI for now
    
    const extractor = new CVExtractor(antKey, oaiKey);
    const data = await extractor.extractAndParse(req.file.buffer);
    
    // Automatically save as a new "Extracted CV"
    const name = `Imported ${new Date().toLocaleDateString()}`;
    await saveResume(defaultUserId, { name, data, isPrimary: false });
    
    res.json(data);
  } catch (err) {
    console.error('Extraction Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/resumes/primary
app.get('/api/resumes/primary', async (req, res) => {
  try {
    const data = await getPrimaryResume(defaultUserId);
    res.json(data || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/resumes
app.get('/api/resumes', async (req, res) => {
  try {
    const items = await getResumes(defaultUserId);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/resumes/:id
app.get('/api/resumes/:id', async (req, res) => {
  try {
    const data = await getResumeById(defaultUserId, req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/resumes
app.post('/api/resumes', async (req, res) => {
  try {
    const id = await saveResume(defaultUserId, req.body);
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/resumes/:id
app.delete('/api/resumes/:id', async (req, res) => {
  try {
    await deleteResume(defaultUserId, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cv/score
app.post('/api/cv/score', async (req, res) => {
  const { resumeData, jobDesc } = req.body;
  if (!resumeData || !jobDesc) {
    return res.status(400).json({ error: 'Missing resume data or job description' });
  }

  try {
    const oaiKey = process.env.OPENAI_API_KEY;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${oaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a professional ATS (Applicant Tracking System) Analyzer. 
            Evaluate the provided Resume against the Job Description.
            Return a JSON object ONLY with:
            {
              "score": 0-100,
              "breakDown": { "keywords": 0-100, "roleRelevance": 0-100, "formatting": 0-100 },
              "missingKeywords": ["skill1", "skill2", "skill3", "skill4", "skill5"],
              "suggestedFixes": ["fix1", "fix2", "fix3"],
              "atsVerdict": "summary statement."
            }`
          },
          {
            role: 'user',
            content: `RESUME DATA: ${JSON.stringify(resumeData)}\n\nJOB DESCRIPTION: ${jobDesc}`
          }
        ],
        response_format: { type: 'json_object' }
      })
    });

    const result = await response.json();
    res.json(JSON.parse(result.choices[0].message.content));
  } catch (err) {
    console.error('Scoring Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cv/cover-letter
app.post('/api/cv/cover-letter', async (req, res) => {
  const { resumeData, jobDesc } = req.body;
  try {
    const oaiKey = process.env.OPENAI_API_KEY;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${oaiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a professional career coach. Write a tailored, persuasive cover letter. Return ONLY the markdown content of the letter.'
          },
          {
            role: 'user',
            content: `RESUME: ${JSON.stringify(resumeData)}\n\nJOB: ${jobDesc}`
          }
        ]
      })
    });
    const result = await response.json();
    res.json({ content: result.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cv/interview-prep
app.post('/api/cv/interview-prep', async (req, res) => {
  const { resumeData, jobDesc } = req.body;
  try {
    const oaiKey = process.env.OPENAI_API_KEY;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${oaiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an elite recruiter. Generate 10 custom behavioral interview questions for this candidate and role. For each, provide a "Key Tip" for how to answer using the STAR method. Return ONLY markdown.'
          },
          {
            role: 'user',
            content: `RESUME: ${JSON.stringify(resumeData)}\n\nJOB: ${jobDesc}`
          }
        ]
      })
    });
    const result = await response.json();
    res.json({ content: result.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Startup
setupDatabase();

app.listen(PORT, () => {
  console.log(`\n🚀 JobPilot Backend (v2.1-CV-Fix) running on http://localhost:${PORT}`);
  console.log(`   • GET  /api/profile`);
  console.log(`   • GET  /api/applications`);
  console.log(`   • GET  /api/stats`);
  console.log(`   • POST /api/evaluate  (streaming)`);
  console.log(`   • GET  /api/settings`);
  console.log(`   • POST /api/settings`);
  console.log(`   • POST /api/cv/extract`);
  console.log(`   • POST /api/generate-cv`);
  console.log(`   • POST /api/bridge/fill (AI Bridge: Anthropic + OpenAI)`);
  console.log(`   • Audit Log: Tool1/logs/bridge_audit.log\n`);
});
