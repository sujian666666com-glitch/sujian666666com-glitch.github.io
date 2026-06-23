import http from 'node:http';
import crypto from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const PORT = Number(process.env.TRACKER_API_PORT || 8791);
const HOST = process.env.TRACKER_API_HOST || '127.0.0.1';
const DB_PATH = process.env.TRACKER_DB_PATH || '/var/lib/my-blog-tracker/tracker.db';

// 鉴权配置
const JWT_SECRET = String(process.env.TRACKER_JWT_SECRET || '').trim();
const PASSWORD_HASH = String(process.env.TRACKER_PASSWORD_HASH || '').trim();
const PASSWORD_SALT = String(process.env.TRACKER_PASSWORD_SALT || '').trim();
const API_TOKEN = String(process.env.TRACKER_API_TOKEN || '').trim();
const JWT_TTL_MS = Number(process.env.TRACKER_JWT_TTL_MS || 30 * 24 * 60 * 60 * 1000);

const ALLOWED_ORIGINS = new Set(
  String(
    process.env.TRACKER_ALLOWED_ORIGINS ||
      'https://sujian.online,https://www.sujian.online,https://sujian666666com-glitch.github.io',
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

// base64 图片可能较大，放宽到 2MB（前端会压缩到 200KB 以内）
const MAX_JSON_BYTES = 2 * 1024 * 1024;
// 写接口限流：每 IP 每 60 秒最多 60 次
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT,
    color TEXT,
    description TEXT,
    start_date TEXT NOT NULL,
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS daily_records (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    date_key TEXT NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    attachment TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(plan_id, date_key)
  );

  CREATE INDEX IF NOT EXISTS idx_records_plan_date
    ON daily_records (plan_id, date_key);

  CREATE TABLE IF NOT EXISTS milestones (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    date_key TEXT NOT NULL,
    label TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_milestones_plan_date
    ON milestones (plan_id, date_key);
`);

// ---------------------------------------------------------------------------
// 基础工具：CORS / 响应 / JSON 读取
// ---------------------------------------------------------------------------

function corsHeaders(req) {
  const origin = String(req.headers.origin || '').trim();
  const headers = { Vary: 'Origin' };
  if (ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET,POST,PATCH,PUT,DELETE,OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return headers;
}

function json(req, res, status, data) {
  res.writeHead(status, {
    ...corsHeaders(req),
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

function error(req, res, status, message) {
  json(req, res, status, { error: message });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > MAX_JSON_BYTES) {
        reject(Object.assign(new Error('Request body too large'), { status: 413 }));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(Object.assign(new Error('Invalid JSON body'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function getClientIP(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket.remoteAddress || 'unknown';
}

// ---------------------------------------------------------------------------
// 限流（按 IP，针对写接口）
// ---------------------------------------------------------------------------

const rateBuckets = new Map();
function rateLimit(req) {
  const ip = getClientIP(req);
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt < cutoff) {
    rateBuckets.set(ip, { count: 1, resetAt: now });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= RATE_LIMIT_MAX;
}

// ---------------------------------------------------------------------------
// 鉴权：JWT + API Token 双轨
// ---------------------------------------------------------------------------

function signJWT(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const issuedAt = Date.now();
  const body = { ...payload, iat: issuedAt, exp: issuedAt + JWT_TTL_MS };
  const b64url = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');
  const head = b64url(header);
  const payloadB64 = b64url(body);
  const data = `${head}.${payloadB64}`;
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

function verifyJWT(token) {
  if (!JWT_SECRET) return null;
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const [head, payloadB64, signature] = parts;
  const data = `${head}.${payloadB64}`;
  const expected = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const body = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (body.exp && Date.now() > body.exp) return null;
    return body;
  } catch {
    return null;
  }
}

function tokenEquals(left, right) {
  if (!left || !right) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function isAuthorized(req) {
  const header = String(req.headers.authorization || '');
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;
  // 先验 JWT
  if (verifyJWT(token)) return true;
  // 再验 API Token（恒定时间比较）
  return tokenEquals(token, API_TOKEN);
}

// ---------------------------------------------------------------------------
// 业务校验
// ---------------------------------------------------------------------------

function todayShanghai() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const map = {};
  for (const part of parts) map[part.type] = part.value;
  return `${map.year}-${map.month}-${map.day}`;
}

function validatePlanInput(body, { partial = false } = {}) {
  const out = {};
  if ('name' in body) {
    out.name = String(body.name || '').trim();
    if (out.name.length < 1 || out.name.length > 40) return '计划名长度需在 1-40 字之间';
  } else if (!partial) {
    return '计划名不能为空';
  }
  if ('emoji' in body) out.emoji = String(body.emoji || '').trim().slice(0, 8) || null;
  if ('color' in body) out.color = String(body.color || '').trim().slice(0, 32) || null;
  if ('description' in body) {
    out.description = String(body.description || '').trim().slice(0, 500) || null;
  }
  if ('start_date' in body) {
    out.start_date = String(body.start_date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(out.start_date)) return '开始日期格式应为 YYYY-MM-DD';
  } else if (!partial) {
    out.start_date = todayShanghai();
  }
  if ('due_date' in body) {
    out.due_date = String(body.due_date || '').trim();
    if (out.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(out.due_date)) {
      return '截止日期格式应为 YYYY-MM-DD';
    }
    if (!out.due_date) out.due_date = null;
  }
  if ('status' in body) {
    const status = String(body.status || '').trim();
    if (!['active', 'archived', 'done'].includes(status)) {
      return '状态只能是 active / archived / done';
    }
    out.status = status;
  }
  if ('sort_order' in body) {
    out.sort_order = Number(body.sort_order) || 0;
  }
  return out;
}

function validateDateKey(dateKey) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ''));
}

function validateRecordInput(body) {
  const out = {};
  const progress = Number(body.progress);
  if (Number.isNaN(progress) || progress < 0 || progress > 100) {
    return '完成度需在 0-100 之间';
  }
  out.progress = Math.round(progress);
  out.note = String(body.note || '').trim().slice(0, 2000) || null;
  // base64 图片校验：必须以 data:image 开头，限制长度（约 1.5MB 编码后）
  if (body.attachment) {
    const attachment = String(body.attachment);
    if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(attachment)) {
      return '图片格式不正确';
    }
    if (attachment.length > 2 * 1024 * 1024) {
      return '图片过大，请压缩后再上传';
    }
    out.attachment = attachment;
  } else {
    out.attachment = null;
  }
  return out;
}

// ---------------------------------------------------------------------------
// 输出形状（公开只读字段）
// ---------------------------------------------------------------------------

function publicPlan(row) {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    color: row.color,
    description: row.description,
    startDate: row.start_date,
    dueDate: row.due_date,
    status: row.status,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function publicRecord(row) {
  return {
    id: row.id,
    planId: row.plan_id,
    date: row.date_key,
    progress: row.progress,
    note: row.note,
    hasAttachment: Boolean(row.attachment),
    // attachment 仅在单日详情接口返回，列表/热力图不返回，避免响应膨胀
    attachment: row.__withAttachment ? row.attachment : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function publicMilestone(row) {
  return {
    id: row.id,
    planId: row.plan_id,
    date: row.date_key,
    label: row.label,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// 路由处理：计划
// ---------------------------------------------------------------------------

function listPlans(req, res) {
  const rows = db
    .prepare('SELECT * FROM plans ORDER BY sort_order ASC, created_at ASC')
    .all();
  json(req, res, 200, { items: rows.map(publicPlan) });
}

async function createPlan(req, res) {
  if (!rateLimit(req)) {
    error(req, res, 429, '操作过于频繁，请稍后再试');
    return;
  }
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    error(req, res, err.status || 400, err.message || 'Invalid JSON body');
    return;
  }
  const validated = validatePlanInput(body);
  if (typeof validated === 'string') {
    error(req, res, 400, validated);
    return;
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO plans (id, name, emoji, color, description, start_date, due_date, status, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    validated.name,
    validated.emoji || null,
    validated.color || null,
    validated.description || null,
    validated.start_date,
    validated.due_date || null,
    validated.status || 'active',
    validated.sort_order || 0,
    now,
  );
  const row = db.prepare('SELECT * FROM plans WHERE id = ?').get(id);
  json(req, res, 201, { item: publicPlan(row) });
}

async function updatePlan(req, res, id) {
  if (!rateLimit(req)) {
    error(req, res, 429, '操作过于频繁，请稍后再试');
    return;
  }
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    error(req, res, err.status || 400, err.message || 'Invalid JSON body');
    return;
  }
  const validated = validatePlanInput(body, { partial: true });
  if (typeof validated === 'string') {
    error(req, res, 400, validated);
    return;
  }
  const existing = db.prepare('SELECT id FROM plans WHERE id = ?').get(id);
  if (!existing) {
    error(req, res, 404, '计划不存在');
    return;
  }
  const fields = Object.keys(validated);
  if (fields.length === 0) {
    error(req, res, 400, '没有需要更新的字段');
    return;
  }
  const assignments = fields.map((key) => `${key} = ?`).join(', ');
  const values = fields.map((key) => validated[key]);
  db.prepare(`UPDATE plans SET ${assignments} WHERE id = ?`).run(...values, id);
  const row = db.prepare('SELECT * FROM plans WHERE id = ?').get(id);
  json(req, res, 200, { item: publicPlan(row) });
}

function deletePlan(req, res, id) {
  if (!rateLimit(req)) {
    error(req, res, 429, '操作过于频繁，请稍后再试');
    return;
  }
  const existing = db.prepare('SELECT id FROM plans WHERE id = ?').get(id);
  if (!existing) {
    error(req, res, 404, '计划不存在');
    return;
  }
  db.prepare('DELETE FROM plans WHERE id = ?').run(id);
  json(req, res, 200, { ok: true });
}

// ---------------------------------------------------------------------------
// 路由处理：每日记录
// ---------------------------------------------------------------------------

function listPlanRecords(req, res, url, id) {
  const year = parseInt(url.searchParams.get('year') || String(new Date().getFullYear()), 10);
  if (!Number.isInteger(year) || year < 1900 || year > 9999) {
    error(req, res, 400, '年份参数不合法');
    return;
  }
  const plan = db.prepare('SELECT id FROM plans WHERE id = ?').get(id);
  if (!plan) {
    error(req, res, 404, '计划不存在');
    return;
  }
  const rows = db
    .prepare(
      `SELECT id, plan_id, date_key, progress, note, created_at, updated_at
       FROM daily_records
       WHERE plan_id = ? AND date_key LIKE ?
       ORDER BY date_key ASC`,
    )
    .all(id, `${year}-%`);
  json(req, res, 200, { items: rows.map(publicRecord) });
}

function getPlanRecord(req, res, id, dateKey) {
  if (!validateDateKey(dateKey)) {
    error(req, res, 400, '日期格式应为 YYYY-MM-DD');
    return;
  }
  const row = db.prepare('SELECT * FROM daily_records WHERE plan_id = ? AND date_key = ?').get(
    id,
    dateKey,
  );
  if (!row) {
    json(req, res, 200, { item: null });
    return;
  }
  json(req, res, 200, { item: publicRecord({ ...row, __withAttachment: true }) });
}

async function upsertPlanRecord(req, res, id, dateKey) {
  if (!rateLimit(req)) {
    error(req, res, 429, '操作过于频繁，请稍后再试');
    return;
  }
  if (!validateDateKey(dateKey)) {
    error(req, res, 400, '日期格式应为 YYYY-MM-DD');
    return;
  }
  const plan = db.prepare('SELECT id FROM plans WHERE id = ?').get(id);
  if (!plan) {
    error(req, res, 404, '计划不存在');
    return;
  }
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    error(req, res, err.status || 400, err.message || 'Invalid JSON body');
    return;
  }
  const validated = validateRecordInput(body);
  if (typeof validated === 'string') {
    error(req, res, 400, validated);
    return;
  }
  const now = new Date().toISOString();
  const existing = db
    .prepare('SELECT id FROM daily_records WHERE plan_id = ? AND date_key = ?')
    .get(id, dateKey);
  if (existing) {
    db.prepare(
      `UPDATE daily_records
       SET progress = ?, note = ?, attachment = ?, updated_at = ?
       WHERE plan_id = ? AND date_key = ?`,
    ).run(validated.progress, validated.note, validated.attachment, now, id, dateKey);
  } else {
    db.prepare(
      `INSERT INTO daily_records (id, plan_id, date_key, progress, note, attachment, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(crypto.randomUUID(), id, dateKey, validated.progress, validated.note, validated.attachment, now, now);
  }
  const row = db.prepare('SELECT * FROM daily_records WHERE plan_id = ? AND date_key = ?').get(
    id,
    dateKey,
  );
  json(req, res, 200, { item: publicRecord({ ...row, __withAttachment: true }) });
}

function deletePlanRecord(req, res, id, dateKey) {
  if (!validateDateKey(dateKey)) {
    error(req, res, 400, '日期格式应为 YYYY-MM-DD');
    return;
  }
  db.prepare('DELETE FROM daily_records WHERE plan_id = ? AND date_key = ?').run(id, dateKey);
  json(req, res, 200, { ok: true });
}

// ---------------------------------------------------------------------------
// 路由处理：里程碑
// ---------------------------------------------------------------------------

function listPlanMilestones(req, res, id) {
  const plan = db.prepare('SELECT id FROM plans WHERE id = ?').get(id);
  if (!plan) {
    error(req, res, 404, '计划不存在');
    return;
  }
  const rows = db
    .prepare('SELECT * FROM milestones WHERE plan_id = ? ORDER BY date_key ASC')
    .all(id);
  json(req, res, 200, { items: rows.map(publicMilestone) });
}

async function createPlanMilestone(req, res, id) {
  if (!rateLimit(req)) {
    error(req, res, 429, '操作过于频繁，请稍后再试');
    return;
  }
  const plan = db.prepare('SELECT id FROM plans WHERE id = ?').get(id);
  if (!plan) {
    error(req, res, 404, '计划不存在');
    return;
  }
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    error(req, res, err.status || 400, err.message || 'Invalid JSON body');
    return;
  }
  const dateKey = String(body.date || '').trim();
  if (!validateDateKey(dateKey)) {
    error(req, res, 400, '日期格式应为 YYYY-MM-DD');
    return;
  }
  const label = String(body.label || '').trim().slice(0, 60);
  if (!label) {
    error(req, res, 400, '里程碑名称不能为空');
    return;
  }
  const milestoneId = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO milestones (id, plan_id, date_key, label, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(milestoneId, id, dateKey, label, now);
  const row = db.prepare('SELECT * FROM milestones WHERE id = ?').get(milestoneId);
  json(req, res, 201, { item: publicMilestone(row) });
}

function deletePlanMilestone(req, res, id, milestoneId) {
  db.prepare('DELETE FROM milestones WHERE plan_id = ? AND id = ?').run(id, milestoneId);
  json(req, res, 200, { ok: true });
}

// ---------------------------------------------------------------------------
// 登录
// ---------------------------------------------------------------------------

async function login(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    error(req, res, err.status || 400, err.message || 'Invalid JSON body');
    return;
  }
  const password = String(body.password || '');
  if (!password) {
    error(req, res, 400, '请输入密码');
    return;
  }
  if (!JWT_SECRET || !PASSWORD_HASH || !PASSWORD_SALT) {
    error(req, res, 500, '服务端尚未配置登录密钥');
    return;
  }
  const guess = crypto.scryptSync(password, PASSWORD_SALT, 64);
  const stored = Buffer.from(PASSWORD_HASH, 'base64');
  const ok =
    guess.length === stored.length && crypto.timingSafeEqual(guess, stored);
  if (!ok) {
    error(req, res, 401, '密码不正确');
    return;
  }
  const token = signJWT({ role: 'owner' });
  json(req, res, 200, { token, expiresIn: JWT_TTL_MS });
}

// ---------------------------------------------------------------------------
// 主路由
// ---------------------------------------------------------------------------

function handle(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(req));
    res.end();
    return;
  }

  if (pathname === '/health') {
    json(req, res, 200, { ok: true });
    return;
  }

  // 登录：公开
  if (pathname === '/api/tracker/auth/login') {
    if (req.method === 'POST') {
      login(req, res);
      return;
    }
    error(req, res, 405, 'Method Not Allowed');
    return;
  }

  // 计划列表：公开只读
  if (pathname === '/api/tracker/plans') {
    if (req.method === 'GET') {
      listPlans(req, res);
      return;
    }
    if (req.method === 'POST') {
      if (!isAuthorized(req)) {
        error(req, res, 401, 'Unauthorized');
        return;
      }
      createPlan(req, res);
      return;
    }
    error(req, res, 405, 'Method Not Allowed');
    return;
  }

  // 单个计划：增删改需鉴权
  const planMatch = pathname.match(/^\/api\/tracker\/plans\/([^/]+)$/);
  if (planMatch) {
    const id = decodeURIComponent(planMatch[1]);
    if (req.method === 'PATCH') {
      if (!isAuthorized(req)) {
        error(req, res, 401, 'Unauthorized');
        return;
      }
      updatePlan(req, res, id);
      return;
    }
    if (req.method === 'DELETE') {
      if (!isAuthorized(req)) {
        error(req, res, 401, 'Unauthorized');
        return;
      }
      deletePlan(req, res, id);
      return;
    }
    error(req, res, 405, 'Method Not Allowed');
    return;
  }

  // 某计划的全年记录（热力图用）：公开只读
  const recordsYearMatch = pathname.match(
    /^\/api\/tracker\/plans\/([^/]+)\/records$/,
  );
  if (recordsYearMatch) {
    const id = decodeURIComponent(recordsYearMatch[1]);
    if (req.method === 'GET') {
      listPlanRecords(req, res, url, id);
      return;
    }
    error(req, res, 405, 'Method Not Allowed');
    return;
  }

  // 某计划的某天记录：GET 公开，PUT/DELETE 鉴权
  const recordDayMatch = pathname.match(
    /^\/api\/tracker\/plans\/([^/]+)\/records\/([^/]+)$/,
  );
  if (recordDayMatch) {
    const id = decodeURIComponent(recordDayMatch[1]);
    const dateKey = decodeURIComponent(recordDayMatch[2]);
    if (req.method === 'GET') {
      getPlanRecord(req, res, id, dateKey);
      return;
    }
    if (req.method === 'PUT') {
      if (!isAuthorized(req)) {
        error(req, res, 401, 'Unauthorized');
        return;
      }
      upsertPlanRecord(req, res, id, dateKey);
      return;
    }
    if (req.method === 'DELETE') {
      if (!isAuthorized(req)) {
        error(req, res, 401, 'Unauthorized');
        return;
      }
      deletePlanRecord(req, res, id, dateKey);
      return;
    }
    error(req, res, 405, 'Method Not Allowed');
    return;
  }

  // 里程碑：GET 公开，POST/DELETE 鉴权
  const milestonesMatch = pathname.match(
    /^\/api\/tracker\/plans\/([^/]+)\/milestones$/,
  );
  if (milestonesMatch) {
    const id = decodeURIComponent(milestonesMatch[1]);
    if (req.method === 'GET') {
      listPlanMilestones(req, res, id);
      return;
    }
    if (req.method === 'POST') {
      if (!isAuthorized(req)) {
        error(req, res, 401, 'Unauthorized');
        return;
      }
      createPlanMilestone(req, res, id);
      return;
    }
    error(req, res, 405, 'Method Not Allowed');
    return;
  }

  const milestoneDeleteMatch = pathname.match(
    /^\/api\/tracker\/plans\/([^/]+)\/milestones\/([^/]+)$/,
  );
  if (milestoneDeleteMatch) {
    const id = decodeURIComponent(milestoneDeleteMatch[1]);
    const milestoneId = decodeURIComponent(milestoneDeleteMatch[2]);
    if (req.method === 'DELETE') {
      if (!isAuthorized(req)) {
        error(req, res, 401, 'Unauthorized');
        return;
      }
      deletePlanMilestone(req, res, id, milestoneId);
      return;
    }
    error(req, res, 405, 'Method Not Allowed');
    return;
  }

  error(req, res, 404, 'Not Found');
}

const server = http.createServer((req, res) => {
  Promise.resolve(handle(req, res)).catch((err) => {
    console.error(err);
    if (!res.headersSent) error(req, res, 500, 'Internal Server Error');
  });
});

server.listen(PORT, HOST, () => {
  console.log(`tracker-api listening on http://${HOST}:${PORT}`);
  console.log(`tracker-api sqlite db: ${DB_PATH}`);
});
