(function () {
  'use strict';

  var root = document.querySelector('.message-wall-page');
  if (!root) return;

  var apiBase = (root.getAttribute('data-wall-api') || '').replace(/\/$/, '');
  var endpoint = apiBase ? apiBase + '/api/wall/messages' : '/api/wall/messages';
  var stage = root.querySelector('[data-wall-stage]');
  var dialog = root.querySelector('[data-wall-dialog]');
  var form = root.querySelector('[data-wall-form]');
  var textarea = root.querySelector('textarea[name="content"]');
  var errorEl = root.querySelector('[data-wall-error]');
  var countEl = root.querySelector('[data-wall-count]');
  var openBtn = root.querySelector('[data-wall-open]');
  var closeEls = root.querySelectorAll('[data-wall-close]');

  var items = [];
  var nextCursor = '';
  var loading = false;
  var done = false;
  var submitting = false;
  var heroPositions = [
    { x: '58%', y: '10%', r: '7deg' },
    { x: '70%', y: '46%', r: '-9deg' },
    { x: '13%', y: '45%', r: '-6deg' },
    { x: '39%', y: '58%', r: '8deg' },
    { x: '48%', y: '27%', r: '-4deg' },
    { x: '21%', y: '22%', r: '10deg' },
    { x: '8%', y: '8%', r: '5deg' },
    { x: '33%', y: '7%', r: '-7deg' }
  ];
  var colors = ['purple', 'warm', 'pink', 'green', 'blue', 'white'];

  function textLength(value) {
    return Array.from(String(value || '').trim()).length;
  }

  function setError(message) {
    errorEl.textContent = message || '';
  }

  function setCount() {
    countEl.textContent = String(textLength(textarea.value));
  }

  function cardClass(seed, index) {
    var color = colors[Math.abs((seed || index) + index) % colors.length];
    return 'message-wall-card--' + color;
  }

  function makeCard(item, index, isHero) {
    var article = document.createElement('article');
    article.className = 'message-wall-card ' + cardClass(item.seed, index);
    article.className += isHero ? ' message-wall-card--hero' : ' message-wall-card--flow';

    if (isHero) {
      var pos = heroPositions[index % heroPositions.length];
      article.style.setProperty('--x', pos.x);
      article.style.setProperty('--y', pos.y);
      article.style.setProperty('--r', pos.r);
    } else {
      var rotate = (((item.seed || index) % 15) - 7) + 'deg';
      var offset = (((item.seed || index) % 4) * 18) + 'px';
      article.style.setProperty('--r', rotate);
      article.style.setProperty('--offset', offset);
    }

    var p = document.createElement('p');
    p.className = 'message-wall-card__text';
    p.textContent = item.content || '';
    article.appendChild(p);
    return article;
  }

  function render() {
    stage.textContent = '';

    var hero = document.createElement('section');
    hero.className = 'message-wall-hero';
    var flow = document.createElement('section');
    flow.className = 'message-wall-flow';

    items.forEach(function (item, index) {
      if (index < heroPositions.length) {
        hero.appendChild(makeCard(item, index, true));
      } else {
        flow.appendChild(makeCard(item, index, false));
      }
    });

    stage.appendChild(hero);
    stage.appendChild(flow);
  }

  async function loadMessages() {
    if (loading || done) return;
    loading = true;
    try {
      var url = endpoint + '?limit=48';
      if (nextCursor) url += '&cursor=' + encodeURIComponent(nextCursor);
      var res = await fetch(url, { cache: 'no-store' });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || '加载失败');

      var incoming = Array.isArray(data.items) ? data.items : [];
      var seen = new Set(items.map(function (item) { return item.id; }));
      incoming.forEach(function (item) {
        if (item && item.id && !seen.has(item.id)) items.push(item);
      });
      nextCursor = data.nextCursor || '';
      done = !nextCursor;
      render();
    } catch (err) {
      setError(err.message || '加载失败');
    } finally {
      loading = false;
    }
  }

  function openDialog() {
    dialog.hidden = false;
    setError('');
    setCount();
    setTimeout(function () { textarea.focus(); }, 0);
  }

  function closeDialog() {
    dialog.hidden = true;
    form.reset();
    setError('');
    setCount();
  }

  function validateLocal(content) {
    var len = textLength(content);
    if (len < 1) return '先写一句话。';
    if (len > 80) return '最多 80 字。';
    if (/[<>]/.test(content)) return '这里只收纯文本。';
    if (/(https?:\/\/|www\.)/i.test(content)) return '这里不放链接。';
    return '';
  }

  async function submitMessage(event) {
    event.preventDefault();
    if (submitting) return;

    var content = textarea.value.trim().replace(/\s+/g, ' ');
    var localError = validateLocal(content);
    if (localError) {
      setError(localError);
      return;
    }

    submitting = true;
    form.querySelector('button[type="submit"]').disabled = true;
    setError('');
    try {
      var res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content }),
        cache: 'no-store'
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) {
        throw new Error(data.error || '提交失败');
      }
      if (data.item && data.item.id) {
        items = [data.item].concat(items.filter(function (item) {
          return item.id !== data.item.id;
        }));
        render();
      }
      closeDialog();
    } catch (err) {
      setError(err.message || '提交失败');
    } finally {
      submitting = false;
      form.querySelector('button[type="submit"]').disabled = false;
    }
  }

  function maybeLoadMore() {
    if (done || loading) return;
    var remain = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
    if (remain < 520) loadMessages();
  }

  openBtn.addEventListener('click', openDialog);
  closeEls.forEach(function (el) { el.addEventListener('click', closeDialog); });
  textarea.addEventListener('input', setCount);
  form.addEventListener('submit', submitMessage);
  window.addEventListener('scroll', maybeLoadMore, { passive: true });
  window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !dialog.hidden) closeDialog();
  });

  setCount();
  render();
  loadMessages();
})();
