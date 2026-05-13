import http from 'node:http';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const PORT = Number(process.env.WALL_API_PORT || 8787);
const HOST = process.env.WALL_API_HOST || '127.0.0.1';
const DB_PATH = process.env.WALL_DB_PATH || '/var/lib/my-blog-wall/wall.db';
const ADMIN_TOKEN = String(process.env.WALL_ADMIN_TOKEN || '').trim();
const ALLOWED_ORIGINS = new Set(
  String(
    process.env.WALL_ALLOWED_ORIGINS ||
      'https://sujian.online,https://www.sujian.online,https://sujian666666com-glitch.github.io',
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const WALL_DAILY_LIMIT = 100;
const WALL_PAGE_LIMIT = 48;
const WALL_DUPLICATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_JSON_BYTES = 4096;
const WALL_SENSITIVE_WORDS = [
  '赌博',
  '博彩',
  '代开发票',
  '成人视频',
  '色情',
  '外挂',
  '贷款',
];

mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS wall_messages (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'visible',
    created_at TEXT NOT NULL,
    day_key TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT,
    referer TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_wall_messages_status_created_at
    ON wall_messages (status, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_wall_messages_day_key
    ON wall_messages (day_key);

  CREATE INDEX IF NOT EXISTS idx_wall_messages_ip_created_at
    ON wall_messages (ip, created_at DESC);
`);

function corsHeaders(req) {
  const origin = String(req.headers.origin || '').trim();
  const headers = {
    Vary: 'Origin',
  };
  if (ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET,POST,PATCH,DELETE,OPTIONS';
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

function normalizeWallContent(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function wallTextLength(value) {
  return Array.from(value).length;
}

function validateWallContent(content) {
  const length = wallTextLength(content);
  if (length < 1) return '先写一句话。';
  if (length > 80) return '最多 80 字。';
  if (/[<>]/.test(content) || /&(?:lt|gt|#60|#62);/i.test(content)) {
    return '这里只收纯文本。';
  }
  if (/(https?:\/\/|www\.|[a-z0-9-]+\.(?:com|net|org|cn|io|xyz|top|shop|site|club|vip)\b)/i.test(content)) {
    return '这里不放链接。';
  }
  const lower = content.toLowerCase();
  for (const word of WALL_SENSITIVE_WORDS) {
    if (lower.includes(word.toLowerCase())) {
      return '这句话暂时不能留下。';
    }
  }
  return '';
}

function toShanghaiDayKey(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const map = {};
  for (const part of parts) map[part.type] = part.value;
  return `${map.year}-${map.month}-${map.day}`;
}

function hashWallSeed(value) {
  let hash = 2166136261;
  const str = String(value || '');
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function publicWallItem(row) {
  return {
    id: row.id,
    content: row.content,
    seed: hashWallSeed(row.id),
  };
}

function getClientIP(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket.remoteAddress || 'unknown';
}

function getReferer(req) {
  return String(req.headers.referer || '').slice(0, 500);
}

function getUserAgent(req) {
  return String(req.headers['user-agent'] || '').slice(0, 500);
}

function tokenEquals(left, right) {
  if (!left || !right) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function isWallAdminAuthorized(req) {
  const header = String(req.headers.authorization || '');
  const token = header.replace(/^Bearer\s+/i, '').trim();
  return tokenEquals(token, ADMIN_TOKEN);
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

function listWallMessages(req, res, url) {
  const rawLimit = parseInt(url.searchParams.get('limit') || String(WALL_PAGE_LIMIT), 10);
  const limit = Math.min(100, Math.max(1, rawLimit || WALL_PAGE_LIMIT));
  const cursor = String(url.searchParams.get('cursor') || '').trim();

  const rows = cursor
    ? db.prepare(
        'SELECT id, content, created_at FROM wall_messages WHERE status = ? AND created_at < ? ORDER BY created_at DESC, id DESC LIMIT ?',
      ).all('visible', cursor, limit + 1)
    : db.prepare(
        'SELECT id, content, created_at FROM wall_messages WHERE status = ? ORDER BY created_at DESC, id DESC LIMIT ?',
      ).all('visible', limit + 1);

  const page = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? page[page.length - 1].created_at : '';
  json(req, res, 200, {
    items: page.map(publicWallItem),
    nextCursor,
  });
}

async function createWallMessage(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    error(req, res, err.status || 400, err.message || 'Invalid JSON body');
    return;
  }

  const content = normalizeWallContent(body.content);
  const contentError = validateWallContent(content);
  if (contentError) {
    error(req, res, 400, contentError);
    return;
  }

  const now = new Date();
  const createdAt = now.toISOString();
  const dayKey = toShanghaiDayKey(now);
  const ip = getClientIP(req);
  const userAgent = getUserAgent(req);
  const referer = getReferer(req);
  const duplicateAfter = new Date(now.getTime() - WALL_DUPLICATE_WINDOW_MS).toISOString();

  const daily = db
    .prepare('SELECT COUNT(*) AS count FROM wall_messages WHERE day_key = ?')
    .get(dayKey);
  if ((daily && Number(daily.count)) >= WALL_DAILY_LIMIT) {
    error(req, res, 429, '今天的小纸条已经放满了');
    return;
  }

  const duplicate = db
    .prepare('SELECT id FROM wall_messages WHERE ip = ? AND content = ? AND created_at >= ? LIMIT 1')
    .get(ip, content, duplicateAfter);
  if (duplicate) {
    error(req, res, 429, '这句话刚刚已经留下了。');
    return;
  }

  const id = randomUUID();
  db.prepare(
    'INSERT INTO wall_messages (id, content, status, created_at, day_key, ip, user_agent, referer) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(id, content, 'visible', createdAt, dayKey, ip, userAgent, referer);

  json(req, res, 201, { item: publicWallItem({ id, content }) });
}

function listWallAdminMessages(req, res) {
  if (!isWallAdminAuthorized(req)) {
    error(req, res, 401, 'Unauthorized');
    return;
  }

  const rows = db
    .prepare('SELECT id, content, status, created_at, day_key, ip, user_agent, referer FROM wall_messages ORDER BY created_at DESC, id DESC LIMIT 500')
    .all();
  json(req, res, 200, { items: rows });
}

function mutateWallAdminMessage(req, res, action, id) {
  if (!isWallAdminAuthorized(req)) {
    error(req, res, 401, 'Unauthorized');
    return;
  }
  if (!id) {
    error(req, res, 400, 'Missing message id');
    return;
  }

  if (action === 'delete') {
    db.prepare('DELETE FROM wall_messages WHERE id = ?').run(id);
  } else if (action === 'hide' || action === 'show') {
    const status = action === 'hide' ? 'hidden' : 'visible';
    db.prepare('UPDATE wall_messages SET status = ? WHERE id = ?').run(status, id);
  } else {
    error(req, res, 404, 'Not Found');
    return;
  }

  json(req, res, 200, { ok: true });
}

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

  if (pathname === '/api/wall/messages') {
    if (req.method === 'GET') {
      listWallMessages(req, res, url);
      return;
    }
    if (req.method === 'POST') {
      createWallMessage(req, res);
      return;
    }
    error(req, res, 405, 'Method Not Allowed');
    return;
  }

  if (pathname === '/api/wall/admin/messages') {
    if (req.method === 'GET') {
      listWallAdminMessages(req, res);
      return;
    }
    error(req, res, 405, 'Method Not Allowed');
    return;
  }

  const match = pathname.match(/^\/api\/wall\/admin\/messages\/([^/]+)(?:\/(hide|show))?$/);
  if (match) {
    const id = decodeURIComponent(match[1]);
    const action = req.method === 'DELETE' ? 'delete' : match[2];
    if (req.method === 'DELETE' || req.method === 'PATCH') {
      mutateWallAdminMessage(req, res, action, id);
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
  console.log(`wall-api listening on http://${HOST}:${PORT}`);
  console.log(`wall-api sqlite db: ${DB_PATH}`);
});
