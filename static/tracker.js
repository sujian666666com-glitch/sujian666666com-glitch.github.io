(function () {
  'use strict';

  var root = document.querySelector('.tracker-page');
  if (!root) {
    console.warn('[tracker] 未找到 .tracker-page，继续初始化基础交互');
  }

  var apiBase = (root ? root.getAttribute('data-tracker-api') || '' : '').replace(/\/$/, '');
  function apiURL(path) {
    return apiBase ? apiBase + path : path;
  }

  // ---------------------------------------------------------------------------
  // DOM 引用（全部用 id，杜绝属性选择器歧义）
  // ---------------------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  function bind(el, eventName, handler, id) {
    if (!el) {
      console.error('[tracker] DOM 元素缺失，无法绑定事件：' + id);
      return;
    }
    el.addEventListener(eventName, handler);
  }

  var tabsEl = $('tk-tabs');
  var summaryEl = $('tk-summary');
  var heatmapEl = $('tk-heatmap');
  var emptyEl = $('tk-empty');

  var planNameEl = $('tk-plan-name');
  var rangeEl = $('tk-range');
  var totalDaysEl = $('tk-total-days');
  var avgProgressEl = $('tk-avg-progress');
  var streakEl = $('tk-streak');

  var loginBtn = $('tk-login-btn');
  var logoutBtn = $('tk-logout-btn');
  var newPlanBtn = $('tk-new-plan-btn');
  var editPlanBtn = $('tk-edit-plan-btn');

  var dayDialog = $('tk-day-dialog');
  var dialogDateEl = $('tk-dialog-date');
  var dayForm = $('tk-day-form');
  var dayErrorEl = $('tk-day-error');
  var progressInput = $('tk-progress');
  var progressDisplay = $('tk-progress-display');
  var noteInput = $('tk-note');
  var attachmentInput = $('tk-attachment-input');
  var attachmentPreview = $('tk-attachment-preview');
  var attachmentClearBtn = $('tk-attachment-clear');
  var deleteRecordBtn = $('tk-delete-record');

  var planDialog = $('tk-plan-dialog');
  var planDialogTitle = $('tkPlanDialogTitle');
  var planForm = $('tk-plan-form');
  var planErrorEl = $('tk-plan-error');
  var planDeleteBtn = $('tk-plan-delete');

  var loginDialog = $('tk-login-dialog');
  var loginForm = $('tk-login-form');
  var loginErrorEl = $('tk-login-error');

  var tooltip = $('tk-tooltip');

  // ---------------------------------------------------------------------------
  // 状态
  // ---------------------------------------------------------------------------
  var TOKEN_KEY = 'tracker_token';
  var token = localStorage.getItem(TOKEN_KEY) || '';
  var plans = [];
  var currentPlanId = '';
  var recordsByPlan = {};
  var milestonesByPlan = {};
  var editingDate = '';
  var editingPlanId = '';
  var editingPlanMode = '';
  var pendingAttachment = '';

  // ---------------------------------------------------------------------------
  // 工具
  // ---------------------------------------------------------------------------
  function fmtDate(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }
  function todayStr() { return fmtDate(new Date()); }

  function isLoggedIn() { return Boolean(token); }
  function authHeaders() { return token ? { Authorization: 'Bearer ' + token } : {}; }
  function jsonHeaders() { return Object.assign({ 'Content-Type': 'application/json' }, authHeaders()); }

  async function request(method, path, body) {
    var opts = { method: method, headers: authHeaders() };
    if (body !== undefined) {
      opts.headers = jsonHeaders();
      opts.body = JSON.stringify(body);
    }
    var resp = await fetch(apiURL(path), opts);
    var data;
    try { data = await resp.json(); } catch (e) { data = {}; }
    if (!resp.ok) {
      var msg = (data && data.error) || ('HTTP ' + resp.status);
      var err = new Error(msg);
      err.status = resp.status;
      throw err;
    }
    return data;
  }

  function levelForProgress(progress) {
    if (progress >= 81) return 4;
    if (progress >= 51) return 3;
    if (progress >= 26) return 2;
    if (progress >= 1) return 1;
    return 0;
  }

  function escapeHTML(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file.type.startsWith('image/')) { reject(new Error('请选择图片文件')); return; }
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('读取文件失败')); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('图片解码失败')); };
        img.onload = function () {
          var canvas = document.createElement('canvas');
          var maxDim = 1280;
          var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          var quality = 0.8;
          var out = canvas.toDataURL('image/jpeg', quality);
          while (out.length > 200 * 1024 && quality > 0.3) {
            quality -= 0.1;
            out = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(out);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ---------------------------------------------------------------------------
  // 登录态 UI
  // ---------------------------------------------------------------------------
  function refreshAuthUI() {
    var loggedIn = isLoggedIn();
    if (loginBtn) loginBtn.hidden = loggedIn;
    if (logoutBtn) logoutBtn.hidden = !loggedIn;
    if (newPlanBtn) newPlanBtn.hidden = !loggedIn;
    if (editPlanBtn) editPlanBtn.hidden = !loggedIn || !currentPlanId;
  }

  // ---------------------------------------------------------------------------
  // 计划加载 & 渲染
  // ---------------------------------------------------------------------------
  async function loadPlans() {
    var data = await request('GET', '/api/tracker/plans');
    plans = data.items || [];
    renderTabs();
    if (plans.length > 0) {
      var active = plans.find(function (p) { return p.status === 'active'; });
      currentPlanId = (active || plans[0]).id;
    } else {
      currentPlanId = '';
    }
    await renderCurrentPlan();
    refreshAuthUI();
  }

  function renderTabs() {
    tabsEl.innerHTML = '';
    if (plans.length === 0) return;
    plans.forEach(function (plan) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tracker-tab' + (plan.id === currentPlanId ? ' tracker-tab--active' : '');
      var emoji = plan.emoji ? '<span class="tracker-tab__emoji">' + escapeHTML(plan.emoji) + '</span> ' : '';
      btn.innerHTML = emoji + escapeHTML(plan.name);
      btn.addEventListener('click', function () {
        currentPlanId = plan.id;
        renderTabs();
        renderCurrentPlan();
        refreshAuthUI();
      });
      tabsEl.appendChild(btn);
    });
  }

  async function renderCurrentPlan() {
    if (!currentPlanId) {
      summaryEl.hidden = true;
      heatmapEl.innerHTML = '';
      heatmapEl.appendChild(emptyEl);
      emptyEl.hidden = false;
      return;
    }
    var plan = plans.find(function (p) { return p.id === currentPlanId; });
    if (!plan) return;

    var year = new Date().getFullYear();
    var tasks = [];
    if (!recordsByPlan[currentPlanId]) {
      tasks.push(request('GET', '/api/tracker/plans/' + encodeURIComponent(currentPlanId) + '/records?year=' + year)
        .then(function (data) {
          var map = {};
          (data.items || []).forEach(function (r) { map[r.date] = r; });
          recordsByPlan[currentPlanId] = map;
        }));
    }
    if (!milestonesByPlan[currentPlanId]) {
      tasks.push(request('GET', '/api/tracker/plans/' + encodeURIComponent(currentPlanId) + '/milestones')
        .then(function (data) { milestonesByPlan[currentPlanId] = data.items || []; }));
    }
    await Promise.all(tasks);
    renderSummary(plan);
    renderHeatmap(plan);
    emptyEl.hidden = true;
  }

  function renderSummary(plan) {
    summaryEl.hidden = false;
    var emoji = plan.emoji ? plan.emoji + ' ' : '';
    var marks = '🎯 ' + plan.startDate;
    if (plan.dueDate) marks += ' → 🏁 ' + plan.dueDate;
    planNameEl.textContent = emoji + plan.name;
    rangeEl.textContent = marks;
    var records = recordsByPlan[currentPlanId] || {};
    var dates = Object.keys(records).sort();
    totalDaysEl.textContent = dates.length + ' 天';
    var sum = 0;
    dates.forEach(function (d) { sum += records[d].progress; });
    avgProgressEl.textContent = (dates.length ? Math.round(sum / dates.length) : 0) + '%';
    streakEl.textContent = calcStreak(records, dates) + ' 天';
  }

  function calcStreak(records, sortedDates) {
    if (!sortedDates.length) return 0;
    var set = {};
    sortedDates.forEach(function (d) { if (records[d].progress > 0) set[d] = true; });
    var streak = 0;
    var cursor = new Date();
    if (!set[fmtDate(cursor)]) cursor.setDate(cursor.getDate() - 1);
    while (set[fmtDate(cursor)]) { streak++; cursor.setDate(cursor.getDate() - 1); }
    return streak;
  }

  // ---------------------------------------------------------------------------
  // 热力图渲染
  // ---------------------------------------------------------------------------
  function renderHeatmap(plan) {
    var records = recordsByPlan[currentPlanId] || {};
    var milestones = milestonesByPlan[currentPlanId] || [];
    var msMap = {};
    milestones.forEach(function (m) { msMap[m.date] = m.label; });
    heatmapEl.innerHTML = '';

    var year = new Date().getFullYear();
    var start = new Date(year, 0, 1);
    start.setDate(start.getDate() - start.getDay());
    var numWeeks = 53;
    var totalDays = numWeeks * 7;

    // 月份标签
    var monthsEl = document.createElement('div');
    monthsEl.className = 'tracker-months';
    var monthSpans = [];
    var lastMonth = -1;
    for (var w = 0; w < numWeeks; w++) {
      var ws = new Date(start); ws.setDate(start.getDate() + w * 7);
      var m = ws.getMonth();
      if (m !== lastMonth && ws.getDate() <= 7) {
        monthSpans.push({ label: (m + 1) + '月', col: w });
        lastMonth = m;
      }
    }
    for (var i = 0; i < monthSpans.length; i++) {
      var next = i + 1 < monthSpans.length ? monthSpans[i + 1].col : numWeeks;
      monthSpans[i].width = next - monthSpans[i].col;
    }
    monthSpans.forEach(function (ms) {
      var span = document.createElement('span');
      span.textContent = ms.label;
      span.style.gridColumn = (ms.col + 1) + ' / span ' + Math.max(1, ms.width);
      monthsEl.appendChild(span);
    });

    var weekdaysEl = document.createElement('div');
    weekdaysEl.className = 'tracker-weekdays';
    ['', '一', '', '三', '', '五', ''].forEach(function (label) {
      var sp = document.createElement('span'); sp.textContent = label; weekdaysEl.appendChild(sp);
    });

    var axisRow = document.createElement('div');
    axisRow.className = 'tracker-axis-row';
    var rightPart = document.createElement('div');
    rightPart.style.flex = '1';
    var grid = document.createElement('div');
    grid.className = 'tracker-grid';

    var sortedDates = Object.keys(records).sort();
    var streakBadges = calcStreakBadges(records, sortedDates);

    for (var idx = 0; idx < totalDays; idx++) {
      var cellDate = new Date(start);
      cellDate.setDate(start.getDate() + idx);
      if (cellDate.getFullYear() !== year) {
        var ph = document.createElement('span');
        ph.style.width = '13px'; ph.style.height = '13px';
        grid.appendChild(ph);
        continue;
      }
      var dateKey = fmtDate(cellDate);
      var cell = document.createElement('div');
      cell.className = 'tracker-cell';
      var rec = records[dateKey];
      var level = rec ? levelForProgress(rec.progress) : 0;
      if (level > 0) cell.setAttribute('data-level', String(level));

      var mark = '';
      if (dateKey === plan.startDate) mark = '🎯';
      else if (plan.dueDate && dateKey === plan.dueDate) mark = '🏁';
      else if (streakBadges[dateKey]) mark = streakBadges[dateKey];
      else if (msMap[dateKey]) mark = '⭐';
      if (mark) {
        var markEl = document.createElement('span');
        markEl.className = 'tracker-cell__mark';
        markEl.textContent = mark;
        cell.appendChild(markEl);
      }
      attachCellHandlers(cell, dateKey, rec);
      grid.appendChild(cell);
    }

    rightPart.appendChild(grid);
    axisRow.appendChild(weekdaysEl);
    axisRow.appendChild(rightPart);
    var monthsWrap = document.createElement('div');
    monthsWrap.style.marginLeft = '26px';
    monthsWrap.appendChild(monthsEl);
    heatmapEl.appendChild(monthsWrap);
    heatmapEl.appendChild(axisRow);
  }

  function calcStreakBadges(records, sortedDates) {
    var badges = {};
    if (!sortedDates.length) return badges;
    var set = {};
    sortedDates.forEach(function (d) { if (records[d].progress > 0) set[d] = true; });
    var run = 0;
    sortedDates.forEach(function (d) {
      if (set[d]) { run++; if (run === 7) badges[d] = '🔥'; if (run === 30) badges[d] = '💎'; }
      else { run = 0; }
    });
    return badges;
  }

  function attachCellHandlers(cell, dateKey, record) {
    cell.addEventListener('mouseenter', function (e) {
      var lines = [dateKey];
      if (record) {
        lines.push('完成度：' + record.progress + '%');
        if (record.note) lines.push(escapeHTML(record.note.slice(0, 60)));
      } else { lines.push('未记录'); }
      tooltip.textContent = lines.join('\n');
      tooltip.hidden = false;
      moveTooltip(e);
    });
    cell.addEventListener('mousemove', moveTooltip);
    cell.addEventListener('mouseleave', function () { tooltip.hidden = true; });
    cell.addEventListener('click', function () { openDayDialog(dateKey, record); });
  }

  function moveTooltip(e) {
    var pad = 14;
    var x = e.clientX + pad, y = e.clientY + pad;
    var rect = tooltip.getBoundingClientRect();
    if (x + rect.width > window.innerWidth) x = e.clientX - rect.width - pad;
    if (y + rect.height > window.innerHeight) y = e.clientY - rect.height - pad;
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
  }

  // ---------------------------------------------------------------------------
  // 弹窗控制
  // ---------------------------------------------------------------------------
  function closeAllDialogs() {
    if (dayDialog) dayDialog.hidden = true;
    if (planDialog) planDialog.hidden = true;
    if (loginDialog) loginDialog.hidden = true;
  }
  function showDialog(d) {
    if (!d) return;
    closeAllDialogs();
    d.hidden = false;
  }

  function openDayDialog(dateKey, record) {
    editingDate = dateKey;
    editingPlanId = currentPlanId;
    dialogDateEl.textContent = dateKey + (dateKey === todayStr() ? '（今天）' : '');
    progressInput.value = record ? record.progress : 0;
    progressDisplay.textContent = progressInput.value;
    noteInput.value = record && record.note ? record.note : '';
    dayErrorEl.textContent = '';
    pendingAttachment = '';
    if (record && record.hasAttachment) {
      request('GET', '/api/tracker/plans/' + encodeURIComponent(currentPlanId) + '/records/' + encodeURIComponent(dateKey))
        .then(function (data) {
          if (data.item && data.item.attachment) {
            pendingAttachment = data.item.attachment;
            attachmentPreview.src = data.item.attachment;
            attachmentPreview.hidden = false;
            attachmentClearBtn.hidden = false;
          }
        }).catch(function () {});
    } else {
      attachmentPreview.src = ''; attachmentPreview.hidden = true; attachmentClearBtn.hidden = true;
    }
    deleteRecordBtn.hidden = !isLoggedIn() || !record;
    showDialog(dayDialog);
  }

  // ---------------------------------------------------------------------------
  // 每日详情表单
  // ---------------------------------------------------------------------------
  bind(progressInput, 'input', function () { progressDisplay.textContent = progressInput.value; }, 'tk-progress');

  bind(attachmentInput, 'change', async function () {
    var file = attachmentInput.files && attachmentInput.files[0];
    if (!file) return;
    try {
      var dataUrl = await compressImage(file);
      pendingAttachment = dataUrl;
      attachmentPreview.src = dataUrl;
      attachmentPreview.hidden = false;
      attachmentClearBtn.hidden = false;
    } catch (err) { dayErrorEl.textContent = err.message; }
  }, 'tk-attachment-input');

  bind(attachmentClearBtn, 'click', function () {
    pendingAttachment = '';
    attachmentPreview.src = ''; attachmentPreview.hidden = true;
    attachmentClearBtn.hidden = true; attachmentInput.value = '';
  }, 'tk-attachment-clear');

  bind(dayForm, 'submit', async function (e) {
    e.preventDefault();
    if (!isLoggedIn()) { dayErrorEl.textContent = '请先登录'; return; }
    if (!editingDate || !editingPlanId) return;
    dayErrorEl.textContent = '';
    try {
      await request('PUT',
        '/api/tracker/plans/' + encodeURIComponent(editingPlanId) + '/records/' + encodeURIComponent(editingDate),
        { progress: Number(progressInput.value), note: noteInput.value, attachment: pendingAttachment || null });
      delete recordsByPlan[editingPlanId];
      closeAllDialogs();
      await renderCurrentPlan();
    } catch (err) {
      dayErrorEl.textContent = err.message;
      if (err.status === 401) { token = ''; localStorage.removeItem(TOKEN_KEY); refreshAuthUI(); }
    }
  }, 'tk-day-form');

  bind(deleteRecordBtn, 'click', async function () {
    if (!editingDate || !editingPlanId) return;
    if (!confirm('确定删除 ' + editingDate + ' 的记录？')) return;
    try {
      await request('DELETE',
        '/api/tracker/plans/' + encodeURIComponent(editingPlanId) + '/records/' + encodeURIComponent(editingDate));
      delete recordsByPlan[editingPlanId];
      closeAllDialogs();
      await renderCurrentPlan();
    } catch (err) { dayErrorEl.textContent = err.message; }
  }, 'tk-delete-record');

  // ---------------------------------------------------------------------------
  // 计划表单
  // ---------------------------------------------------------------------------
  bind(newPlanBtn, 'click', function () {
    if (!isLoggedIn()) { openLoginDialog(); return; }
    editingPlanMode = 'create';
    planDialogTitle.textContent = '新建计划';
    planForm.reset();
    planForm.elements['start_date'].value = todayStr();
    planDeleteBtn.hidden = true;
    planErrorEl.textContent = '';
    showDialog(planDialog);
  }, 'tk-new-plan-btn');

  bind(editPlanBtn, 'click', function () {
    if (!currentPlanId) return;
    var plan = plans.find(function (p) { return p.id === currentPlanId; });
    if (!plan) return;
    editingPlanMode = 'edit';
    planDialogTitle.textContent = '编辑计划';
    planForm.elements['name'].value = plan.name;
    planForm.elements['emoji'].value = plan.emoji || '';
    planForm.elements['start_date'].value = plan.startDate;
    planForm.elements['due_date'].value = plan.dueDate || '';
    planForm.elements['description'].value = plan.description || '';
    planDeleteBtn.hidden = false;
    planErrorEl.textContent = '';
    showDialog(planDialog);
  }, 'tk-edit-plan-btn');

  bind(planForm, 'submit', async function (e) {
    e.preventDefault();
    planErrorEl.textContent = '';
    var body = {
      name: planForm.elements['name'].value,
      emoji: planForm.elements['emoji'].value,
      start_date: planForm.elements['start_date'].value,
      due_date: planForm.elements['due_date'].value,
      description: planForm.elements['description'].value,
    };
    try {
      if (editingPlanMode === 'create') {
        await request('POST', '/api/tracker/plans', body);
      } else {
        await request('PATCH', '/api/tracker/plans/' + encodeURIComponent(currentPlanId), body);
      }
      recordsByPlan = {}; milestonesByPlan = {};
      closeAllDialogs();
      await loadPlans();
    } catch (err) {
      planErrorEl.textContent = err.message;
      if (err.status === 401) { token = ''; localStorage.removeItem(TOKEN_KEY); refreshAuthUI(); }
    }
  }, 'tk-plan-form');

  bind(planDeleteBtn, 'click', async function () {
    if (!currentPlanId) return;
    if (!confirm('确定删除这个计划及其所有记录？此操作不可恢复。')) return;
    try {
      await request('DELETE', '/api/tracker/plans/' + encodeURIComponent(currentPlanId));
      recordsByPlan = {}; milestonesByPlan = {};
      closeAllDialogs();
      await loadPlans();
    } catch (err) { planErrorEl.textContent = err.message; }
  }, 'tk-plan-delete');

  // ---------------------------------------------------------------------------
  // 登录
  // ---------------------------------------------------------------------------
  function openLoginDialog() {
    if (loginForm) loginForm.reset();
    if (loginErrorEl) loginErrorEl.textContent = '';
    showDialog(loginDialog);
  }

  window.__trackerOpenLogin = openLoginDialog;

  bind(loginBtn, 'click', openLoginDialog, 'tk-login-btn');
  bind(logoutBtn, 'click', function () {
    token = ''; localStorage.removeItem(TOKEN_KEY); refreshAuthUI();
  }, 'tk-logout-btn');

  bind(loginForm, 'submit', async function (e) {
    e.preventDefault();
    loginErrorEl.textContent = '';
    var password = loginForm.elements['password'].value;
    try {
      var data = await request('POST', '/api/tracker/auth/login', { password: password });
      token = data.token;
      localStorage.setItem(TOKEN_KEY, token);
      closeAllDialogs();
      refreshAuthUI();
    } catch (err) { loginErrorEl.textContent = err.message; }
  }, 'tk-login-form');

  // ---------------------------------------------------------------------------
  // 关闭按钮
  // ---------------------------------------------------------------------------
  document.querySelectorAll('[data-tk-close]').forEach(function (el) {
    el.addEventListener('click', closeAllDialogs);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAllDialogs(); });

  // ---------------------------------------------------------------------------
  // 启动
  // ---------------------------------------------------------------------------
  refreshAuthUI();
  loadPlans().catch(function (err) {
    console.error('[tracker] 初始化失败', err);
    heatmapEl.innerHTML = '<p class="tracker-empty">加载失败：' + escapeHTML(err.message) + '</p>';
  });
})();
