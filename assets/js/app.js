/* ============================================================
   app.js — 路由注册 / 底部导航 / 初始化
   ============================================================ */
(function (w) {
  'use strict';
  var A = w.App;

  /* ---------- 路由 ---------- */
  A.route(/^\/$/, function () { w.Views.home(); });
  A.route(/^\/subjects$/, function () { w.Views.subjects(); });
  A.route(/^\/achievements$/, function () { w.Views.achievements(); });
  A.route(/^\/mine$/, function () { w.Views.mine(); });
  A.route(/^\/s\/([^/]+)\/([^/]+)$/, function (g, s) { w.Views.subject(g, s); });
  A.route(/^\/unit\/([^/]+)\/([^/]+)\/([^/]+)$/, function (g, s, u) { w.Views.unit(g, s, u); });
  A.route(/^\/quiz\/([^/]+)\/([^/]+)\/([^/]+)$/, function (g, s, uid) {
    w.Speech.stop();
    A.loadSubject(g, s, function (d) {
      if (!d) { A.go('/'); return; }
      var u = null;
      d.units.forEach(function (x) { if (x.id === uid) u = x; });
      if (!u) { A.go('/s/' + g + '/' + s); return; }
      document.getElementById('tbTitle').textContent = u.title + ' · 测试';
      document.getElementById('btnBack').classList.add('show');
      w.Quiz.start(g, d, u);
      w.scrollTo(0, 0);
    });
  });

  w.addEventListener('hashchange', function () { A.dispatch(); markNav(); });

  /* ---------- 返回 ---------- */
  document.getElementById('btnBack').onclick = function () {
    w.Speech.stop();
    var p = A.current();
    var m;
    if ((m = p.match(/^\/quiz\/([^/]+)\/([^/]+)\/([^/]+)$/))) A.go('/unit/' + m[1] + '/' + m[2] + '/' + m[3]);
    else if ((m = p.match(/^\/unit\/([^/]+)\/([^/]+)\/([^/]+)$/))) A.go('/s/' + m[1] + '/' + m[2]);
    else A.go('/');
  };
  document.getElementById('tbBrand').onclick = function () { w.Speech.stop(); A.go('/'); };

  /* ---------- 底部导航 ---------- */
  function markNav() {
    var p = A.current();
    var active = 'navHome';
    if (p.indexOf('/subjects') === 0) active = 'navSubjects';
    else if (p.indexOf('/achievements') === 0) active = 'navAch';
    else if (p.indexOf('/mine') === 0) active = 'navMine';
    else if (p === '/' || p.indexOf('/s/') === 0 || p.indexOf('/unit/') === 0 || p.indexOf('/quiz/') === 0) active = 'navHome';
    Array.prototype.forEach.call(document.querySelectorAll('.tabbar button'), function (b) {
      b.classList.toggle('on', b.id === active);
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll('.tabbar button'), function (b) {
    b.onclick = function () { w.Speech.stop(); A.go(b.dataset.route); };
  });

  /* ---------- 顶栏 XP ---------- */
  function refreshXp() {
    var lv = A.level();
    document.getElementById('tbLv').textContent = 'Lv.' + lv.lv;
    document.getElementById('tbXpNum').textContent = A.S.xp + ' XP';
  }
  var _save = A.save;
  A.save = function () { _save(); refreshXp(); };

  /* ---------- 启动 ---------- */
  w.Speech.initBar();
  refreshXp();
  markNav();
  if (!location.hash) location.hash = '/';
  A.dispatch();

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) w.Speech.stop();
  });
})(window);
