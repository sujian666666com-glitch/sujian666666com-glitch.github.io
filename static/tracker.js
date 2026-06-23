(function () {
  'use strict';

  var root = document.querySelector('.tracker-page');
  if (!root) return;

  var apiBase = (root.getAttribute('data-tracker-api') || '').replace(/\/$/, '');
  function apiURL(path) {
    return apiBase ? apiBase + path : path;
  }

  // DOM 引用
  var tabsEl = root.querySelector('[data-tracker-tabs]');
  var summaryEl = root.querySelector('[data-tracker-summary]');
  var heatmapEl = root.querySelector('[data-tracker-heatmap]');
  var emptyEl = root.querySelector('[data-tracker-empty]');

  var planNameEl = root.querySelector('[data-tracker-plan-name]');
  var rangeEl = root.querySelector('[data-tracker-range]');
  var totalDaysEl = root.querySelector('[data-tracker-total-days]');
  var avgProgressEl = root.querySelector('[data-tracker-avg-progress]');
  var streakEl = root.querySelector('[data-tracker-streak]');

  var loginBtn = root.querySelector('[data-tracker-login]');
  var logoutBtn = root.querySelector('[data-tracker-logout]');
  var newPlanBtn = root.querySelector('[data-tracker-new-plan]');
  var editPlanBtn = root.querySelector('[data-tracker-edit-plan]');

  var dialog = root.querySelector('[data-tracker-dialog]');
  var dialogDateEl = root.querySelector('[data-tracker-dialog-date]');
  var dialogForm = root.querySelector('[data-tracker-form]');
  var dialogErrorEl = root.querySelector('[data-tracker-error]');
  var progressInput = root.querySelector('[data-tracker-progress]');
  var progressDisplay = root.querySelector('[data-tracker-progress-display]');
  var noteInput = root.querySelector('[data-tracker-note]');
  var attachmentInput = root.querySelector('[data-tracker-attachment-input]');
  var attachmentPreview = root.querySelector('[data-tracker-attachment-preview]');
  var attachmentClearBtn = root.querySelector('[data-tracker-attachment-clear]');
  var deleteRecordBtn = root.querySelector('[data-tracker-delete]');

  var planDialog = root.querySelector('[data-tracker-plan-dialog]');
  var planDialogTitle = root.querySelector('[data-tracker-plan-dialog-title]');
  var planForm = root.querySelector('[data-tracker-plan-form]');
  var planErrorEl = root.querySelector('[data-tracker-plan-error]');
  var planDeleteBtn = root.querySelector('[data-tracker-plan-delete]');

  var loginDialog = root.querySelector('[data-tracker-login-dialog]');
  var loginForm = root.querySelector('[data-tracker-login-form]');
  var loginErrorEl = root.querySelector('[data-tracker-login-error]');

  var tooltip = root.querySelector('[data-tracker-tooltip]');

  // 状态
  var TOKEN_KEY = 'tracker_token';
  var token = localStorage.getItem(TOKEN_KEY) || '';
  var plans = [];
  var currentPlanId = '';
  var recordsByPlan = {}; // planId -> { date -> record }
  var milestonesByPlan = {}; // planId -> array
  // 当前编辑中的日期
  var editingDate = '';
  var editingPlanId = '';
  var editingPlanMode = ''; // 'create' | 'edit'
  var pendingAttachment = ''; // base64

  // ---------------------------------------------------------------------------
  // 工具
  // ---------------------------------------------------------------------------

  function fmtDate(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function todayStr() {
    return fmtDate(new Date());
  }

  function parseDate(s) {
    var parts = String(s).split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function isLoggedIn() { return Boolean(token); }

  function authHeaders() {
    return token ? { Authorization: 'Bearer ' + token } : {};
  }

  function jsonHeaders() {
    return Object.assign({ 'Content-Type': 'application/json' }, authHeaders());
  }

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

  // ---------------------------------------------------------------------------
  // 图片压缩：用 canvas 压到 200KB 以内
  // ---------------------------------------------------------------------------

  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file.type.startsWith('image/')) {
        reject(new Error('请选择图片文件'));
        return;
      }
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
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          var quality = 0.8;
          var out = canvas.toDataURL('image/jpeg', quality);
          // 若仍超 200KB，逐步降低质量
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
    loginBtn.hidden = loggedIn;
    logoutBtn.hidden = !loggedIn;
    newPlanBtn.hidden = !loggedIn;
    editPlanBtn.hidden = !loggedIn || !currentPlanId;
  }

  // ---------------------------------------------------------------------------
  // 计划列表加载 & 渲染
  // ---------------------------------------------------------------------------

  async function loadPlans() {
    var data = await request('GET', '/api/tracker/plans');
    plans = data.items || [];
    renderTabs();
    if (plans.length > 0) {
      // 优先选 active 的第一个
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

    // 并行加载全年记录和里程碑
    var year = new Date().getFullYear();
    var recordsPromise;
    if (!recordsByPlan[currentPlanId]) {
      recordsPromise = request('GET', '/api/tracker/plans/' + encodeURIComponent(currentPlanId) + '/records?year=' + year)
        .then(function (data) {
          var map = {};
          (data.items || []).forEach(function (r) { map[r.date] = r; });
          recordsByPlan[currentPlanId] = map;
        });
    } else {
      recordsPromise = Promise.resolve();
    }
    var msPromise;
    if (!milestonesByPlan[currentPlanId]) {
      msPromise = request('GET', '/api/tracker/plans/' + encodeURIComponent(currentPlanId) + '/milestones')
        .then(function (data) { milestonesByPlan[currentPlanId] = data.items || []; });
    } else {
      msPromise = Promise.resolve();
    }
    await Promise.all([recordsPromise, msPromise]);

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
    var avg = dates.length ? Math.round(sum / dates.length) : 0;
    avgProgressEl.textContent = avg + '%';

    streakEl.textContent = calcStreak(records, dates) + ' 天';
  }

  // 连胜：从今天往前数连续达标（progress>0）的天数
  function calcStreak(records, sortedDates) {
    if (!sortedDates.length) return 0;
    var set = {};
    sortedDates.forEach(function (d) { if (records[d].progress > 0) set[d] = true; });
    var streak = 0;
    var cursor = new Date();
    // 如果今天没记录，从昨天开始也允许（避免今天还没打卡就算 0）
    if (!set[fmtDate(cursor)]) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (set[fmtDate(cursor)]) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  // ---------------------------------------------------------------------------
  // 热力图渲染（GitHub 经典 53 列 × 7 行）
  // ---------------------------------------------------------------------------

  function renderHeatmap(plan) {
    var records = recordsByPlan[currentPlanId] || {};
    var milestones = milestonesByPlan[currentPlanId] || [];
    var msMap = {};
    milestones.forEach(function (m) { msMap[m.date] = m.label; });

    heatmapEl.innerHTML = '';

    // 计算网格起始：今年的第一个周日（GitHub 风格，列对齐到周日开始）
    var year = new Date().getFullYear();
    var start = new Date(year, 0, 1);
    var startWeekday = start.getDay(); // 0=周日
    start.setDate(start.getDate() - startWeekday);

    // 53 周
    var numWeeks = 53;
    var totalDays = numWeeks * 7;

    // 月份标签
    var monthsEl = document.createElement('div');
    monthsEl.className = 'tracker-months';
    var monthPositions = {}; // monthIndex -> column
    var lastMonth = -1;
    for (var w = 0; w < numWeeks; w++) {
      var weekStart = new Date(start);
      weekStart.setDate(start.getDate() + w * 7);
      var m = weekStart.getMonth();
      if (m !== lastMonth && weekStart.getDate() <= 7) {
        monthPositions[m] = w;
        lastMonth = m;
      }
    }
    var monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    var monthSpans = [];
    var prevCol = 0;
    Object.keys(monthPositions).forEach(function (mi, idx) {
      var col = monthPositions[mi];
      if (idx === 0) {
        monthSpans.push({ label: monthNames[Number(mi)], col: col });
      } else {
        var prev = monthSpans[monthSpans.length - 1];
        prev.width = col - prev.col;
        monthSpans.push({ label: monthNames[Number(mi)], col: col });
      }
    });
    if (monthSpans.length) {
      monthSpans[monthSpans.length - 1].width = numWeeks - monthSpans[monthSpans.length - 1].col;
    }
    // 渲染月份标签
    monthSpans.forEach(function (ms) {
      var span = document.createElement('span');
      span.textContent = ms.label;
      span.style.gridColumn = (ms.col + 1) + ' / span ' + Math.max(1, ms.width || 1);
      monthsEl.appendChild(span);
    });

    // 星期标签（周一周三周五）
    var axisRow = document.createElement('div');
    axisRow.className = 'tracker-axis-row';

    var weekdaysEl = document.createElement('div');
    weekdaysEl.className = 'tracker-weekdays';
    ['', '一', '', '三', '', '五', ''].forEach(function (label) {
      var sp = document.createElement('span');
      sp.textContent = label;
      weekdaysEl.appendChild(sp);
    });

    var rightPart = document.createElement('div');
    rightPart.style.flex = '1';

    var gridWrap = document.createElement('div');
    var grid = document.createElement('div');
    grid.className = 'tracker-grid';

    // 连胜计算：需要逐日判定 progress>0
    var sortedDates = Object.keys(records).sort();
    var streakBadges = calcStreakBadges(records, sortedDates); // date -> '🔥'|'💎'

    for (var i = 0; i < totalDays; i++) {
      var cellDate = new Date(start);
      cellDate.setDate(start.getDate() + i);
      // 只渲染今年内的格子
      if (cellDate.getFullYear() !== year) {
        var placeholder = document.createElement('span');
        placeholder.style.width = '13px';
        placeholder.style.height = '13px';
        grid.appendChild(placeholder);
        continue;
      }
      var dateKey = fmtDate(cellDate);
      var cell = document.createElement('div');
      cell.className = 'tracker-cell';
      var rec = records[dateKey];
      var level = rec ? levelForProgress(rec.progress) : 0;
      if (level > 0) cell.setAttribute('data-level', String(level));

      // 特殊标记
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

      // tooltip & 点击
      attachCellHandlers(cell, dateKey, rec, mark);

      grid.appendChild(cell);
    }

    gridWrap.appendChild(grid);
    rightPart.appendChild(gridWrap);

    axisRow.appendChild(weekdaysEl);
    axisRow.appendChild(rightPart);

    var monthsWrap = document.createElement('div');
    monthsWrap.style.marginLeft = '26px';
    monthsWrap.appendChild(monthsEl);

    heatmapEl.appendChild(monthsWrap);
    heatmapEl.appendChild(axisRow);
  }

  // 计算 7 连/30 连徽章日期
  function calcStreakBadges(records, sortedDates) {
    var badges = {};
    if (!sortedDates.length) return badges;
    var set = {};
    sortedDates.forEach(function (d) { if (records[d].progress > 0) set[d] = true; });
    var run = 0;
    // 从最早开始正向遍历
    sortedDates.forEach(function (d) {
      if (set[d]) {
        run++;
        if (run === 7) badges[d] = '🔥';
        if (run === 30) badges[d] = '💎';
      } else {
        run = 0;
      }
    });
    return badges;
  }

  function attachCellHandlers(cell, dateKey, record, mark) {
    cell.addEventListener('mouseenter', function (e) {
      var lines = [dateKey];
      if (record) {
        lines.push('完成度：' + record.progress + '%');
        if (record.note) lines.push(escapeHTML(record.note.slice(0, 60)));
      } else {
        lines.push('未记录');
      }
      tooltip.textContent = lines.join('\n');
      tooltip.hidden = false;
      moveTooltip(e);
    });
    cell.addEventListener('mousemove', moveTooltip);
    cell.addEventListener('mouseleave', function () {
      tooltip.hidden = true;
    });
    cell.addEventListener('click', function () {
      openDayDialog(dateKey, record);
    });
  }

  function moveTooltip(e) {
    var pad = 14;
    var x = e.clientX + pad;
    var y = e.clientY + pad;
    var rect = tooltip.getBoundingClientRect();
    if (x + rect.width > window.innerWidth) x = e.clientX - rect.width - pad;
    if (y + rect.height > window.innerHeight) y = e.clientY - rect.height - pad;
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
  }

  // ---------------------------------------------------------------------------
  // 每日详情/编辑弹窗
  // ---------------------------------------------------------------------------

  function openDayDialog(dateKey, record) {
    editingDate = dateKey;
    editingPlanId = currentPlanId;
    dialogDateEl.textContent = dateKey + (dateKey === todayStr() ? '（今天）' : '');
    progressInput.value = record ? record.progress : 0;
    progressDisplay.textContent = progressInput.value;
    noteInput.value = record && record.note ? record.note : '';
    dialogErrorEl.textContent = '';

    // 重置图片
    pendingAttachment = '';
    if (record && record.hasAttachment) {
      // 拉取含附件的详情
      request('GET', '/api/tracker/plans/' + encodeURIComponent(currentPlanId) + '/records/' + encodeURIComponent(dateKey))
        .then(function (data) {
          if (data.item && data.item.attachment) {
            pendingAttachment = data.item.attachment;
            attachmentPreview.src = data.item.attachment;
            attachmentPreview.hidden = false;
            attachmentClearBtn.hidden = false;
          }
        })
        .catch(function () { /* 忽略 */ });
    } else {
      attachmentPreview.src = '';
      attachmentPreview.hidden = true;
      attachmentClearBtn.hidden = true;
    }

    deleteRecordBtn.hidden = !isLoggedIn() || !record;
    showDialog(dialog);
  }

  function closeAllDialogs() {
    dialog.hidden = true;
    planDialog.hidden = true;
    loginDialog.hidden = true;
  }

  function showDialog(d) {
    closeAllDialogs();
    d.hidden = false;
  }

  progressInput.addEventListener('input', function () {
    progressDisplay.textContent = progressInput.value;
  });

  attachmentInput.addEventListener('change', async function () {
    var file = attachmentInput.files && attachmentInput.files[0];
    if (!file) return;
    try {
      var dataUrl = await compressImage(file);
      pendingAttachment = dataUrl;
      attachmentPreview.src = dataUrl;
      attachmentPreview.hidden = false;
      attachmentClearBtn.hidden = false;
    } catch (err) {
      dialogErrorEl.textContent = err.message;
    }
  });

  attachmentClearBtn.addEventListener('click', function () {
    pendingAttachment = '';
    attachmentPreview.src = '';
    attachmentPreview.hidden = true;
    attachmentClearBtn.hidden = true;
    attachmentInput.value = '';
  });

  dialogForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!isLoggedIn()) {
      dialogErrorEl.textContent = '请先登录';
      return;
    }
    if (!editingDate || !editingPlanId) return;
    dialogErrorEl.textContent = '';
    var body = {
      progress: Number(progressInput.value),
      note: noteInput.value,
      attachment: pendingAttachment || null,
    };
    try {
      await request('PUT',
        '/api/tracker/plans/' + encodeURIComponent(editingPlanId) + '/records/' + encodeURIComponent(editingDate),
        body);
      // 刷新缓存
      delete recordsByPlan[editingPlanId];
      closeAllDialogs();
      await renderCurrentPlan();
    } catch (err) {
      dialogErrorEl.textContent = err.message;
      if (err.status === 401) { token = ''; localStorage.removeItem(TOKEN_KEY); refreshAuthUI(); }
    }
  });

  deleteRecordBtn.addEventListener('click', async function () {
    if (!editingDate || !editingPlanId) return;
    if (!confirm('确定删除 ' + editingDate + ' 的记录？')) return;
    try {
      await request('DELETE',
        '/api/tracker/plans/' + encodeURIComponent(editingPlanId) + '/records/' + encodeURIComponent(editingDate));
      delete recordsByPlan[editingPlanId];
      closeAllDialogs();
      await renderCurrentPlan();
    } catch (err) {
      dialogErrorEl.textContent = err.message;
    }
  });

  // ---------------------------------------------------------------------------
  // 计划弹窗
  // ---------------------------------------------------------------------------

  newPlanBtn.addEventListener('click', function () {
    if (!isLoggedIn()) { openLoginDialog(); return; }
    editingPlanMode = 'create';
    planDialogTitle.textContent = '新建计划';
    planForm.reset();
    planForm.elements['start_date'].value = todayStr();
    planDeleteBtn.hidden = true;
    planErrorEl.textContent = '';
    showDialog(planDialog);
  });

  editPlanBtn.addEventListener('click', function () {
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
  });

  planForm.addEventListener('submit', async function (e) {
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
      // 清缓存重载
      recordsByPlan = {};
      milestonesByPlan = {};
      closeAllDialogs();
      await loadPlans();
    } catch (err) {
      planErrorEl.textContent = err.message;
      if (err.status === 401) { token = ''; localStorage.removeItem(TOKEN_KEY); refreshAuthUI(); }
    }
  });

  planDeleteBtn.addEventListener('click', async function () {
    if (!currentPlanId) return;
    if (!confirm('确定删除这个计划及其所有记录？此操作不可恢复。')) return;
    try {
      await request('DELETE', '/api/tracker/plans/' + encodeURIComponent(currentPlanId));
      recordsByPlan = {};
      milestonesByPlan = {};
      closeAllDialogs();
      await loadPlans();
    } catch (err) {
      planErrorEl.textContent = err.message;
    }
  });

  // ---------------------------------------------------------------------------
  // 登录
  // ---------------------------------------------------------------------------

  function openLoginDialog() {
    loginForm.reset();
    loginErrorEl.textContent = '';
    showDialog(loginDialog);
  }

  loginBtn.addEventListener('click', openLoginDialog);
  logoutBtn.addEventListener('click', function () {
    token = '';
    localStorage.removeItem(TOKEN_KEY);
    refreshAuthUI();
  });

  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    loginErrorEl.textContent = '';
    var password = loginForm.elements['password'].value;
    try {
      var data = await request('POST', '/api/tracker/auth/login', { password: password });
      token = data.token;
      localStorage.setItem(TOKEN_KEY, token);
      closeAllDialogs();
      refreshAuthUI();
    } catch (err) {
      loginErrorEl.textContent = err.message;
    }
  });

  // ---------------------------------------------------------------------------
  // 关闭按钮
  // ---------------------------------------------------------------------------

  root.querySelectorAll('[data-tracker-close]').forEach(function (el) {
    el.addEventListener('click', closeAllDialogs);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllDialogs();
  });

  // ---------------------------------------------------------------------------
  // 启动
  // ---------------------------------------------------------------------------

  loadPlans().catch(function (err) {
    console.error('[tracker] 初始化失败', err);
    heatmapEl.innerHTML = '<p class="tracker-empty">加载失败：' + escapeHTML(err.message) + '</p>';
  });
})();
