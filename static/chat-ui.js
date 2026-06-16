// ── Chat Widget JS — loaded as external file ──────────────
// Config is read from data attributes on #chatPanel

(function () {
  'use strict';

  var panel = document.getElementById('chatPanel');
  if (!panel) return;

  // ── Configuration ────────────────────────────────────────
  // proxy 地址仍由 Hugo 渲染（部署配置，非聊天内容）；
  // 展示类配置（标题/头像/模型/建议词）改为异步拉取 /api/chat-config。
  // systemPrompt 不在前端持有，由后端权威注入。
  var PROXY_URL = panel.getAttribute('data-proxy') || '';
  var PROXY_FALLBACK = (panel.getAttribute('data-proxy-fallback') || '').trim();

  // 展示类配置默认值，loadChatConfig() 拉取成功后会覆盖
  var DEFAULT_MODEL = 'glm-5.1';
  var SUGGESTED_PROMPTS = [];
  var ASSISTANT_LABEL = '小k';
  var ASSISTANT_AVATAR_IMAGE = '';
  var USER_LABEL = '';

  // chat-config 接口地址：与 PROXY_URL 同源
  function chatConfigURL() {
    if (!PROXY_URL) return '/api/chat-config';
    try {
      var u = new URL(PROXY_URL);
      u.pathname = '/api/chat-config';
      u.search = '';
      u.hash = '';
      return u.toString();
    } catch (_) {
      return '/api/chat-config';
    }
  }

  var configLoaded = false;
  function loadChatConfig() {
    fetch(chatConfigURL(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (cfg) {
        if (!cfg) return;
        configLoaded = true;
        DEFAULT_MODEL = cfg.defaultModel || DEFAULT_MODEL;
        SUGGESTED_PROMPTS = Array.isArray(cfg.suggestedPrompts) ? cfg.suggestedPrompts : SUGGESTED_PROMPTS;
        ASSISTANT_LABEL = cfg.assistantAvatarLabel || ASSISTANT_LABEL;
        ASSISTANT_AVATAR_IMAGE = cfg.assistantAvatarImage || ASSISTANT_AVATAR_IMAGE;
        USER_LABEL = cfg.userAvatarLabel != null ? cfg.userAvatarLabel : USER_LABEL;

        applyChatConfig(cfg);
      })
      .catch(function () { /* 降级用默认值，不阻塞聊天 */ });
  }

  // 拿到配置后填充 DOM：头像/标题/模型下拉
  function applyChatConfig(cfg) {
    if (ASSISTANT_AVATAR_IMAGE) {
      var bubbleImg = document.getElementById('chatBubbleImg');
      if (bubbleImg) bubbleImg.src = ASSISTANT_AVATAR_IMAGE;
      var headerAvatar = document.getElementById('chatHeaderAvatar');
      if (headerAvatar) headerAvatar.src = ASSISTANT_AVATAR_IMAGE;
      var profileAvatar = document.getElementById('chatProfileAvatar');
      if (profileAvatar) profileAvatar.src = ASSISTANT_AVATAR_IMAGE;
    }
    if (cfg.panelTitle) {
      var titleEl = document.getElementById('chatHeaderTitle');
      if (titleEl) titleEl.textContent = cfg.panelTitle;
    }
    // 填充模型下拉
    if (modelSelect && Array.isArray(cfg.models) && cfg.models.length > 0) {
      modelSelect.innerHTML = '';
      for (var i = 0; i < cfg.models.length; i++) {
        var opt = document.createElement('option');
        opt.value = cfg.models[i].id;
        opt.textContent = cfg.models[i].label;
        if (cfg.models[i].id === DEFAULT_MODEL) opt.selected = true;
        modelSelect.appendChild(opt);
      }
    }
    // 配置到位后，若欢迎页已显示且没有历史消息，用新配置重渲染一次（补建议词 chips）。
    if (welcomeVisible && messages.length === 0) showWelcome();
  }

  function makeAvatarEl(role) {
    // 用户侧无文案时不渲染头像（避免出现空灰圈）
    if (role === 'user' && !String(USER_LABEL).trim()) {
      return null;
    }
    var el = document.createElement('div');
    el.className = 'chat-msg-avatar chat-msg-avatar--' + role;
    if (role === 'assistant') {
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', '查看小 k 资料');
      el.addEventListener('click', openProfile);
      el.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openProfile(event);
        }
      });
    } else {
      el.setAttribute('aria-hidden', 'true');
    }
    if (role === 'assistant' && ASSISTANT_AVATAR_IMAGE) {
      var img = document.createElement('img');
      img.src = ASSISTANT_AVATAR_IMAGE;
      img.alt = ASSISTANT_LABEL;
      el.appendChild(img);
    } else {
      var label = role === 'assistant' ? ASSISTANT_LABEL : USER_LABEL;
      if (label) el.textContent = label;
    }
    return el;
  }
  var HISTORY_KEY = 'chat_history';
  var HISTORY_LIMIT = 100;

  // ── DOM ──────────────────────────────────────────────────
  var bubble = document.getElementById('chatBubble');
  var messagesEl = document.getElementById('chatMessages');
  var inputEl = document.getElementById('chatInput');
  var sendBtn = document.getElementById('chatSendBtn');
  var closeBtn = document.getElementById('chatCloseBtn');
  var clearBtn = document.getElementById('chatClearBtn');
  var profileBtn = document.getElementById('chatProfileBtn');
  var profileCard = document.getElementById('chatProfileCard');
  var profileBackdrop = document.getElementById('chatProfileBackdrop');
  var profileCloseBtn = document.getElementById('chatProfileCloseBtn');
  var modelSelect = document.getElementById('chatModelSelect');
  var thinkToggle = document.getElementById('chatThinkToggle');
  var ragToggle = document.getElementById('chatRagToggle');
  var compatToggle = document.getElementById('chatCompatToggle');
  var musicBtn = document.getElementById('chatMusicBtn');
  var musicPanel = document.getElementById('chatMusicPanel');
  var musicSearchForm = document.getElementById('chatMusicSearchForm');
  var musicSearchInput = document.getElementById('chatMusicSearchInput');
  var musicSearchBtn = document.getElementById('chatMusicSearchBtn');
  var musicStatusEl = document.getElementById('chatMusicStatus');
  var musicResultsEl = document.getElementById('chatMusicResults');
  var musicQueueEl = document.getElementById('chatMusicQueue');
  var musicCoverEl = document.getElementById('chatMusicCover');
  var musicTitleEl = document.getElementById('chatMusicTitle');
  var musicArtistEl = document.getElementById('chatMusicArtist');
  var musicProgressEl = document.getElementById('chatMusicProgress');
  var musicTimeEl = document.getElementById('chatMusicTime');
  var musicPrevBtn = document.getElementById('chatMusicPrevBtn');
  var musicPlayBtn = document.getElementById('chatMusicPlayBtn');
  var musicNextBtn = document.getElementById('chatMusicNextBtn');
  var musicVolumeEl = document.getElementById('chatMusicVolume');

  // ── State ────────────────────────────────────────────────
  var messages = [];
  var isStreaming = false;
  var abortCtrl = null;
  var welcomeVisible = true;
  var musicAudio = new Audio();
  var musicQueue = [];
  var musicCurrentIndex = -1;
  var musicSearchAbort = null;
  var musicSeeking = false;
  musicAudio.preload = 'none';
  musicAudio.volume = musicVolumeEl ? Number(musicVolumeEl.value || 0.75) : 0.75;

  // ── SVG Helpers ──────────────────────────────────────────
  var CHEVRON_SVG = '<svg class="chat-thinking-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';

  // ── Markdown Renderer ────────────────────────────────────
  var CB = '\u0000'; // placeholder sentinel
  var RE_FENCED = new RegExp('```(\\w*)\\n([\\s\\S]*?)```', 'g');
  var RE_TRIM_NL = new RegExp('\\n$');
  var RE_CB_TEST = new RegExp('^' + CB + 'CODEBLOCK\\d+' + CB + '$');
  var RE_CB_RESTORE = new RegExp(CB + 'CODEBLOCK(\\d+)' + CB, 'g');
  var RE_BOLD = new RegExp('\\*\\*(.+?)\\*\\*', 'g');
  var RE_ITALIC = new RegExp('(?<!\\*)\\*(?!\\*)(.+?)(?<!\\*)\\*(?!\\*)', 'g');
  var RE_INLINE_CODE = new RegExp('`([^`]+)`', 'g');
  var RE_LINK_MD = new RegExp('\\[([^\\]]+)\\]\\(([^)]+)\\)', 'g');
  var RE_BARE_URL = new RegExp('(^|[^">])(https?:\\/\\/[^\\s<]+)', 'g');
  var RE_URL_TRAIL = new RegExp('[\u3002\uff0c\u3001\uff01\uff1f;\uff1b:\uff1a\uff09\\]\u300d\u3015\u2019\u201d\u00b4\u2018]+$');
  var RE_PLAY_MARKER = new RegExp('\\{\\{play:([^|{}\\n]{1,80})\\|([^{}\\n]{1,80})\\}\\}');
  var RE_PLAY_MARKER_ALL = new RegExp('\\{\\{play:([^|{}\\n]{1,80})\\|([^{}\\n]{1,80})\\}\\}', 'g');

  function escapeHtml(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
  }

  function renderMarkdown(raw) {
    if (!raw) return '';
    var src = String(raw);

    // 1. Extract fenced code blocks to protect them from inline processing
    var codeBlocks = [];
    src = src.replace(RE_FENCED, function (_, lang, code) {
      var idx = codeBlocks.length;
      codeBlocks.push({ lang: lang || '', code: code.replace(RE_TRIM_NL, '') });
      return CB + 'CODEBLOCK' + idx + CB;
    });

    // 2. Split into lines for paragraph processing
    var lines = src.split('\n');
    var out = '';
    var inParagraph = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      if (RE_CB_TEST.test(line)) {
        if (inParagraph) { out += '</p>'; inParagraph = false; }
        out += line;
        continue;
      }

      if (line.trim() === '') {
        if (inParagraph) { out += '</p>'; inParagraph = false; }
        continue;
      }

      if (!inParagraph) {
        out += '<p>';
        inParagraph = true;
      } else {
        out += '<br>';
      }

      out += processInline(line);
    }
    if (inParagraph) out += '</p>';

    // 3. Restore code blocks as HTML
    out = out.replace(RE_CB_RESTORE, function (_, idxStr) {
      var block = codeBlocks[parseInt(idxStr, 10)];
      var langLabel = block.lang ? block.lang : 'code';
      var escapedCode = escapeHtml(block.code);
      return '<div class="chat-code-block">' +
        '<div class="chat-code-header">' +
        '<span class="chat-code-lang">' + escapeHtml(langLabel) + '</span>' +
        '<button class="chat-code-copy" data-copy>复制</button>' +
        '</div>' +
        '<pre><code>' + escapedCode + '</code></pre>' +
        '</div>';
    });

    // 4. Auto-detect bare URLs
    out = out.replace(RE_BARE_URL, function (match, prefix, url) {
      var clean = url.replace(RE_URL_TRAIL, '');
      return prefix + '<a href="' + escapeHtml(clean) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(clean) + '</a>';
    });

    return out;
  }

  function processInline(line) {
    var s = escapeHtml(line);
    s = s.replace(RE_BOLD, '<strong>$1</strong>');
    s = s.replace(RE_ITALIC, '<em>$1</em>');
    s = s.replace(RE_INLINE_CODE, '<code>$1</code>');
    s = s.replace(RE_LINK_MD, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return s;
  }

  function extractPlayMarker(raw) {
    var match = String(raw || '').match(RE_PLAY_MARKER);
    if (!match) return null;
    var title = match[1].trim().slice(0, 80);
    var artist = match[2].trim().slice(0, 80);
    if (!title || !artist) return null;
    return { title: title, artist: artist, raw: match[0] };
  }

  function stripPlayMarkers(raw) {
    return String(raw || '')
      .replace(RE_PLAY_MARKER_ALL, '')
      .replace(/\{\{play:[\s\S]*$/g, '');
  }

  function renderMusicMarkerCard(marker) {
    return '<div class="chat-music-marker-card">' +
      '<span class="chat-music-marker-icon">♪</span>' +
      '<span>已加入播放器：' + escapeHtml(marker.title) + ' · ' + escapeHtml(marker.artist) + '</span>' +
      '</div>';
  }

  function renderAssistantContent(raw) {
    var marker = extractPlayMarker(raw);
    var html = renderMarkdown(stripPlayMarkers(raw));
    if (marker) html += renderMusicMarkerCard(marker);
    return html;
  }

  // ── Welcome Screen ───────────────────────────────────────
  function createWelcome() {
    var el = document.createElement('div');
    el.className = 'chat-welcome';
    el.id = 'chatWelcome';

    var icon = document.createElement('div');
    icon.className = 'chat-welcome-icon';
    icon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>';
    el.appendChild(icon);

    var greeting = document.createElement('div');
    greeting.className = 'chat-welcome-greeting';
    greeting.textContent = 'Hi! 有什么可以帮你的？';
    el.appendChild(greeting);

    var sub = document.createElement('div');
    sub.className = 'chat-welcome-sub';
    sub.textContent = '我是这个博客的 AI 助手，可以帮你了解文章内容。试试下面的问题，或者直接输入你的问题。';
    el.appendChild(sub);

    if (SUGGESTED_PROMPTS.length > 0) {
      var chips = document.createElement('div');
      chips.className = 'chat-welcome-chips';
      for (var i = 0; i < SUGGESTED_PROMPTS.length; i++) {
        var chip = document.createElement('button');
        chip.className = 'chat-welcome-chip';
        chip.textContent = SUGGESTED_PROMPTS[i];
        chip.setAttribute('data-prompt', SUGGESTED_PROMPTS[i]);
        chip.addEventListener('click', onChipClick);
        chips.appendChild(chip);
      }
      el.appendChild(chips);
    }

    return el;
  }

  function showWelcome() {
    removeWelcome();
    messagesEl.appendChild(createWelcome());
    welcomeVisible = true;
  }

  function removeWelcome() {
    var el = document.getElementById('chatWelcome');
    if (el) el.remove();
    welcomeVisible = false;
  }

  function onChipClick() {
    var prompt = this.getAttribute('data-prompt');
    if (prompt) {
      inputEl.value = prompt;
      sendMessage();
    }
  }

  function openProfile(event) {
    if (event) event.stopPropagation();
    if (!profileCard) return;
    profileCard.hidden = false;
  }

  function closeProfile() {
    if (!profileCard) return;
    profileCard.hidden = true;
  }

  // ── Music Player ────────────────────────────────────────
  function musicApiURL(endpoint, params) {
    var base = window.location.origin;
    if (PROXY_URL) {
      try {
        base = new URL(PROXY_URL, window.location.href).origin;
      } catch (_) {}
    }
    var url = new URL('/api/music/' + endpoint, base);
    Object.keys(params || {}).forEach(function (key) {
      var value = params[key];
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
    return url.toString();
  }

  function setMusicOpen(open) {
    if (!musicPanel || !musicBtn) return;
    musicPanel.hidden = !open;
    musicBtn.classList.toggle('active', open);
    musicBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function setMusicStatus(text, tone) {
    if (!musicStatusEl) return;
    musicStatusEl.textContent = text || '';
    musicStatusEl.dataset.tone = tone || '';
  }

  function setMusicBusy(busy) {
    if (musicSearchBtn) musicSearchBtn.disabled = !!busy;
    if (musicSearchInput) musicSearchInput.disabled = !!busy;
  }

  function formatMusicTime(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
    var total = Math.floor(seconds);
    var min = Math.floor(total / 60);
    var sec = String(total % 60).padStart(2, '0');
    return min + ':' + sec;
  }

  function trackArtists(track) {
    return Array.isArray(track && track.artists) && track.artists.length
      ? track.artists.join(' / ')
      : '未知歌手';
  }

  function trackDurationSeconds(track) {
    var duration = Number(track && track.duration);
    if (!Number.isFinite(duration) || duration <= 0) return 0;
    return duration > 1000 ? duration / 1000 : duration;
  }

  function updateMusicTime() {
    if (!musicTimeEl || !musicProgressEl) return;
    var duration = Number.isFinite(musicAudio.duration) && musicAudio.duration > 0
      ? musicAudio.duration
      : trackDurationSeconds(musicQueue[musicCurrentIndex]);
    var current = Number.isFinite(musicAudio.currentTime) ? musicAudio.currentTime : 0;
    musicTimeEl.textContent = formatMusicTime(current) + ' / ' + formatMusicTime(duration);
    if (!musicSeeking) {
      musicProgressEl.value = duration > 0 ? String(Math.min(100, (current / duration) * 100)) : '0';
    }
  }

  function renderMusicQueue() {
    if (!musicQueueEl) return;
    musicQueueEl.innerHTML = '';
    if (musicQueue.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'chat-music-empty';
      empty.textContent = '队列还是空的';
      musicQueueEl.appendChild(empty);
      return;
    }
    for (var i = 0; i < musicQueue.length; i++) {
      var track = musicQueue[i];
      var btn = document.createElement('button');
      btn.className = 'chat-music-queue-item' + (i === musicCurrentIndex ? ' active' : '');
      btn.type = 'button';
      btn.setAttribute('data-index', String(i));
      btn.innerHTML = '<span>' + escapeHtml(track.name || '未知歌曲') + '</span><small>' + escapeHtml(trackArtists(track)) + '</small>';
      btn.addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-index') || '-1', 10);
        playMusicAt(idx, true);
      });
      musicQueueEl.appendChild(btn);
    }
  }

  function updateMusicNowPlaying() {
    var track = musicQueue[musicCurrentIndex];
    if (track) {
      if (musicCoverEl) {
        if (track.picUrl) {
          musicCoverEl.src = track.picUrl;
          musicCoverEl.alt = track.name || '';
        } else {
          musicCoverEl.removeAttribute('src');
          musicCoverEl.alt = '';
        }
      }
      if (musicTitleEl) musicTitleEl.textContent = track.name || '未知歌曲';
      if (musicArtistEl) musicArtistEl.textContent = trackArtists(track);
    } else {
      if (musicCoverEl) {
        musicCoverEl.removeAttribute('src');
        musicCoverEl.alt = '';
      }
      if (musicTitleEl) musicTitleEl.textContent = '还没有歌曲';
      if (musicArtistEl) musicArtistEl.textContent = '等待加入队列';
    }
    if (musicPlayBtn) {
      musicPlayBtn.setAttribute('aria-label', musicAudio.paused ? '播放' : '暂停');
      musicPlayBtn.innerHTML = musicAudio.paused
        ? '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7V5zm6 0h4v14h-4V5z" fill="currentColor"/></svg>';
    }
    if (musicPrevBtn) musicPrevBtn.disabled = musicCurrentIndex <= 0;
    if (musicNextBtn) musicNextBtn.disabled = musicCurrentIndex < 0 || musicCurrentIndex >= musicQueue.length - 1;
    updateMusicTime();
    renderMusicQueue();
  }

  async function fetchMusicJSON(endpoint, params, signal) {
    var resp = await fetch(musicApiURL(endpoint, params), { cache: 'no-store', signal: signal });
    var data = null;
    try { data = await resp.json(); } catch (_) {}
    if (!resp.ok || (data && data.error)) {
      var code = data && data.error ? data.error : 'music_unavailable';
      throw new Error(code);
    }
    return data || {};
  }

  function normalizeMusicText(value) {
    return String(value || '').toLowerCase().replace(/\s+/g, '');
  }

  function pickBestMusicMatch(items, marker) {
    if (!Array.isArray(items) || items.length === 0) return null;
    var wantedTitle = normalizeMusicText(marker.title);
    var wantedArtist = normalizeMusicText(marker.artist);
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var titleMatches = normalizeMusicText(item.name) === wantedTitle;
      var artistMatches = normalizeMusicText(trackArtists(item)).indexOf(wantedArtist) !== -1;
      if (titleMatches && artistMatches) return item;
    }
    return items[0];
  }

  function renderMusicResults(items) {
    if (!musicResultsEl) return;
    musicResultsEl.innerHTML = '';
    if (!Array.isArray(items) || items.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'chat-music-empty';
      empty.textContent = '没有搜到合适的歌曲';
      musicResultsEl.appendChild(empty);
      return;
    }
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var btn = document.createElement('button');
      btn.className = 'chat-music-result';
      btn.type = 'button';
      btn.setAttribute('data-index', String(i));
      btn.innerHTML = '<span>' + escapeHtml(item.name || '未知歌曲') + '</span><small>' + escapeHtml(trackArtists(item)) + '</small>';
      btn.addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-index') || '-1', 10);
        if (items[idx]) addMusicTrack(items[idx], true, true);
      });
      musicResultsEl.appendChild(btn);
    }
  }

  async function searchMusic(query) {
    if (musicSearchAbort) musicSearchAbort.abort();
    var controller = new AbortController();
    musicSearchAbort = controller;
    setMusicBusy(true);
    setMusicStatus('正在搜索...', '');
    try {
      var data = await fetchMusicJSON('search', { q: query, limit: 10 }, controller.signal);
      renderMusicResults(data.items || []);
      setMusicStatus((data.items || []).length ? '选择一首加入队列' : '没有搜到合适的歌曲', (data.items || []).length ? '' : 'warn');
      return data.items || [];
    } catch (err) {
      if (err.name !== 'AbortError') {
        renderMusicResults([]);
        setMusicStatus(err.message === 'music_unavailable' ? '音乐暂时不可用，聊天不受影响。' : '搜索失败，请稍后再试。', 'warn');
      }
      return [];
    } finally {
      if (musicSearchAbort === controller) {
        setMusicBusy(false);
        musicSearchAbort = null;
      }
    }
  }

  async function ensureMusicUrl(track) {
    if (track.url || track.playable === false) return track;
    var data = await fetchMusicJSON('url', { id: track.id });
    track.url = data.url || '';
    track.playable = data.playable !== false && Boolean(track.url);
    return track;
  }

  async function addMusicTrack(item, shouldPlay, userInitiated) {
    var track = {
      id: item.id,
      name: item.name,
      artists: Array.isArray(item.artists) ? item.artists : [],
      album: item.album || '',
      picUrl: item.picUrl || '',
      duration: Number(item.duration || 0) || 0,
    };
    musicQueue.push(track);
    var index = musicQueue.length - 1;
    renderMusicQueue();
    if (shouldPlay || musicCurrentIndex === -1) {
      await playMusicAt(index, !!userInitiated);
    } else {
      setMusicStatus('已加入队列：' + track.name, '');
    }
  }

  async function playMusicAt(index, userInitiated) {
    if (index < 0 || index >= musicQueue.length) return;
    musicCurrentIndex = index;
    updateMusicNowPlaying();
    var track = musicQueue[musicCurrentIndex];
    try {
      setMusicStatus('正在准备：' + track.name, '');
      await ensureMusicUrl(track);
      if (!track.playable || !track.url) {
        setMusicStatus('这首歌暂时不可播放。', 'warn');
        updateMusicNowPlaying();
        return;
      }
      if (musicAudio.src !== track.url) {
        musicAudio.src = track.url;
      }
      await musicAudio.play();
      setMusicStatus('正在播放：' + track.name, 'ok');
    } catch (err) {
      setMusicOpen(true);
      setMusicStatus(userInitiated ? '播放失败，请换一首试试。' : '浏览器拦截了自动播放，请点播放按钮。', 'warn');
    } finally {
      updateMusicNowPlaying();
    }
  }

  async function toggleMusicPlayback() {
    if (musicCurrentIndex === -1 && musicQueue.length > 0) {
      await playMusicAt(0, true);
      return;
    }
    if (musicAudio.paused) {
      try {
        await musicAudio.play();
        setMusicStatus('继续播放。', 'ok');
      } catch (_) {
        setMusicStatus('浏览器需要你再点一次播放。', 'warn');
      }
    } else {
      musicAudio.pause();
      setMusicStatus('已暂停。', '');
    }
    updateMusicNowPlaying();
  }

  async function playNextMusic() {
    if (musicCurrentIndex < musicQueue.length - 1) {
      await playMusicAt(musicCurrentIndex + 1, true);
    }
  }

  async function playPrevMusic() {
    if (musicCurrentIndex > 0) {
      await playMusicAt(musicCurrentIndex - 1, true);
    }
  }

  async function handleAssistantMusic(content) {
    var marker = extractPlayMarker(content);
    if (!marker) return;
    setMusicOpen(true);
    setMusicStatus('小 k 正在把歌放进播放器...', '');
    var items = await searchMusic(marker.title + ' ' + marker.artist);
    var picked = pickBestMusicMatch(items, marker);
    if (!picked) {
      setMusicStatus('没搜到这首歌，先不打扰聊天。', 'warn');
      return;
    }
    await addMusicTrack(picked, true, false);
  }

  // ── Panel Open/Close ─────────────────────────────────────
  bubble.addEventListener('click', function () {
    var isOpen = panel.classList.toggle('open');
    bubble.classList.remove('chat-bubble--pulse');
    if (isOpen) {
      if (messages.length === 0 && !welcomeVisible) {
        showWelcome();
      } else if (messages.length > 0 && (messagesEl.children.length === 0 || document.getElementById('chatWelcome'))) {
        renderAllMessages();
      }
      openProfile();
      inputEl.focus();
    } else {
      closeProfile();
    }
  });

  closeBtn.addEventListener('click', function () {
    panel.classList.remove('open');
    closeProfile();
  });

  // ── localStorage Persistence ─────────────────────────────
  function saveHistory() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-HISTORY_LIMIT)));
    } catch (_) {}
  }

  function loadHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        messages = JSON.parse(raw);
        if (!Array.isArray(messages)) messages = [];
        if (messages.length > 0) welcomeVisible = false;
      }
    } catch (_) { messages = []; }
  }

  function clearHistory() {
    messages = [];
    messagesEl.innerHTML = '';
    localStorage.removeItem(HISTORY_KEY);
    showWelcome();
  }
  clearBtn.addEventListener('click', clearHistory);
  if (profileBtn) profileBtn.addEventListener('click', openProfile);
  if (profileBackdrop) profileBackdrop.addEventListener('click', closeProfile);
  if (profileCloseBtn) profileCloseBtn.addEventListener('click', closeProfile);

  // ── Code Copy Handler ────────────────────────────────────
  messagesEl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (!btn) return;
    var block = btn.closest('.chat-code-block');
    if (!block) return;
    var code = block.querySelector('code');
    if (!code) return;
    navigator.clipboard.writeText(code.textContent).then(function () {
      btn.textContent = '已复制';
      setTimeout(function () { btn.textContent = '复制'; }, 1500);
    });
  });

  // ── Render Messages ──────────────────────────────────────
  function createThinkingBlock(parent, beforeEl, thinking) {
    var thinkBlock = document.createElement('div');
    // 默认折叠；流式阶段不再自动展开（避免干扰阅读）
    thinkBlock.className = 'chat-thinking-block';
    var toggle = document.createElement('div');
    toggle.className = 'chat-thinking-toggle';
    toggle.innerHTML = CHEVRON_SVG + '<span>思考过程</span>';
    toggle.addEventListener('click', function () { thinkBlock.classList.toggle('open'); });
    var thinkContent = document.createElement('div');
    thinkContent.className = 'chat-thinking-content';
    var thinkInner = document.createElement('div');
    thinkInner.className = 'chat-thinking-inner';
    if (thinking) thinkInner.textContent = thinking;
    thinkContent.appendChild(thinkInner);
    thinkBlock.appendChild(toggle);
    thinkBlock.appendChild(thinkContent);
    if (beforeEl && beforeEl.parentNode === parent) {
      parent.insertBefore(thinkBlock, beforeEl);
    } else {
      parent.appendChild(thinkBlock);
    }
    return thinkBlock;
  }

  function createMsgEl(role, content, thinking) {
    var row = document.createElement('div');
    row.className = 'chat-msg-row chat-msg-row--' + role;

    var avatar = makeAvatarEl(role);

    var body = document.createElement('div');
    body.className = 'chat-msg-body';

    var bubble = document.createElement('div');
    bubble.className = 'chat-msg-bubble chat-msg-bubble--' + role;

    var textSpan = document.createElement('div');
    textSpan.className = 'chat-msg-text';
    textSpan.innerHTML = role === 'assistant' ? renderAssistantContent(content || '') : escapeHtml(content || '');
    body.appendChild(bubble);
    bubble.appendChild(textSpan);

    if (role === 'assistant' && thinking) {
      createThinkingBlock(body, bubble, thinking);
    }

    if (role === 'user') {
      row.appendChild(body);
      if (avatar) row.appendChild(avatar);
    } else {
      row.appendChild(avatar);
      row.appendChild(body);
    }

    return row;
  }

  function renderAllMessages() {
    messagesEl.innerHTML = '';
    if (messages.length === 0) { showWelcome(); return; }
    removeWelcome();
    for (var i = 0; i < messages.length; i++) {
      messagesEl.appendChild(createMsgEl(messages[i].role, messages[i].content, messages[i].thinking));
    }
    scrollToBottom();
  }

  function scrollToBottom() { messagesEl.scrollTop = messagesEl.scrollHeight; }

  function showError(text) {
    var div = document.createElement('div');
    div.className = 'chat-msg chat-msg-error';
    div.textContent = text;
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function showLoading() {
    var row = document.createElement('div');
    row.className = 'chat-loading-row';
    row.id = 'chatLoading';
    var avatar = makeAvatarEl('assistant');
    var inner = document.createElement('div');
    inner.className = 'chat-loading';
    for (var i = 0; i < 3; i++) {
      var bar = document.createElement('span');
      bar.className = 'chat-loading-bar';
      inner.appendChild(bar);
    }
    row.appendChild(avatar);
    row.appendChild(inner);
    messagesEl.appendChild(row);
    scrollToBottom();
  }

  function removeLoading() {
    var el = document.getElementById('chatLoading');
    if (el) el.remove();
  }

  // ── Send Message ─────────────────────────────────────────
  function setStreaming(v) { isStreaming = v; sendBtn.disabled = v; inputEl.disabled = v; }
  function getSelectedModel() { return modelSelect ? (modelSelect.value || DEFAULT_MODEL) : DEFAULT_MODEL; }
  function isThinkingEnabled() { return !!(thinkToggle && thinkToggle.checked); }
  function isRagEnabled() { return ragToggle ? ragToggle.checked : true; }

  function isAbortError(err) {
    return !!(err && err.name === 'AbortError');
  }

  /** 此类状态码直接展示错误，不再换端点/非流式重试 */
  function shouldStopRetryOnStatus(status) {
    return status === 400 || status === 401 || status === 403 || status === 429;
  }

  function isWorkersDevUrl(url) {
    return /(^https?:\/\/)?[^/]+\.workers\.dev(\/|$)/i.test(String(url || '').trim());
  }

  function buildFetchFailureHint() {
    var hints = [];

    if (compatToggle && !compatToggle.checked) {
      hints.push('已自动尝试流式与非流式');
    } else {
      hints.push('当前已是非流式模式，可多试几次');
    }

    if (PROXY_FALLBACK) {
      hints.push('当前已配置备用地址，前端会自动切换主/备代理');
    } else if (isWorkersDevUrl(PROXY_URL)) {
      hints.push('当前代理使用 workers.dev，在部分网络环境下可能被浏览器直接拦截；建议为 Worker 绑定自有域名，并在 hugo.yaml 的 proxyFallbackURL 填写备用地址');
    } else {
      hints.push('可在 hugo.yaml 的 proxyFallbackURL 填写备用地址');
    }

    hints.push('当前代理地址：' + PROXY_URL);
    return hints.join('；');
  }

  async function consumeSseStream(resp, assistantMsg, msgEl, captureThinking) {
    var textSpan = msgEl.querySelector('.chat-msg-text');
    var thinkBlock = null;
    var reader = resp.body.getReader();
    var decoder = new TextDecoder();
    var buffer = '';
    while (true) {
      var result = await reader.read();
      if (result.done) break;
      buffer += decoder.decode(result.value, { stream: true });

      var lines = buffer.split('\n');
      buffer = lines.pop();

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line.startsWith('data: ')) continue;
        var data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          var chunk = JSON.parse(data);
          var delta = chunk.choices && chunk.choices[0] && chunk.choices[0].delta;
          if (!delta) continue;

          var thinkText = captureThinking
            ? (delta.reasoning_content || delta.thinking || '')
            : '';
          if (thinkText) {
            assistantMsg.thinking += thinkText;
            if (!thinkBlock) {
              var bodyEl = msgEl.querySelector('.chat-msg-body');
              var bubbleEl = msgEl.querySelector('.chat-msg-bubble');
              if (bodyEl && bubbleEl) {
                thinkBlock = createThinkingBlock(bodyEl, bubbleEl, null);
              }
            }
            var inner = thinkBlock && thinkBlock.querySelector('.chat-thinking-inner');
            if (inner) inner.textContent = assistantMsg.thinking;
          }

          var contentText = delta.content || '';
          if (contentText) {
            assistantMsg.content += contentText;
            textSpan.innerHTML = renderAssistantContent(assistantMsg.content);
          }
        } catch (_) {}
      }
      scrollToBottom();
    }
  }

  async function consumeJsonCompletion(resp, assistantMsg, msgEl, captureThinking) {
    var raw = await resp.text();
    var data;
    try {
      data = JSON.parse(raw);
    } catch (_) {
      throw new Error('响应不是合法 JSON');
    }
    if (data.error) {
      var em = formatApiError(raw);
      throw new Error(em || '上游返回错误');
    }
    var choice = data.choices && data.choices[0];
    var msg = choice && choice.message;
    if (!msg) throw new Error('响应格式异常');

    var thinkText = captureThinking
      ? (msg.reasoning_content || msg.thinking || '')
      : '';
    var contentText = msg.content || '';

    assistantMsg.thinking = thinkText;
    assistantMsg.content = contentText;

    var textSpan = msgEl.querySelector('.chat-msg-text');
    if (thinkText) {
      var bodyEl = msgEl.querySelector('.chat-msg-body');
      var bubbleEl = msgEl.querySelector('.chat-msg-bubble');
      if (bodyEl && bubbleEl) {
        createThinkingBlock(bodyEl, bubbleEl, thinkText);
      }
    }
    textSpan.innerHTML = renderAssistantContent(contentText);
    scrollToBottom();
  }

  function formatApiError(errBody) {
    if (!errBody) return '';
    try {
      var data = JSON.parse(errBody);
      var e = data.error;
      if (typeof e === 'string') return e;
      if (e && typeof e === 'object') {
        if (e.code === 'Arrearage' || e.type === 'Arrearage' || /overdue-payment|account is in good standing/i.test(e.message || '')) {
          var arrearageMsg = '小 k 的模型服务账号状态异常：DashScope 返回欠费/停服，请先到阿里云 Model Studio 处理欠费或更换服务器上的 DASHSCOPE_API_KEY';
          if (data.request_id) arrearageMsg += ' [request_id: ' + data.request_id + ']';
          return arrearageMsg;
        }
        var msg = e.message || e.code || '';
        if (e.param) msg = (msg ? msg + ' ' : '') + 'param: ' + e.param;
        if (msg) { if (data.request_id) msg += ' [request_id: ' + data.request_id + ']'; return msg; }
      }
      if (data.message) return data.message;
      return JSON.stringify(data);
    } catch (_) { return errBody; }
  }

  async function sendMessage() {
    var text = inputEl.value.trim();
    if (!text || isStreaming) return;

    if (!PROXY_URL) { showError('聊天功能未配置：缺少代理地址'); return; }

    if (welcomeVisible) removeWelcome();

    messages.push({ role: 'user', content: text });
    messagesEl.appendChild(createMsgEl('user', text));
    inputEl.value = '';
    inputEl.style.height = 'auto';
    scrollToBottom();
    saveHistory();

    var apiMessages = messages.filter(function (m) {
      return m.role === 'user' || m.role === 'assistant';
    }).map(function (m) {
      return { role: m.role, content: m.role === 'assistant' ? stripPlayMarkers(m.content) : m.content };
    });

    // systemPrompt 不再由前端发送，后端 /api/chat 会权威注入。

    var captureThinking = isThinkingEnabled();
    var baseBody = {
      model: getSelectedModel(),
      messages: apiMessages,
      enable_rag: isRagEnabled(),
    };
    if (captureThinking) baseBody.enable_thinking = true;

    var endpoints = [PROXY_URL];
    if (PROXY_FALLBACK && PROXY_FALLBACK !== PROXY_URL) {
      endpoints.push(PROXY_FALLBACK);
    }

    var wantStreamModes = (compatToggle && compatToggle.checked) ? [false] : [true, false];

    setStreaming(true);
    showLoading();
    abortCtrl = new AbortController();

    var done = false;
    var aborted = false;
    var lastFailMsg = '';

    try {
      outer:
      for (var ei = 0; ei < endpoints.length; ei++) {
        for (var si = 0; si < wantStreamModes.length; si++) {
          var useStream = wantStreamModes[si];
          var reqBody = Object.assign({}, baseBody, { stream: useStream });
          try {
            var resp = await fetch(endpoints[ei], {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(reqBody),
              signal: abortCtrl.signal,
              cache: 'no-store',
            });
            removeLoading();

            if (!resp.ok) {
              var errBody = '';
              try { errBody = await resp.text(); } catch (_) {}
              if (shouldStopRetryOnStatus(resp.status)) {
                var errMsg = resp.status === 429 ? '请求过于频繁，请稍后再试' : '请求失败 (' + resp.status + ')';
                if (errBody) {
                  var formatted = formatApiError(errBody);
                  if (formatted) errMsg = formatted;
                }
                showError(errMsg);
                break outer;
              }
              lastFailMsg = 'HTTP ' + resp.status;
              showLoading();
              continue;
            }

            var assistantMsg = { role: 'assistant', content: '', thinking: '' };
            messages.push(assistantMsg);
            var msgEl = createMsgEl('assistant', '', '');
            messagesEl.appendChild(msgEl);

            try {
              if (useStream) {
                await consumeSseStream(resp, assistantMsg, msgEl, captureThinking);
              } else {
                await consumeJsonCompletion(resp, assistantMsg, msgEl, captureThinking);
              }
            } catch (consumeErr) {
              messages.pop();
              msgEl.remove();
              if (isAbortError(consumeErr)) {
                aborted = true;
                break outer;
              }
              lastFailMsg = consumeErr.message || String(consumeErr);
              showLoading();
              continue;
            }

            saveHistory();
            handleAssistantMusic(assistantMsg.content);
            done = true;
            break outer;
          } catch (err) {
            removeLoading();
            if (isAbortError(err)) {
              aborted = true;
              break outer;
            }
            lastFailMsg = err.message || '连接失败';
            if (ei < endpoints.length - 1 || si < wantStreamModes.length - 1) {
              showLoading();
            }
          }
        }
      }

      if (!done && !aborted) {
        var hint = buildFetchFailureHint();
        showError(lastFailMsg ? (lastFailMsg + '。' + hint) : ('连接失败，请检查网络。' + hint));
      }
    } finally {
      setStreaming(false);
      abortCtrl = null;
    }
  }

  // ── Event Bindings ───────────────────────────────────────
  if (musicBtn) {
    musicBtn.addEventListener('click', function () {
      setMusicOpen(!musicPanel || musicPanel.hidden);
      if (musicPanel && !musicPanel.hidden && musicSearchInput) musicSearchInput.focus();
    });
  }
  if (musicSearchForm) {
    musicSearchForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var query = musicSearchInput ? musicSearchInput.value.trim() : '';
      if (!query) {
        setMusicStatus('先输入歌曲或歌手。', 'warn');
        return;
      }
      searchMusic(query);
    });
  }
  if (musicPlayBtn) musicPlayBtn.addEventListener('click', toggleMusicPlayback);
  if (musicPrevBtn) musicPrevBtn.addEventListener('click', playPrevMusic);
  if (musicNextBtn) musicNextBtn.addEventListener('click', playNextMusic);
  if (musicVolumeEl) {
    musicVolumeEl.addEventListener('input', function () {
      musicAudio.volume = Number(this.value || 0);
    });
  }
  if (musicProgressEl) {
    musicProgressEl.addEventListener('input', function () {
      musicSeeking = true;
    });
    musicProgressEl.addEventListener('change', function () {
      var duration = Number.isFinite(musicAudio.duration) ? musicAudio.duration : 0;
      if (duration > 0) {
        musicAudio.currentTime = (Number(this.value || 0) / 100) * duration;
      }
      musicSeeking = false;
      updateMusicTime();
    });
  }
  musicAudio.addEventListener('timeupdate', updateMusicTime);
  musicAudio.addEventListener('loadedmetadata', updateMusicTime);
  musicAudio.addEventListener('play', updateMusicNowPlaying);
  musicAudio.addEventListener('pause', updateMusicNowPlaying);
  musicAudio.addEventListener('ended', function () {
    if (musicCurrentIndex < musicQueue.length - 1) {
      playMusicAt(musicCurrentIndex + 1, false);
    } else {
      updateMusicNowPlaying();
      setMusicStatus('队列播放完了。', '');
    }
  });
  musicAudio.addEventListener('error', function () {
    setMusicStatus('这首歌播放失败，请换一首试试。', 'warn');
    updateMusicNowPlaying();
  });

  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    if (e.key === 'Escape') closeProfile();
  });
  inputEl.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 80) + 'px';
  });

  // ── Initialize ───────────────────────────────────────────
  loadHistory();
  loadChatConfig();
  renderMusicQueue();
  updateMusicNowPlaying();
})();
