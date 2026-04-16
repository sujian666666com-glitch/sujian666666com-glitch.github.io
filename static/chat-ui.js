// ── Chat Widget JS — loaded as external file ──────────────
// Config is read from data attributes on #chatPanel

(function () {
  'use strict';

  var panel = document.getElementById('chatPanel');
  if (!panel) return;

  // ── Configuration from Hugo data attributes ──────────────
  var PROXY_URL = panel.getAttribute('data-proxy') || '';
  var DEFAULT_MODEL = panel.getAttribute('data-model') || 'qwen3.6-plus';
  var SYSTEM_PROMPT = panel.getAttribute('data-system-prompt') || '';
  var SUGGESTED_PROMPTS = [];
  try {
    var sp = panel.getAttribute('data-suggested-prompts');
    if (sp) SUGGESTED_PROMPTS = JSON.parse(sp);
  } catch (_) {}
  var ASSISTANT_LABEL = panel.getAttribute('data-assistant-avatar') || '兴旺';
  var ASSISTANT_AVATAR_IMAGE = panel.getAttribute('data-assistant-avatar-image') || '';
  // data-user-avatar 可为空；勿用 ||「我」否则无法清空
  var USER_LABEL = panel.getAttribute('data-user-avatar');
  if (USER_LABEL === null) USER_LABEL = '';

  function makeAvatarEl(role) {
    var el = document.createElement('div');
    el.className = 'chat-msg-avatar chat-msg-avatar--' + role;
    el.setAttribute('aria-hidden', 'true');
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
  var modelSelect = document.getElementById('chatModelSelect');
  var thinkToggle = document.getElementById('chatThinkToggle');
  var ragToggle = document.getElementById('chatRagToggle');

  // ── State ────────────────────────────────────────────────
  var messages = [];
  var isStreaming = false;
  var abortCtrl = null;
  var welcomeVisible = true;

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

  // ── Panel Open/Close ─────────────────────────────────────
  bubble.addEventListener('click', function () {
    var isOpen = panel.classList.toggle('open');
    bubble.classList.remove('chat-bubble--pulse');
    if (isOpen) {
      if (messages.length === 0 && !welcomeVisible) {
        showWelcome();
      } else if (messages.length > 0 && messagesEl.children.length === 0) {
        renderAllMessages();
      }
      inputEl.focus();
    }
  });

  closeBtn.addEventListener('click', function () {
    panel.classList.remove('open');
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
      if (raw) { messages = JSON.parse(raw); if (!Array.isArray(messages)) messages = []; }
    } catch (_) { messages = []; }
  }

  function clearHistory() {
    messages = [];
    messagesEl.innerHTML = '';
    localStorage.removeItem(HISTORY_KEY);
    showWelcome();
  }
  clearBtn.addEventListener('click', clearHistory);

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
    if (beforeEl) { parent.insertBefore(thinkBlock, beforeEl); } else { parent.appendChild(thinkBlock); }
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
    textSpan.innerHTML = role === 'assistant' ? renderMarkdown(content || '') : escapeHtml(content || '');
    bubble.appendChild(textSpan);

    if (role === 'assistant' && thinking) {
      createThinkingBlock(body, bubble, thinking);
    }
    body.appendChild(bubble);

    if (role === 'user') {
      row.appendChild(body);
      row.appendChild(avatar);
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
  function getSelectedModel() { return modelSelect.value || DEFAULT_MODEL; }
  function isThinkingEnabled() { return thinkToggle.checked; }
  function isRagEnabled() { return ragToggle ? ragToggle.checked : true; }

  function formatApiError(errBody) {
    if (!errBody) return '';
    try {
      var data = JSON.parse(errBody);
      var e = data.error;
      if (typeof e === 'string') return e;
      if (e && typeof e === 'object') {
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
    }).map(function (m) { return { role: m.role, content: m.content }; });

    if (SYSTEM_PROMPT && String(SYSTEM_PROMPT).trim()) {
      apiMessages = [{ role: 'system', content: SYSTEM_PROMPT }].concat(apiMessages);
    }

    var reqBody = { model: getSelectedModel(), messages: apiMessages, stream: true };
    var captureThinking = isThinkingEnabled();
    if (captureThinking) reqBody.enable_thinking = true;
    reqBody.enable_rag = isRagEnabled();

    setStreaming(true);
    showLoading();
    abortCtrl = new AbortController();

    try {
      var resp = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
        signal: abortCtrl.signal,
      });

      removeLoading();

      if (!resp.ok) {
        var errBody = '';
        try { errBody = await resp.text(); } catch (_) {}
        var errMsg = resp.status === 429 ? '请求过于频繁，请稍后再试' : '请求失败 (' + resp.status + ')';
        if (errBody) { var formatted = formatApiError(errBody); if (formatted) errMsg = formatted; }
        showError(errMsg);
        setStreaming(false);
        return;
      }

      var assistantMsg = { role: 'assistant', content: '', thinking: '' };
      messages.push(assistantMsg);

      var msgEl = createMsgEl('assistant', '', '');
      messagesEl.appendChild(msgEl);
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

            // 未勾选「思考」时不展示/保存推理（上游仍可能返回 reasoning_content）
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
              textSpan.innerHTML = renderMarkdown(assistantMsg.content);
            }
          } catch (_) {}
        }
        scrollToBottom();
      }

      saveHistory();
    } catch (err) {
      removeLoading();
      if (err.name !== 'AbortError') showError('连接失败，请检查网络');
    } finally {
      setStreaming(false);
      abortCtrl = null;
    }
  }

  // ── Event Bindings ───────────────────────────────────────
  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  inputEl.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 80) + 'px';
  });

  // ── Initialize ───────────────────────────────────────────
  loadHistory();
})();
