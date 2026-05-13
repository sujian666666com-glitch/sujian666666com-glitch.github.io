(function () {
  'use strict';

  var page = document.querySelector('.wall-admin-page');
  if (!page) return;

  var apiBase = (page.getAttribute('data-wall-api') || '').replace(/\/$/, '');
  var endpoint = apiBase ? apiBase + '/api/wall/admin/messages' : '/api/wall/admin/messages';
  var form = page.querySelector('[data-wall-admin-auth]');
  var statusEl = page.querySelector('[data-wall-admin-status]');
  var listEl = page.querySelector('[data-wall-admin-list]');
  var refreshBtn = page.querySelector('[data-wall-admin-refresh]');
  var token = sessionStorage.getItem('wall_admin_token') || '';

  function setStatus(message) {
    statusEl.textContent = message || '';
  }

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token
    };
  }

  function formatTime(value) {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString('zh-CN', { hour12: false });
    } catch (_) {
      return value;
    }
  }

  function render(items) {
    listEl.textContent = '';
    if (!items.length) {
      setStatus('暂无留言');
      return;
    }
    setStatus('共 ' + items.length + ' 条');
    items.forEach(function (item) {
      var node = document.createElement('article');
      node.className = 'wall-admin-item' + (item.status === 'hidden' ? ' wall-admin-item--hidden' : '');

      var content = document.createElement('p');
      content.className = 'wall-admin-item__content';
      content.textContent = item.content || '';

      var meta = document.createElement('div');
      meta.className = 'wall-admin-item__meta';
      [
        '状态：' + item.status,
        '时间：' + formatTime(item.created_at),
        'IP：' + (item.ip || ''),
        '来源：' + (item.referer || ''),
        'UA：' + (item.user_agent || '')
      ].forEach(function (line) {
        var div = document.createElement('div');
        div.textContent = line;
        meta.appendChild(div);
      });

      var actions = document.createElement('div');
      actions.className = 'wall-admin-item__actions';
      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.textContent = item.status === 'hidden' ? '恢复' : '隐藏';
      toggle.addEventListener('click', function () {
        mutate(item.id, item.status === 'hidden' ? 'show' : 'hide');
      });
      var del = document.createElement('button');
      del.type = 'button';
      del.textContent = '删除';
      del.addEventListener('click', function () {
        if (window.confirm('确定删除这条留言？')) mutate(item.id, 'delete');
      });
      actions.appendChild(toggle);
      actions.appendChild(del);

      node.appendChild(content);
      node.appendChild(meta);
      node.appendChild(actions);
      listEl.appendChild(node);
    });
  }

  async function load() {
    if (!token) {
      setStatus('请输入管理口令');
      return;
    }
    setStatus('加载中...');
    try {
      var res = await fetch(endpoint, { headers: authHeaders(), cache: 'no-store' });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || '加载失败');
      render(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setStatus(err.message || '加载失败');
    }
  }

  async function mutate(id, action) {
    var method = action === 'delete' ? 'DELETE' : 'PATCH';
    var url = endpoint + '/' + encodeURIComponent(id);
    if (action !== 'delete') url += '/' + action;
    setStatus('处理中...');
    try {
      var res = await fetch(url, { method: method, headers: authHeaders(), cache: 'no-store' });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || '操作失败');
      await load();
    } catch (err) {
      setStatus(err.message || '操作失败');
    }
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    token = new FormData(form).get('token') || '';
    sessionStorage.setItem('wall_admin_token', token);
    load();
  });
  refreshBtn.addEventListener('click', load);

  if (token) {
    form.querySelector('input[name="token"]').value = token;
    load();
  } else {
    setStatus('请输入管理口令');
  }
})();
