import http from 'node:http';

const PORT = Number(process.env.MUSIC_API_PORT || 8789);
const HOST = process.env.MUSIC_API_HOST || '127.0.0.1';
const MUSIC_API_UPSTREAM = normalizeBaseUrl(
  process.env.MUSIC_API_UPSTREAM || 'http://127.0.0.1:3000',
);

const ALLOWED_ORIGINS = new Set(
  String(
    process.env.MUSIC_ALLOWED_ORIGINS ||
      process.env.CHAT_ALLOWED_ORIGINS ||
      process.env.WALL_ALLOWED_ORIGINS ||
      'https://sujian.online,https://www.sujian.online,https://sujian666666com-glitch.github.io',
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const SEARCH_CACHE_MS = 60 * 1000;
const URL_CACHE_MS = 10 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 8000;
const MAX_QUERY_LENGTH = 80;
const MAX_LIMIT = 20;

const searchCache = new Map();
const urlCache = new Map();

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function corsHeaders(req) {
  const origin = String(req.headers.origin || '').trim();
  const headers = { Vary: 'Origin' };
  if (ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET,OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return headers;
}

function json(req, res, status, data, extra = {}) {
  res.writeHead(status, {
    ...corsHeaders(req),
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extra,
  });
  res.end(JSON.stringify(data));
}

function error(req, res, status, message) {
  json(req, res, status, { error: message });
}

function getCached(cache, key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function setCached(cache, key, data, ttl) {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

function normalizedId(value) {
  const id = String(value || '').trim();
  return /^\d+$/.test(id) ? id : '';
}

function normalizedLimit(value) {
  const raw = parseInt(String(value || '10'), 10);
  return Math.min(MAX_LIMIT, Math.max(1, raw || 10));
}

function normalizedQuery(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, MAX_QUERY_LENGTH);
}

function buildUpstreamUrl(pathname, params) {
  const url = new URL(pathname, `${MUSIC_API_UPSTREAM}/`);
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

async function fetchUpstream(pathname, params) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(buildUpstreamUrl(pathname, params), {
      signal: controller.signal,
      redirect: 'follow',
      headers: { Accept: 'application/json' },
    });
    const raw = await res.text();
    if (!res.ok) {
      throw new Error(`upstream ${res.status}: ${raw.slice(0, 180)}`);
    }
    try {
      return raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error('upstream response is not valid JSON');
    }
  } finally {
    clearTimeout(timer);
  }
}

function artistNames(song) {
  const list = song?.artists || song?.ar || song?.artist || [];
  if (!Array.isArray(list)) return [];
  return list
    .map((artist) => String(artist?.name || artist || '').trim())
    .filter(Boolean);
}

function normalizeSongItem(song) {
  const album = song?.album || song?.al || {};
  const id = song?.id;
  const name = String(song?.name || '').trim();
  if (!id || !name) return null;
  return {
    id,
    name,
    artists: artistNames(song),
    album: String(album?.name || '').trim(),
    picUrl: String(album?.picUrl || song?.picUrl || '').trim(),
    duration: Number(song?.duration || song?.dt || 0) || 0,
  };
}

function normalizeSearchResult(data, limit) {
  const songs = data?.result?.songs || data?.songs || [];
  if (!Array.isArray(songs)) return [];
  return songs.map(normalizeSongItem).filter(Boolean).slice(0, limit);
}

function normalizeUrlResult(data, id) {
  const items = data?.data || data?.urls || [];
  const first = Array.isArray(items)
    ? items.find((item) => String(item?.id || id) === String(id)) || items[0]
    : null;
  const url = String(first?.url || '').trim();
  const playable = Boolean(url) && Number(first?.code || 200) !== 404;
  return {
    id: Number(id),
    url: playable ? url : '',
    playable,
  };
}

function normalizeDetailResult(data) {
  const songs = data?.songs || data?.result?.songs || [];
  if (!Array.isArray(songs) || songs.length === 0) return null;
  return normalizeSongItem(songs[0]);
}

async function handleSearch(req, res, url) {
  const q = normalizedQuery(url.searchParams.get('q'));
  if (!q) {
    error(req, res, 400, 'missing_query');
    return;
  }
  const limit = normalizedLimit(url.searchParams.get('limit'));
  const cacheKey = `${q}::${limit}`;
  const cached = getCached(searchCache, cacheKey);
  if (cached) {
    json(req, res, 200, cached);
    return;
  }

  try {
    const data = await fetchUpstream('/search', { keywords: q, limit, type: 1 });
    const payload = { items: normalizeSearchResult(data, limit) };
    setCached(searchCache, cacheKey, payload, SEARCH_CACHE_MS);
    json(req, res, 200, payload);
  } catch (err) {
    console.warn('[music] search failed:', err.message);
    error(req, res, 503, 'music_unavailable');
  }
}

async function handleUrl(req, res, url) {
  const id = normalizedId(url.searchParams.get('id'));
  if (!id) {
    error(req, res, 400, 'missing_song_id');
    return;
  }
  const cached = getCached(urlCache, id);
  if (cached) {
    json(req, res, 200, cached);
    return;
  }

  try {
    const data = await fetchUpstream('/song/url/v1', { id, level: 'standard' });
    const payload = normalizeUrlResult(data, id);
    setCached(urlCache, id, payload, URL_CACHE_MS);
    json(req, res, 200, payload);
  } catch (err) {
    console.warn('[music] url failed:', err.message);
    error(req, res, 503, 'music_unavailable');
  }
}

async function handleSong(req, res, url) {
  const id = normalizedId(url.searchParams.get('id'));
  if (!id) {
    error(req, res, 400, 'missing_song_id');
    return;
  }

  try {
    const data = await fetchUpstream('/song/detail', { ids: id });
    const item = normalizeDetailResult(data);
    if (!item) {
      error(req, res, 404, 'song_not_found');
      return;
    }
    json(req, res, 200, { item });
  } catch (err) {
    console.warn('[music] song detail failed:', err.message);
    error(req, res, 503, 'music_unavailable');
  }
}

async function handle(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(req));
    res.end();
    return;
  }

  if (pathname === '/health') {
    if (req.method !== 'GET') {
      error(req, res, 405, 'Method Not Allowed');
      return;
    }
    json(req, res, 200, {
      ok: true,
      service: 'music-api',
      upstream: MUSIC_API_UPSTREAM,
    });
    return;
  }

  if (req.method !== 'GET') {
    error(req, res, 405, 'Method Not Allowed');
    return;
  }

  if (pathname === '/api/music/search') {
    await handleSearch(req, res, url);
    return;
  }
  if (pathname === '/api/music/url') {
    await handleUrl(req, res, url);
    return;
  }
  if (pathname === '/api/music/song') {
    await handleSong(req, res, url);
    return;
  }

  error(req, res, 404, 'Not Found');
}

const server = http.createServer((req, res) => {
  Promise.resolve(handle(req, res)).catch((err) => {
    console.error(err);
    if (!res.headersSent) error(req, res, 500, 'Internal Server Error');
    else res.destroy(err);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`music-api listening on http://${HOST}:${PORT}`);
  console.log(`music-api upstream: ${MUSIC_API_UPSTREAM}`);
});
