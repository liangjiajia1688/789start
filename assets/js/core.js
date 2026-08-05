/* ============================================================
   core.js — 存储 / 进度 / 路由 / 数据加载
   ============================================================ */
(function (w) {
  'use strict';

  var KEY = 'studyhub.v1';

  /* ---------- 默认状态 ---------- */
  function defaults() {
    return {
      grade: 'g8',
      name: '',
      xp: 0,
      settings: {
        autoSpeak: true,      // 开始测试时自动播报一次题目
        autoSpeakNext: true,  // 切到下一题也自动播报
        rate: 1,
        voiceZh: '',
        voiceEn: '',
        gate: true            // 闯关解锁模式
      },
      // progress[gradeId][subjectId][unitId] = {best, stars, passed, attempts, lastAt}
      progress: {},
      badges: [],
      days: []                // 打卡日期 YYYY-MM-DD
    };
  }

  var S = load();

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      var o = JSON.parse(raw), d = defaults();
      o.settings = Object.assign(d.settings, o.settings || {});
      return Object.assign(d, o);
    } catch (e) { return defaults(); }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { }
  }

  /* ---------- 进度 API ---------- */
  function getUnit(g, s, u) {
    return (((S.progress[g] || {})[s] || {})[u]) || { best: 0, stars: 0, passed: false, attempts: 0, lastAt: 0 };
  }

  function setUnit(g, s, u, rec) {
    S.progress[g] = S.progress[g] || {};
    S.progress[g][s] = S.progress[g][s] || {};
    var old = getUnit(g, s, u);
    S.progress[g][s][u] = Object.assign(old, rec);
    save();
  }

  var PASS = 0.8; // 80% 通关线（每次抽 10 题，答对 8 题即通关）
  var QPERQUIZ = 10; // 每次测试随机抽取的题数

  function starsOf(pct) {
    if (pct >= 1) return 3;
    if (pct >= 0.95) return 2;
    if (pct >= PASS) return 1;
    return 0;
  }

  /** 提交一次测试成绩 */
  function submit(g, s, u, correct, total) {
    var pct = total ? correct / total : 0;
    var old = getUnit(g, s, u);
    var st = starsOf(pct);
    var firstPass = !old.passed && pct >= PASS;
    var rec = {
      best: Math.max(old.best, pct),
      stars: Math.max(old.stars, st),
      passed: old.passed || pct >= PASS,
      attempts: old.attempts + 1,
      lastAt: Date.now()
    };
    setUnit(g, s, u, rec);

    // 经验值：首次通关 100，重复通关 20，未通关按正确数 2/题
    var gain = firstPass ? 100 + st * 20 : (pct >= PASS ? 20 : correct * 2);
    S.xp += gain;
    markDay();
    save();
    return { pct: pct, stars: st, passed: pct >= PASS, firstPass: firstPass, xp: gain };
  }

  function markDay() {
    var d = new Date(), t = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    if (S.days.indexOf(t) < 0) { S.days.push(t); if (S.days.length > 400) S.days.shift(); }
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /** 连续打卡天数 */
  function streak() {
    if (!S.days.length) return 0;
    var set = {}, i;
    for (i = 0; i < S.days.length; i++) set[S.days[i]] = 1;
    var n = 0, d = new Date();
    for (i = 0; i < 400; i++) {
      var k = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
      if (set[k]) { n++; d.setDate(d.getDate() - 1); }
      else if (i === 0) { d.setDate(d.getDate() - 1); }
      else break;
    }
    return n;
  }

  function level() {
    // 每级所需 XP 递增：Lv n 门槛 = 150 * n * (n+1) / 2
    var lv = 1, need = 150, acc = 0;
    while (S.xp >= acc + need && lv < 99) { acc += need; lv++; need = 150 * lv; }
    return { lv: lv, cur: S.xp - acc, need: need };
  }

  /** 学科统计 */
  function subjectStat(g, subj) {
    var done = 0, stars = 0, total = subj.units.length;
    subj.units.forEach(function (u) {
      var p = getUnit(g, subj.id, u.id);
      if (p.passed) done++;
      stars += p.stars;
    });
    return { done: done, total: total, stars: stars, maxStars: total * 3, pct: total ? done / total : 0 };
  }

  /** 单元是否解锁 */
  function unlocked(g, subj, idx) {
    if (!S.settings.gate) return true;
    if (idx === 0) return true;
    return getUnit(g, subj.id, subj.units[idx - 1].id).passed;
  }

  /* ---------- 数据加载（动态 script，兼容 file:// ） ---------- */
  w.STUDY_DATA = w.STUDY_DATA || {};
  var loaded = {}, loading = {};

  /** 规范化为 volumes（分册展示）+ 扁平 units（统计/解锁/查找） */
  function normalize(obj) {
    if (!obj) return obj;
    if (obj.volumes && obj.volumes.length) {
      var flat = [];
      obj.volumes.forEach(function (v) { (v.units || []).forEach(function (u) { flat.push(u); }); });
      obj.units = flat;
    } else if (obj.units) {
      obj.volumes = [{ code: 's1', name: obj.term || '上册', units: obj.units }];
    }
    return obj;
  }

  function filesFor(grade, sid) {
    var G = w.GRADES[grade];
    if (!G) return [sid];
    var s = (G.subjects || []).filter(function (x) { return x.id === sid; })[0];
    return (s && s.files) ? s.files : [sid];
  }

  function loadSubject(grade, sid, cb) {
    var key = grade + '/' + sid;
    if (loaded[key]) return cb(normalize(w.STUDY_DATA[key]));
    if (loading[key]) { loading[key].push(cb); return; }
    loading[key] = [cb];
    var files = filesFor(grade, sid);
    var pending = files.length, done = 0;
    function after() {
      if (++done < pending) return;
      var d = normalize(w.STUDY_DATA[key]);
      loaded[key] = true;
      loading[key].forEach(function (f) { f(d); });
      delete loading[key];
    }
    files.forEach(function (f) {
      var sc = document.createElement('script');
      sc.src = 'data/' + grade + '/' + f + '.js?v=3';
      sc.onload = after; sc.onerror = after;
      document.head.appendChild(sc);
    });
  }

  /** 注册学科数据（各 data/*.js 调用） */
  w.registerSubject = function (grade, obj) {
    w.STUDY_DATA[grade + '/' + obj.id] = obj;
  };

  /** 追加一个分册（下册），自动合并进 units，避免覆盖上册注册 */
  w.registerVolume = function (grade, id, vol) {
    var key = grade + '/' + id;
    var subj = w.STUDY_DATA[key];
    if (!subj) { subj = { id: id, volumes: [], units: [] }; w.STUDY_DATA[key] = subj; }
    if (!subj.volumes) {
      subj.volumes = (subj.units && subj.units.length)
        ? [{ code: 's1', name: subj.term || '上册', units: subj.units }] : [];
    }
    var replaced = false;
    subj.volumes = subj.volumes.map(function (v) { if (v.code === vol.code) { replaced = true; return vol; } return v; });
    if (!replaced) {
      subj.volumes.push(vol);
      subj.units = (subj.units || []).concat(vol.units || []);
    }
  };

  /* ---------- 路由 ---------- */
  var routes = [];
  function route(re, fn) { routes.push([re, fn]); }
  function go(hash) { location.hash = hash; }
  function current() { return location.hash.replace(/^#/, '') || '/'; }

  function dispatch() {
    var p = current();
    for (var i = 0; i < routes.length; i++) {
      var m = p.match(routes[i][0]);
      if (m) { routes[i][1].apply(null, m.slice(1)); return; }
    }
    routes[0] && routes[0][1]();
  }

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /** 支持 **加粗** 的极简富文本 */
  function rich(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  var toastT;
  function toast(msg, ms) {
    var el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.classList.remove('on'); }, ms || 1900);
  }

  function starHTML(n, max) {
    max = max || 3; var s = '';
    for (var i = 0; i < max; i++) s += i < n ? '★' : '<span class="off">★</span>';
    return s;
  }

  function ringSVG(pct, size, color) {
    size = size || 96; color = color || '#14161a';
    var r = size / 2 - 7, c = 2 * Math.PI * r;
    return '<svg class="res-ring" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="#e6e5e1" stroke-width="7"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="7" stroke-linecap="round" ' +
      'stroke-dasharray="' + c + '" stroke-dashoffset="' + (c * (1 - pct)) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/>' +
      '<text x="50%" y="50%" text-anchor="middle" dy=".36em" font-size="' + (size * 0.26) + '" font-weight="700" fill="#14161a">' + Math.round(pct * 100) + '%</text></svg>';
  }

  /** 规范化填空答案用于比对 */
  function norm(s) {
    return String(s || '').trim().toLowerCase()
      .replace(/[\s\u3000]+/g, '')
      .replace(/[，。！？、；：""''（）《》,.!?;:"'()]/g, '');
  }

  w.App = {
    S: S, save: save, defaults: defaults, KEY: KEY,
    PASS: PASS,
    QPERQUIZ: QPERQUIZ,
    getUnit: getUnit, setUnit: setUnit, submit: submit, starsOf: starsOf,
    streak: streak, level: level, subjectStat: subjectStat, unlocked: unlocked,
    loadSubject: loadSubject,
    route: route, go: go, dispatch: dispatch, current: current,
    esc: esc, rich: rich, shuffle: shuffle, toast: toast,
    starHTML: starHTML, ringSVG: ringSVG, norm: norm
  };
})(window);
