import http from 'node:http';

const PORT = Number(process.env.CHAT_API_PORT || 8788);
const HOST = process.env.CHAT_API_HOST || '127.0.0.1';
const BIGMODEL_API_KEY = String(
  process.env.BIGMODEL_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || '',
).trim();
function normalizeBaseUrl(value) {
  return String(value || '').replace(/\/+$/, '').replace(/\/v1$/i, '');
}

const BIGMODEL_ANTHROPIC_BASE_URL = normalizeBaseUrl(
  process.env.BIGMODEL_ANTHROPIC_BASE_URL ||
    process.env.ANTHROPIC_BASE_URL ||
    'https://open.bigmodel.cn/api/anthropic',
);
const BIGMODEL_EMBEDDING_BASE_URL = String(
  process.env.BIGMODEL_EMBEDDING_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
).replace(/\/$/, '');
const RAG_EMBEDDING_MODEL = String(process.env.RAG_EMBEDDING_MODEL || 'embedding-3').trim();
const RAG_EMBEDDING_DIMENSIONS = parseInt(String(process.env.RAG_EMBEDDING_DIMENSIONS || '1024'), 10) || 1024;
const BIGMODEL_MAX_TOKENS = parseInt(String(process.env.BIGMODEL_MAX_TOKENS || '2048'), 10) || 2048;
const RAG_VECTORS_URL = String(process.env.RAG_VECTORS_URL || '').trim();
const BLOG_PUBLIC_BASE_URL = String(process.env.BLOG_PUBLIC_BASE_URL || '').replace(/\/$/, '');
const RAG_TOP_K = Math.min(8, Math.max(1, parseInt(String(process.env.RAG_TOP_K || '4'), 10) || 4));
const MAX_JSON_BYTES = 1024 * 1024;

const ALLOWED_MODELS = new Set([
  'glm-5.1',
  'glm-5',
  'glm-5-turbo',
  'glm-4.7',
]);

const ALLOWED_ORIGINS = new Set(
  String(
    process.env.CHAT_ALLOWED_ORIGINS ||
      'https://sujian.online,https://www.sujian.online,https://sujian666666com-glitch.github.io',
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60000;
const RAG_INDEX_CACHE_MS = 5 * 60 * 1000;
const rateLimitMap = new Map();
let ragIndexCache = { url: '', data: null, expiresAt: 0 };

function corsHeaders(req) {
  const origin = String(req.headers.origin || '').trim();
  const headers = { Vary: 'Origin' };
  if (ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST,OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return headers;
}

function json(res, req, status, data, extra = {}) {
  res.writeHead(status, {
    ...corsHeaders(req),
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extra,
  });
  res.end(JSON.stringify(data));
}

function jsonError(res, req, status, message, extra = {}) {
  json(res, req, status, { error: message }, extra);
}

function getClientIP(req) {
  return (
    String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

function checkRateLimit(ip) {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }
  entry.count += 1;
  rateLimitMap.set(ip, entry);
  if (entry.count > RATE_LIMIT_MAX) {
    return { limited: true, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { limited: false };
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

function getLastUserContent(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'user') {
      return typeof messages[i].content === 'string' ? messages[i].content : '';
    }
  }
  return '';
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length || a.length === 0) return -1;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? -1 : dot / d;
}

function textFromContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item.text === 'string') return item.text;
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

async function fetchEmbeddingVector(model, text, dimensions) {
  if (!BIGMODEL_API_KEY) {
    throw new Error('missing BIGMODEL_API_KEY');
  }

  const body = {
    model,
    input: text.length > 6000 ? text.slice(0, 6000) : text,
  };
  if (Number.isFinite(dimensions) && dimensions > 0) {
    body.dimensions = dimensions;
  }

  const res = await fetch(`${BIGMODEL_EMBEDDING_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${BIGMODEL_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`embeddings ${res.status}: ${raw.slice(0, 200)}`);
  }
  const jsonBody = JSON.parse(raw);
  const emb = jsonBody.data && jsonBody.data[0] && jsonBody.data[0].embedding;
  if (!emb) throw new Error('no embedding in response');
  return emb;
}

function contentUrlFromSource(source, baseRaw) {
  const base = String(baseRaw || '').replace(/\/$/, '');
  const norm = String(source || '').replace(/\\/g, '/');
  const match = norm.match(/^content\/(.+)\.md$/i);
  if (!base || !match) return '';
  return `${base}/${match[1]}/`;
}

async function loadRagIndex() {
  if (!RAG_VECTORS_URL) return null;
  const now = Date.now();
  if (ragIndexCache.url === RAG_VECTORS_URL && ragIndexCache.data && now < ragIndexCache.expiresAt) {
    return ragIndexCache.data;
  }
  const res = await fetch(RAG_VECTORS_URL, { redirect: 'follow' });
  if (!res.ok) {
    console.warn('[RAG] index HTTP', res.status, RAG_VECTORS_URL);
    return null;
  }
  try {
    const data = await res.json();
    ragIndexCache = { url: RAG_VECTORS_URL, data, expiresAt: now + RAG_INDEX_CACHE_MS };
    return data;
  } catch (err) {
    console.warn('[RAG] parse JSON failed', err);
    return null;
  }
}

function getRagEmbeddingConfig(idx) {
  const model = String(idx.embeddingModel || RAG_EMBEDDING_MODEL).trim();
  const dimensions = parseInt(String(idx.embeddingDimensions || RAG_EMBEDDING_DIMENSIONS), 10) || RAG_EMBEDDING_DIMENSIONS;
  const provider = String(idx.embeddingProvider || '').trim();

  if (provider && provider !== 'bigmodel') {
    return null;
  }
  if (!model.startsWith('embedding-')) {
    return null;
  }
  return { model, dimensions };
}

async function enrichMessagesWithRag(body) {
  const idx = await loadRagIndex();
  if (!idx || !Array.isArray(idx.chunks) || idx.chunks.length === 0) return body;

  const embedConfig = getRagEmbeddingConfig(idx);
  if (!embedConfig) {
    console.warn('[RAG] index embedding config is not BigModel-compatible, skip RAG');
    return body;
  }

  const qText = getLastUserContent(body.messages).trim();
  if (qText.length < 2) return body;

  let qVec;
  try {
    qVec = await fetchEmbeddingVector(embedConfig.model, qText, embedConfig.dimensions);
  } catch (err) {
    console.warn('[RAG] query embedding failed', err);
    return body;
  }

  const scored = [];
  for (const c of idx.chunks) {
    if (!c.embedding || !c.text) continue;
    const score = cosineSimilarity(qVec, c.embedding);
    if (score >= 0) scored.push({ s: score, c });
  }
  scored.sort((a, b) => b.s - a.s);
  const top = scored.slice(0, RAG_TOP_K);
  if (top.length === 0) return body;

  const publicBase = BLOG_PUBLIC_BASE_URL || String(idx.siteBaseUrl || '').trim();
  const ragBlock =
    '【本站 RAG：以下为从博文中检索到的片段，含标题与页面链接。】\n' +
    '请据此回答与博主文章相关的问题：归纳观点时注明出处；并输出「完整 https 链接」方便用户点击（不要用省略号截断 URL）。\n' +
    '若片段与用户问题无关，可说明并忽略。\n' +
    top
      .map((t, n) => {
        const c = t.c;
        const title = c.title || '（未命名文章）';
        let link = String(c.url || '').trim();
        if (!link && publicBase) link = contentUrlFromSource(c.source, publicBase);
        let block = `[片段${n + 1}] 《${title}》\n`;
        if (link) block += `页面链接（请原样提供给用户，便于点击）：${link}\n`;
        block += `正文节选：\n${c.text}`;
        return block;
      })
      .join('\n\n---\n\n');

  const messages = body.messages.map((m) => ({ ...m }));
  const si = messages.findIndex((m) => m.role === 'system');
  if (si >= 0) {
    const prev = typeof messages[si].content === 'string' ? messages[si].content : '';
    messages[si] = { ...messages[si], content: `${prev}\n\n${ragBlock}` };
  } else {
    messages.unshift({ role: 'system', content: ragBlock });
  }
  return { ...body, messages };
}

function appendAnthropicMessage(messages, role, content) {
  const text = textFromContent(content).trim();
  if (!text) return;
  const last = messages[messages.length - 1];
  if (last && last.role === role) {
    last.content += `\n\n${text}`;
    return;
  }
  messages.push({ role, content: text });
}

function toAnthropicRequest(body, wantStream) {
  const systemParts = [];
  const messages = [];

  for (const message of body.messages) {
    if (!message || typeof message.role !== 'string') continue;
    if (message.role === 'system') {
      const text = textFromContent(message.content).trim();
      if (text) systemParts.push(text);
      continue;
    }
    if (message.role === 'user' || message.role === 'assistant') {
      appendAnthropicMessage(messages, message.role, message.content);
    }
  }

  const maxTokens =
    Number.isFinite(body.max_tokens) && body.max_tokens > 0
      ? Math.min(128000, Math.floor(body.max_tokens))
      : BIGMODEL_MAX_TOKENS;

  const payload = {
    model: body.model,
    max_tokens: maxTokens,
    messages,
    stream: wantStream,
  };
  if (systemParts.length > 0) {
    payload.system = systemParts.join('\n\n');
  }
  return payload;
}

function extractAnthropicText(message) {
  const out = { content: '', reasoning: '' };
  const parts = Array.isArray(message.content) ? message.content : [];
  for (const part of parts) {
    if (!part) continue;
    if (part.type === 'text' && typeof part.text === 'string') {
      out.content += part.text;
    } else if (part.type === 'thinking') {
      out.reasoning += part.thinking || part.text || '';
    }
  }
  if (!out.content && typeof message.content === 'string') {
    out.content = message.content;
  }
  if (!out.reasoning) {
    out.reasoning = message.reasoning_content || message.thinking || '';
  }
  return out;
}

function toOpenAiCompletion(message, model) {
  const text = extractAnthropicText(message);
  const assistantMessage = {
    role: 'assistant',
    content: text.content,
  };
  if (text.reasoning) {
    assistantMessage.reasoning_content = text.reasoning;
  }
  const usage = message.usage
    ? {
        prompt_tokens: message.usage.input_tokens || 0,
        completion_tokens: message.usage.output_tokens || 0,
        total_tokens: (message.usage.input_tokens || 0) + (message.usage.output_tokens || 0),
      }
    : undefined;

  return {
    id: message.id || `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: message.model || model,
    choices: [
      {
        index: 0,
        message: assistantMessage,
        finish_reason: message.stop_reason || 'stop',
      },
    ],
    ...(usage ? { usage } : {}),
  };
}

async function writeChunk(res, text) {
  if (!res.write(text)) {
    await new Promise((resolve) => res.once('drain', resolve));
  }
}

async function writeOpenAiSseDelta(res, model, delta) {
  const chunk = {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta }],
  };
  await writeChunk(res, `data: ${JSON.stringify(chunk)}\n\n`);
}

async function writeOpenAiSseDone(res) {
  await writeChunk(res, 'data: [DONE]\n\n');
}

async function dispatchAnthropicEvent(eventName, dataLines, model, res) {
  if (dataLines.length === 0) return false;
  const raw = dataLines.join('\n').trim();
  if (!raw) return false;
  if (raw === '[DONE]') {
    await writeOpenAiSseDone(res);
    return true;
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return false;
  }

  const type = eventName || payload.type || '';
  if (type === 'error' || payload.error) {
    const err = payload.error || payload;
    const msg = err.message || err.error || '上游流式响应错误';
    await writeOpenAiSseDelta(res, model, { content: `\n[上游错误：${msg}]` });
    await writeOpenAiSseDone(res);
    return true;
  }

  if (type === 'content_block_start') {
    const block = payload.content_block || {};
    if (block.type === 'text' && block.text) {
      await writeOpenAiSseDelta(res, model, { content: block.text });
    } else if (block.type === 'thinking' && (block.thinking || block.text)) {
      await writeOpenAiSseDelta(res, model, { reasoning_content: block.thinking || block.text });
    }
    return false;
  }

  if (type === 'content_block_delta') {
    const delta = payload.delta || {};
    if (delta.type === 'text_delta' && delta.text) {
      await writeOpenAiSseDelta(res, model, { content: delta.text });
    } else if (delta.type === 'thinking_delta' && (delta.thinking || delta.text)) {
      await writeOpenAiSseDelta(res, model, { reasoning_content: delta.thinking || delta.text });
    }
    return false;
  }

  if (type === 'message_stop') {
    await writeOpenAiSseDone(res);
    return true;
  }

  return false;
}

async function forwardAnthropicStream(upstream, req, res, model) {
  res.writeHead(200, {
    ...corsHeaders(req),
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
    Connection: 'keep-alive',
  });

  if (!upstream.body) {
    await writeOpenAiSseDone(res);
    res.end();
    return;
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const current = { event: '', data: [] };
  let buffer = '';
  let sentDone = false;
  const heartbeat = setInterval(() => {
    if (!res.destroyed) res.write(': keep-alive\n\n');
  }, 20000);

  async function flushCurrent() {
    const done = await dispatchAnthropicEvent(current.event, current.data, model, res);
    sentDone = sentDone || done;
    current.event = '';
    current.data = [];
  }

  async function processLine(rawLine) {
    const line = rawLine.replace(/\r$/, '');
    if (line === '') {
      await flushCurrent();
      return;
    }
    if (line.startsWith(':')) return;
    if (line.startsWith('event:')) {
      current.event = line.slice(6).trim();
      return;
    }
    if (line.startsWith('data:')) {
      current.data.push(line.slice(5).trimStart());
    }
  }

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        await processLine(line);
      }
    }
    buffer += decoder.decode();
    if (buffer) {
      await processLine(buffer);
    }
    if (current.data.length > 0) {
      await flushCurrent();
    }
    if (!sentDone && !res.destroyed) {
      await writeOpenAiSseDone(res);
    }
    res.end();
  } finally {
    clearInterval(heartbeat);
  }
}

async function callAnthropicMessages(body, wantStream) {
  const payload = toAnthropicRequest(body, wantStream);
  if (payload.messages.length === 0) {
    return {
      error: { status: 400, message: 'At least one user or assistant message is required' },
    };
  }

  const upstream = await fetch(`${BIGMODEL_ANTHROPIC_BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': BIGMODEL_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(payload),
  });
  return { upstream };
}

async function handleChat(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(req));
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    jsonError(res, req, 405, 'Method Not Allowed');
    return;
  }

  const rateLimit = checkRateLimit(getClientIP(req));
  if (rateLimit.limited) {
    jsonError(res, req, 429, 'Rate limit exceeded', { 'Retry-After': String(rateLimit.retryAfter) });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    jsonError(res, req, err.status || 400, err.message || 'Invalid JSON body');
    return;
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    jsonError(res, req, 400, 'Field "messages" is required and must be a non-empty array');
    return;
  }
  if (!body.model || typeof body.model !== 'string') {
    jsonError(res, req, 400, 'Field "model" is required and must be a string');
    return;
  }
  if (!ALLOWED_MODELS.has(body.model)) {
    jsonError(res, req, 400, `Model not allowed: ${body.model}`);
    return;
  }
  if (!BIGMODEL_API_KEY) {
    jsonError(res, req, 500, 'Server configuration error: missing BIGMODEL_API_KEY');
    return;
  }

  try {
    if (body.enable_rag !== false) body = await enrichMessagesWithRag(body);
  } catch (err) {
    console.warn('[RAG] enrich failed', err);
  }

  const wantStream = body.stream !== false;
  const { upstream, error } = await callAnthropicMessages(body, wantStream);
  if (error) {
    jsonError(res, req, error.status, error.message);
    return;
  }

  if (!upstream.ok) {
    const errText = await upstream.text();
    res.writeHead(upstream.status, {
      ...corsHeaders(req),
      'Content-Type': upstream.headers.get('Content-Type') || 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(errText);
    return;
  }

  if (!wantStream) {
    const raw = await upstream.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      jsonError(res, req, 502, 'Upstream response is not valid JSON');
      return;
    }
    json(res, req, 200, toOpenAiCompletion(data, body.model));
    return;
  }

  await forwardAnthropicStream(upstream, req, res, body.model);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/health') {
    json(res, req, 200, { ok: true });
    return;
  }
  if (url.pathname.replace(/\/+$/, '') === '/api/chat') {
    Promise.resolve(handleChat(req, res)).catch((err) => {
      console.error(err);
      if (!res.headersSent) jsonError(res, req, 500, 'Internal Server Error');
      else res.destroy(err);
    });
    return;
  }
  jsonError(res, req, 404, 'Not Found');
});

server.listen(PORT, HOST, () => {
  console.log(`chat-api listening on http://${HOST}:${PORT}`);
});
