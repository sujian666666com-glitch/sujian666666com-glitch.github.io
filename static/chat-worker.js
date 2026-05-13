/**
 * Cloudflare Worker — DashScope Chat API Proxy
 *
 * 环境变量（在 Cloudflare Dashboard 中配置）:
 *   DASHSCOPE_API_KEY  — DashScope API 密钥
 *   RAG_VECTORS_URL（可选）— 站内 rag-vectors.json 的绝对 URL（见 scripts/build-rag.mjs）
 *   RAG_TOP_K（可选）— 默认 4，命中片段条数上限
 *   BLOG_PUBLIC_BASE_URL（可选）— 站点根 URL 无尾斜杠，如 https://xxx.github.io ，用于旧索引补全文章链接
 *   DASHSCOPE_BASE_URL — 默认用北京兼容接口：
 *     https://dashscope.aliyuncs.com/compatible-mode/v1
 *     （配合控制台「通用」API Key，sk- 开头）
 *     coding.dashscope 域名仅面向部分 Coding Agents；若报 “only available for Coding Agents” 请勿用该域名。
 *
 * 部署步骤见文件底部注释。
 */

// ── 模型白名单 ──────────────────────────────────────────────
const ALLOWED_MODELS = new Set([
  'qwen-plus',
  'qwen-plus-latest',
  'qwen3.6-plus',
  'qwen3.5-plus',
  'qwen3-max-2026-01-23',
  'qwen3-coder-plus',
  'qwen3-coder-next',
  'glm-4.7',
  'glm-5',
  'kimi-k2.5',
  'MiniMax-M2.5',
]);

// ── 速率限制配置 ────────────────────────────────────────────
const RATE_LIMIT_MAX = 30;          // 每 IP 每窗口最大请求数
const RATE_LIMIT_WINDOW_MS = 60000; // 窗口大小（ms）

// 简单内存存储：{ ip: { count, resetAt } }
// 注意：Cloudflare Worker 实例是短暂的，每个 isolate 独立计数
// 生产环境建议升级为 Durable Objects 或 KV
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(ip, entry);
  }
  entry.count++;
  rateLimitMap.set(ip, entry);
  if (entry.count > RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { limited: true, retryAfter };
  }
  return { limited: false };
}

// ── CORS Headers ────────────────────────────────────────────
function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function handleOptions(request) {
  return new Response(null, { status: 200, headers: corsHeaders(request) });
}

/**
 * 在转发上游 SSE 时定期写入注释帧（RFC 8895 comment），避免客户端↔边缘之间
 * 长时间无数据被中间网络/负载均衡 RST（尤其「思考」模型长时间无 token 时）。
 * 前端只解析 data: 行，会自然忽略 : 注释。
 */
function withSseHeartbeats(upstreamBody, intervalMs = 20000) {
  if (!upstreamBody) {
    return upstreamBody;
  }
  const reader = upstreamBody.getReader();
  const enc = new TextEncoder();
  let inflight = reader.read();

  return new ReadableStream({
    async start(controller) {
      try {
        for (;;) {
          let timeoutId;
          const hb = new Promise((resolve) => {
            timeoutId = setTimeout(() => resolve('hb'), intervalMs);
          });
          const outcome = await Promise.race([
            inflight.then((r) => ({ kind: 'read', r })),
            hb.then(() => ({ kind: 'hb' })),
          ]);
          clearTimeout(timeoutId);

          if (outcome.kind === 'hb') {
            controller.enqueue(enc.encode(': keep-alive\n\n'));
            continue;
          }

          const { r } = outcome;
          if (r.done) {
            controller.close();
            return;
          }
          controller.enqueue(r.value);
          inflight = reader.read();
        }
      } catch (err) {
        controller.error(err);
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

// ── RAG（向量检索，与 scripts/build-rag.mjs 生成的 static/rag-vectors.json 配套）──
const RAG_INDEX_CACHE_MS = 5 * 60 * 1000;
let ragIndexCache = { url: '', data: null, expiresAt: 0 };

function getLastUserContent(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      const c = messages[i].content;
      return typeof c === 'string' ? c : '';
    }
  }
  return '';
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length || a.length === 0) return -1;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? -1 : dot / d;
}

async function fetchEmbeddingVector(env, baseURL, model, text) {
  const apiKey = env.DASHSCOPE_API_KEY;
  const url = `${baseURL.replace(/\/$/, '')}/embeddings`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: text.length > 8000 ? text.slice(0, 8000) : text,
    }),
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`embeddings ${res.status}: ${raw.slice(0, 200)}`);
  }
  const json = JSON.parse(raw);
  const emb = json.data && json.data[0] && json.data[0].embedding;
  if (!emb) throw new Error('no embedding in response');
  return emb;
}

/** content/.../*.md → 页面 URL */
function contentUrlFromSource(source, baseRaw) {
  const base = (baseRaw && String(baseRaw).replace(/\/$/, '')) || ''
  const norm = String(source || '').replace(/\\/g, '/')
  const m = norm.match(/^content\/(.+)\.md$/i)
  if (!base || !m) return ''
  return `${base}/${m[1]}/`
}

async function loadRagIndex(env) {
  const url = (env.RAG_VECTORS_URL || '').trim();
  if (!url) return null;
  const now = Date.now();
  if (ragIndexCache.url === url && ragIndexCache.data && now < ragIndexCache.expiresAt) {
    return ragIndexCache.data;
  }
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    console.warn('[RAG] index HTTP', res.status, url);
    return null;
  }
  try {
    const data = await res.json();
    ragIndexCache = { url, data, expiresAt: now + RAG_INDEX_CACHE_MS };
    return data;
  } catch (e) {
    console.warn('[RAG] parse JSON failed', e);
    return null;
  }
}

/**
 * 用用户最后一轮问题量 embedding，与索引余弦相似度取 Top-K，拼入首条 system（或新建 system）
 */
async function enrichMessagesWithRag(body, env) {
  const idx = await loadRagIndex(env);
  if (!idx || !Array.isArray(idx.chunks) || idx.chunks.length === 0) {
    return body;
  }

  const qText = getLastUserContent(body.messages).trim();
  if (qText.length < 2) return body;

  const baseURL =
    env.DASHSCOPE_BASE_URL ||
    'https://dashscope.aliyuncs.com/compatible-mode/v1';
  const embedModel = idx.embeddingModel || 'text-embedding-v4';
  let qVec;
  try {
    qVec = await fetchEmbeddingVector(env, baseURL, embedModel, qText);
  } catch (e) {
    console.warn('[RAG] query embedding failed', e);
    return body;
  }

  const topK = Math.min(
    8,
    Math.max(1, parseInt(String(env.RAG_TOP_K || '4'), 10) || 4),
  );
  const scored = [];
  for (const c of idx.chunks) {
    if (!c.embedding || !c.text) continue;
    const s = cosineSimilarity(qVec, c.embedding);
    scored.push({ s, c });
  }
  scored.sort((a, b) => b.s - a.s);
  const top = scored.slice(0, topK);
  if (top.length === 0) return body;

  const publicBase =
    (env.BLOG_PUBLIC_BASE_URL || '').trim() ||
    (idx.siteBaseUrl || '').trim() ||
    ''

  const ragBlock =
    '【本站 RAG：以下为从博文中检索到的片段，含标题与页面链接。】\n' +
    '请据此回答与博主文章相关的问题：归纳观点时注明出处；并输出「完整 https 链接」方便用户点击（不要用省略号截断 URL）。\n' +
    '若片段与用户问题无关，可说明并忽略。\n' +
    top
      .map((t, n) => {
        const c = t.c
        const title = c.title || '（未命名文章）'
        let link = (c.url || '').trim()
        if (!link && publicBase) {
          link = contentUrlFromSource(c.source, publicBase) || ''
        }
        let block = `[片段${n + 1}] 《${title}》\n`
        if (link) block += `页面链接（请原样提供给用户，便于点击）：${link}\n`
        block += `正文节选：\n${c.text}`
        return block
      })
      .join('\n\n---\n\n')

  const messages = body.messages.map((m) => ({ ...m }));
  const si = messages.findIndex((m) => m.role === 'system');
  if (si >= 0) {
    const prev =
      typeof messages[si].content === 'string' ? messages[si].content : '';
    messages[si] = { ...messages[si], content: `${prev}\n\n${ragBlock}` };
  } else {
    messages.unshift({ role: 'system', content: ragBlock });
  }
  return { ...body, messages };
}

// ── 匿名留言墙（Cloudflare D1）──────────────────────────────
const WALL_DAILY_LIMIT = 100;
const WALL_PAGE_LIMIT = 48;
const WALL_DUPLICATE_WINDOW_MS = 60 * 60 * 1000;
const WALL_SENSITIVE_WORDS = [
  '赌博',
  '博彩',
  '代开发票',
  '成人视频',
  '色情',
  '外挂',
  '贷款',
];

function wallJson(data, status, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(request),
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function wallError(status, message, request) {
  return wallJson({ error: message }, status, request);
}

function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    'unknown';
}

function toShanghaiDayKey(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const map = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }
  return `${map.year}-${map.month}-${map.day}`;
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

function ensureWallDB(env, request) {
  if (!env.WALL_DB) {
    return wallError(500, 'Server configuration error: missing WALL_DB', request);
  }
  return null;
}

async function listWallMessages(request, env) {
  const dbError = ensureWallDB(env, request);
  if (dbError) return dbError;

  const url = new URL(request.url);
  const rawLimit = parseInt(url.searchParams.get('limit') || String(WALL_PAGE_LIMIT), 10);
  const limit = Math.min(100, Math.max(1, rawLimit || WALL_PAGE_LIMIT));
  const cursor = (url.searchParams.get('cursor') || '').trim();

  let result;
  if (cursor) {
    result = await env.WALL_DB
      .prepare(
        'SELECT id, content, created_at FROM wall_messages WHERE status = ?1 AND created_at < ?2 ORDER BY created_at DESC, id DESC LIMIT ?3',
      )
      .bind('visible', cursor, limit + 1)
      .all();
  } else {
    result = await env.WALL_DB
      .prepare(
        'SELECT id, content, created_at FROM wall_messages WHERE status = ?1 ORDER BY created_at DESC, id DESC LIMIT ?2',
      )
      .bind('visible', limit + 1)
      .all();
  }

  const rows = result.results || [];
  const page = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? page[page.length - 1].created_at : '';
  return wallJson({
    items: page.map(publicWallItem),
    nextCursor,
  }, 200, request);
}

async function createWallMessage(request, env) {
  const dbError = ensureWallDB(env, request);
  if (dbError) return dbError;

  let body;
  try {
    body = await request.json();
  } catch {
    return wallError(400, 'Invalid JSON body', request);
  }

  const content = normalizeWallContent(body.content);
  const contentError = validateWallContent(content);
  if (contentError) {
    return wallError(400, contentError, request);
  }

  const now = new Date();
  const createdAt = now.toISOString();
  const dayKey = toShanghaiDayKey(now);
  const ip = getClientIP(request);
  const userAgent = (request.headers.get('User-Agent') || '').slice(0, 500);
  const referer = (request.headers.get('Referer') || '').slice(0, 500);
  const duplicateAfter = new Date(now.getTime() - WALL_DUPLICATE_WINDOW_MS).toISOString();

  const daily = await env.WALL_DB
    .prepare('SELECT COUNT(*) AS count FROM wall_messages WHERE day_key = ?1')
    .bind(dayKey)
    .first();
  if ((daily && Number(daily.count)) >= WALL_DAILY_LIMIT) {
    return wallError(429, '今天的小纸条已经放满了', request);
  }

  const duplicate = await env.WALL_DB
    .prepare('SELECT id FROM wall_messages WHERE ip = ?1 AND content = ?2 AND created_at >= ?3 LIMIT 1')
    .bind(ip, content, duplicateAfter)
    .first();
  if (duplicate) {
    return wallError(429, '这句话刚刚已经留下了。', request);
  }

  const id = crypto.randomUUID();
  await env.WALL_DB
    .prepare(
      'INSERT INTO wall_messages (id, content, status, created_at, day_key, ip, user_agent, referer) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)',
    )
    .bind(id, content, 'visible', createdAt, dayKey, ip, userAgent, referer)
    .run();

  return wallJson({
    item: publicWallItem({ id, content }),
  }, 201, request);
}

function isWallAdminAuthorized(request, env) {
  const expected = String(env.WALL_ADMIN_TOKEN || '').trim();
  if (!expected) return false;
  const header = request.headers.get('Authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  return token === expected;
}

async function listWallAdminMessages(request, env) {
  const dbError = ensureWallDB(env, request);
  if (dbError) return dbError;
  if (!isWallAdminAuthorized(request, env)) {
    return wallError(401, 'Unauthorized', request);
  }

  const result = await env.WALL_DB
    .prepare(
      'SELECT id, content, status, created_at, day_key, ip, user_agent, referer FROM wall_messages ORDER BY created_at DESC, id DESC LIMIT 500',
    )
    .all();
  return wallJson({ items: result.results || [] }, 200, request);
}

async function mutateWallAdminMessage(request, env, action, id) {
  const dbError = ensureWallDB(env, request);
  if (dbError) return dbError;
  if (!isWallAdminAuthorized(request, env)) {
    return wallError(401, 'Unauthorized', request);
  }
  if (!id) {
    return wallError(400, 'Missing message id', request);
  }

  if (action === 'delete') {
    await env.WALL_DB.prepare('DELETE FROM wall_messages WHERE id = ?1').bind(id).run();
  } else if (action === 'hide' || action === 'show') {
    const status = action === 'hide' ? 'hidden' : 'visible';
    await env.WALL_DB.prepare('UPDATE wall_messages SET status = ?1 WHERE id = ?2').bind(status, id).run();
  } else {
    return wallError(404, 'Not Found', request);
  }

  return wallJson({ ok: true }, 200, request);
}

async function handleWallRequest(request, env) {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';

  if (pathname === '/api/wall/messages') {
    if (request.method === 'GET') return listWallMessages(request, env);
    if (request.method === 'POST') return createWallMessage(request, env);
    return wallError(405, 'Method Not Allowed', request);
  }

  if (pathname === '/api/wall/admin/messages') {
    if (request.method === 'GET') return listWallAdminMessages(request, env);
    return wallError(405, 'Method Not Allowed', request);
  }

  const match = pathname.match(/^\/api\/wall\/admin\/messages\/([^/]+)(?:\/(hide|show))?$/);
  if (match) {
    const id = decodeURIComponent(match[1]);
    const action = request.method === 'DELETE' ? 'delete' : match[2];
    if (request.method === 'DELETE' || request.method === 'PATCH') {
      return mutateWallAdminMessage(request, env, action, id);
    }
    return wallError(405, 'Method Not Allowed', request);
  }

  return wallError(404, 'Not Found', request);
}

// ── 主处理逻辑 ──────────────────────────────────────────────
async function handleChatRequest(request, env) {
  // CORS 预检
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  // 仅允许 POST
  if (request.method !== 'POST') {
    return jsonError(405, 'Method Not Allowed', request);
  }

  // 速率限制
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rl = checkRateLimit(clientIP);
  if (rl.limited) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: {
        ...corsHeaders(request),
        'Content-Type': 'application/json',
        'Retry-After': String(rl.retryAfter),
      },
    });
  }

  // 解析请求体
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'Invalid JSON body', request);
  }

  // 校验必需字段
  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return jsonError(400, 'Field "messages" is required and must be a non-empty array', request);
  }
  if (!body.model || typeof body.model !== 'string') {
    return jsonError(400, 'Field "model" is required and must be a string', request);
  }

  // 模型白名单校验
  if (!ALLOWED_MODELS.has(body.model)) {
    return jsonError(400, `Model not allowed: ${body.model}`, request);
  }

  try {
    if (body.enable_rag !== false) {
      body = await enrichMessagesWithRag(body, env);
    }
  } catch (e) {
    console.warn('[RAG] enrich failed', e);
  }

  // 构造转发请求
  const apiKey = env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return jsonError(500, 'Server configuration error: missing API key', request);
  }

  const baseURL =
    env.DASHSCOPE_BASE_URL ||
    'https://dashscope.aliyuncs.com/compatible-mode/v1';
  const targetURL = `${baseURL.replace(/\/$/, '')}/chat/completions`;

  /** 默认流式；显式 `"stream": false` 时走单次 JSON，利于弱网/对流式不友好的路径 */
  const wantStream = body.stream !== false;

  const forwardBody = {
    model: body.model,
    messages: body.messages,
    stream: wantStream,
  };

  // 可选：思考模式
  if (body.enable_thinking === true) {
    forwardBody.enable_thinking = true;
  }
  if (typeof body.thinking_budget === 'number') {
    forwardBody.thinking_budget = body.thinking_budget;
  }

  const upstream = await fetch(targetURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(forwardBody),
  });

  // 如果上游返回错误，直接转发状态码和消息
  if (!upstream.ok) {
    const errText = await upstream.text();
    return new Response(errText, {
      status: upstream.status,
      headers: {
        ...corsHeaders(request),
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
      },
    });
  }

  if (!wantStream) {
    const text = await upstream.text();
    return new Response(text, {
      status: 200,
      headers: {
        ...corsHeaders(request),
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }

  // 流式转发 SSE（带心跳，降低连接被中间设备重置的概率）
  const outBody = withSseHeartbeats(upstream.body);
  return new Response(outBody, {
    status: 200,
    headers: {
      ...corsHeaders(request),
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  });
}

function jsonError(status, message, request) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      ...corsHeaders(request),
      'Content-Type': 'application/json',
    },
  });
}

// ── Worker 入口 ─────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/wall/')) {
      return handleWallRequest(request, env);
    }
    return handleChatRequest(request, env);
  },
};

/*
 * ══════════════════════════════════════════════════════════════
 * 部署说明
 * ══════════════════════════════════════════════════════════════
 *
 * 1. 安装 Wrangler CLI:
 *      npm install -g wrangler
 *
 * 2. 登录 Cloudflare:
 *      wrangler login
 *
 * 3. 在项目根目录创建 wrangler.toml（或使用现有的）:
 *      name = "blog-chat-proxy"
 *      main = "static/chat-worker.js"
 *      compatibility_date = "2024-01-01"
 *
 * 4. 设置环境变量（Secret）:
 *      wrangler secret put DASHSCOPE_API_KEY
 *      # 输入你的 DashScope API Key
 *
 *      wrangler secret put DASHSCOPE_BASE_URL（可选，也可用 wrangler.toml [vars]）
 *      # 通用 sk-： https://dashscope.aliyuncs.com/compatible-mode/v1
 *      # Coding sk-sp-： https://coding.dashscope.aliyuncs.com/v1
 *
 * 5. 部署:
 *      wrangler deploy
 *
 * 6. 记录 Worker URL（形如 https://blog-chat-proxy.<your-subdomain>.workers.dev）
 *    将该 URL 填入博客 .env 的 CHAT_PROXY_URL 变量。
 *
 * 回滚：在 Cloudflare Dashboard 删除 Worker 即可。
 * ══════════════════════════════════════════════════════════════
 */
