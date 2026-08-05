/* ============================================================
   views.js — 页面渲染：首页 / 学科 / 单元 / 成就 / 我的
   ============================================================ */
(function (w) {
  'use strict';
  var A = w.App;
  var V = function () { return document.getElementById('view'); };

  function setTitle(t, showBack) {
    document.getElementById('tbTitle').textContent = t;
    document.getElementById('btnBack').classList.toggle('show', !!showBack);
  }
  function clearBar() {
    document.body.classList.remove('has-fixedbar');
    var b = document.getElementById('quizbar'); if (b) b.remove();
  }

  /* ================= 首页 ================= */
  function home() {
    w.Speech.stop(); clearBar();
    setTitle('学习工作台', false);
    var g = A.S.grade;
    var mf = w.GRADES[g] || { subjects: [] };
    var lv = A.level();
    var name = (A.S.name || '').trim();

    var html = '<div class="hero fadeup">' +
      '<div class="hero-greet">' + (name ? (A.esc(name) + '，') : '') + '继续加油！</div>' +
      '<h1>' + mf.name + '学习闯关</h1>' +
      '<p>知识要点 · 课文朗读 · 单元测试 · 答对 80% 通关</p></div>';

    html += '<div class="grades">' + Object.keys(w.GRADES).map(function (k) {
      var G = w.GRADES[k];
      return '<button class="grade' + (k === g ? ' active' : '') + (G.ready ? '' : ' soon') + '" data-g="' + k + '">' +
        '<b>' + G.short + '</b><span>' + (G.ready ? G.subjects.length + ' 个学科' : '筹备中') + '</span></button>';
    }).join('') + '</div>';

    // 统计
    html += '<div class="stats fadeup" id="statsBox">' +
      '<div class="stat"><b id="stLv">Lv.' + lv.lv + '</b><span>等级</span></div>' +
      '<div class="stat"><b id="stPass">–</b><span>已通关</span></div>' +
      '<div class="stat"><b id="stStar">–</b><span>获得星星</span></div>' +
      '<div class="stat"><b>' + A.streak() + '</b><span>连续天数</span></div>' +
      '</div>';

    if (!mf.ready) {
      html += '<div class="empty"><div class="e-i">🚧</div><h3>' + mf.name + '内容筹备中</h3>' +
        '<p>其它年级可按 <code>data/g8/*.js</code> 的格式扩展。</p></div>';
      V().innerHTML = html;
      bindGrades();
      return;
    }

    // 继续学习（最近一次有记录的单元）
    var cont = lastUnit(g);
    if (cont) {
      html += '<button class="continue fadeup" id="contCard" data-g="' + cont.g + '" data-s="' + cont.s + '" data-u="' + cont.u + '">' +
        '<span class="c-i">▶</span><span class="c-body"><b>继续学习</b>' +
        '<span class="c-title">点击继续 · 最好 ' + Math.round(cont.best * 100) + '%</span></span>' +
        '<span class="stars">' + A.starHTML(cont.stars) + '</span></button>';
    }

    html += '<div class="section"><div class="sec-head"><h2 class="sec-title">学科</h2>' +
      '<span class="sec-more">点击进入关卡</span></div>' +
      '<div class="subjects" id="subjGrid">' +
      mf.subjects.map(function (s) {
        return '<button class="subj" data-s="' + s.id + '">' +
          '<span class="subj-bar" style="background:' + s.color + '"></span>' +
          '<div class="subj-top"><span class="subj-icon" style="background:' + s.color + '">' + s.icon + '</span>' +
          '<div><div class="subj-name">' + s.name + '</div><div class="subj-meta" id="meta-' + s.id + '">加载中…</div></div></div>' +
          '<div class="subj-prog"><i id="bar-' + s.id + '" style="width:0%;background:' + s.color + '"></i></div>' +
          '<div class="subj-foot"><span id="foot-' + s.id + '">–</span><span class="stars" id="star-' + s.id + '"></span></div>' +
          '</button>';
      }).join('') + '</div></div>';

    html += '<div class="notice">🔊 全站支持语音朗读：课文、知识要点、题目均可点击喇叭收听；英语内容自动切换英文发音人。' +
      '在底部「我的」可编辑姓名、切换年级、调整语音与闯关设置。</div>';

    V().innerHTML = html;
    bindGrades();

    var cBtn = document.querySelector('.continue');
    if (cBtn) cBtn.onclick = function () { A.go('/unit/' + cBtn.dataset.g + '/' + cBtn.dataset.s + '/' + cBtn.dataset.u); };

    Array.prototype.forEach.call(document.querySelectorAll('.subj'), function (b) {
      b.onclick = function () { A.go('/s/' + g + '/' + b.dataset.s); };
    });

    var totalPass = 0, totalStar = 0, left = mf.subjects.length;
    mf.subjects.forEach(function (s) {
      A.loadSubject(g, s.id, function (d) {
        left--;
        var mEl = document.getElementById('meta-' + s.id);
        if (!mEl) return;
        if (!d) { mEl.textContent = '数据未就绪'; return; }
        var st = A.subjectStat(g, d);
        totalPass += st.done; totalStar += st.stars;
        var vols = (d.volumes || []).map(function (v) { return v.name; }).join(' / ');
        mEl.textContent = st.total + ' 个单元' + (d.volumes && d.volumes.length > 1 ? ' · 上下册' : (vols ? ' · ' + vols : ''));
        document.getElementById('bar-' + s.id).style.width = (st.pct * 100) + '%';
        document.getElementById('foot-' + s.id).textContent = st.done + '/' + st.total + ' 通关';
        document.getElementById('star-' + s.id).textContent = '★ ' + st.stars;
        if (cont && cont.s === s.id) {
          var ut = null;
          d.units.forEach(function (x) { if (x.id === cont.u) ut = x.title; });
          var ct = document.querySelector('#contCard .c-title');
          if (ut && ct) ct.textContent = A.esc(ut) + ' · 最好 ' + Math.round(cont.best * 100) + '%';
        }
        if (left === 0) {
          var a = document.getElementById('stPass'), b2 = document.getElementById('stStar');
          if (a) a.textContent = totalPass; if (b2) b2.textContent = totalStar;
        }
      });
    });
  }

  function lastUnit(g) {
    var prog = (A.S.progress[g] || {}), best = null;
    Object.keys(prog).forEach(function (s) {
      Object.keys(prog[s]).forEach(function (u) {
        var p = prog[s][u];
        if (p && p.attempts && (!best || p.lastAt > best.lastAt)) best = { g: g, s: s, u: u, best: p.best, stars: p.stars, lastAt: p.lastAt };
      });
    });
    return best;
  }

  function bindGrades() {
    Array.prototype.forEach.call(document.querySelectorAll('.grade'), function (b) {
      b.onclick = function () { A.S.grade = b.dataset.g; A.save(); home(); w.scrollTo(0, 0); };
    });
  }

  /* ================= 学科浏览（底部导航「学科」） ================= */
  function subjects() {
    w.Speech.stop(); clearBar();
    setTitle('学科', false);
    var g = A.S.grade;
    var html = '<div class="grades grades-top">' + Object.keys(w.GRADES).map(function (k) {
      var G = w.GRADES[k];
      return '<button class="grade' + (k === g ? ' active' : '') + (G.ready ? '' : ' soon') + '" data-g="' + k + '">' +
        '<b>' + G.short + '</b><span>' + (G.ready ? G.subjects.length + ' 科' : '筹备中') + '</span></button>';
    }).join('') + '</div>';

    var G = w.GRADES[g];
    if (G && G.ready) {
      html += '<div class="section"><div class="sec-head"><h2 class="sec-title">' + G.name + ' · 全部学科</h2>' +
        '<span class="sec-more">点击进入</span></div><div class="subjects" id="subjGrid2">';
      html += G.subjects.map(function (s) {
        return '<button class="subj" data-s="' + s.id + '" data-g="' + g + '">' +
          '<span class="subj-bar" style="background:' + s.color + '"></span>' +
          '<div class="subj-top"><span class="subj-icon" style="background:' + s.color + '">' + s.icon + '</span>' +
          '<div><div class="subj-name">' + s.name + '</div><div class="subj-meta" id="meta2-' + s.id + '">加载中…</div></div></div>' +
          '<div class="subj-prog"><i id="bar2-' + s.id + '" style="width:0%;background:' + s.color + '"></i></div>' +
          '<div class="subj-foot"><span id="foot2-' + s.id + '">–</span><span class="stars" id="star2-' + s.id + '"></span></div>' +
          '</button>';
      }).join('') + '</div></div>';
    }
    V().innerHTML = html;

    Array.prototype.forEach.call(document.querySelectorAll('.grades-top .grade'), function (b) {
      b.onclick = function () { A.S.grade = b.dataset.g; A.save(); subjects(); w.scrollTo(0, 0); };
    });
    Array.prototype.forEach.call(document.querySelectorAll('#subjGrid2 .subj'), function (b) {
      b.onclick = function () { A.go('/s/' + b.dataset.g + '/' + b.dataset.s); };
    });

    if (G && G.ready) {
      var left = G.subjects.length;
      G.subjects.forEach(function (s) {
        A.loadSubject(g, s.id, function (d) {
          left--;
          var mEl = document.getElementById('meta2-' + s.id); if (!mEl) return;
          if (!d) { mEl.textContent = '数据未就绪'; return; }
          var st = A.subjectStat(g, d);
          mEl.textContent = st.total + ' 个单元' + (d.volumes && d.volumes.length > 1 ? ' · 上下册' : '');
          document.getElementById('bar2-' + s.id).style.width = (st.pct * 100) + '%';
          document.getElementById('foot2-' + s.id).textContent = st.done + '/' + st.total + ' 通关';
          document.getElementById('star2-' + s.id).textContent = '★ ' + st.stars;
        });
      });
    }
  }

  /* ================= 学科关卡页（含上下册分册） ================= */
  function subject(g, sid) {
    w.Speech.stop(); clearBar();
    V().innerHTML = '<div class="empty"><div class="e-i">⏳</div><h3>加载中…</h3></div>';
    A.loadSubject(g, sid, function (d) {
      if (!d) {
        setTitle('未找到', true);
        V().innerHTML = '<div class="empty"><div class="e-i">😕</div><h3>学科数据未找到</h3><p>请检查 data/' + g + '/' + sid + '.js</p></div>';
        return;
      }
      setTitle(d.name, true);
      var st = A.subjectStat(g, d);
      var vols = (d.volumes || []).map(function (v) { return v.name; }).join(' / ');
      var html = '<div class="hero fadeup"><h1>' + d.name + ' <span style="font-size:15px;color:var(--ink-3);font-weight:500">' + (vols || '') + '</span></h1>' +
        '<p>' + (d.desc || '') + '</p></div>';

      html += '<div class="stats fadeup">' +
        '<div class="stat"><b>' + st.done + '/' + st.total + '</b><span>已通关</span></div>' +
        '<div class="stat"><b>' + st.stars + '</b><span>星星</span></div>' +
        '<div class="stat"><b>' + Math.round(st.pct * 100) + '%</b><span>完成度</span></div>' +
        '<div class="stat"><b>' + d.units.reduce(function (a, u) { return a + (u.quiz || []).length; }, 0) + '</b><span>总题数</span></div>' +
        '</div>';

      // 按分册渲染单元
      var flat = 0;
      (d.volumes || []).forEach(function (vol) {
        html += '<div class="section"><div class="sec-head"><h2 class="sec-title">' + A.esc(vol.name) + '</h2>' +
          '<span class="sec-more">' + (A.S.settings.gate ? '依次解锁' : '已全部解锁') + '</span></div><div class="unitlist">';
        vol.units.forEach(function (u) {
          var p = A.getUnit(g, sid, u.id);
          var open = A.unlocked(g, d, flat);
          var cls = 'unit' + (p.passed ? ' done' : '') + (open ? '' : ' locked');
          var nq = (u.quiz || []).length;
          html += '<button class="' + cls + '" data-u="' + u.id + '" data-open="' + (open ? 1 : 0) + '">' +
            '<span class="u-node">' + (p.passed ? '✓' : (open ? (flat + 1) : '🔒')) + '</span>' +
            '<span class="u-body">' +
            '<span class="u-title">' + A.esc(u.title) + '</span>' +
            '<span class="u-sub">' + A.esc(u.summary || '') + '</span>' +
            '<span class="u-tags">' +
            (u.points && u.points.length ? '<span class="tag b">💡 ' + u.points.length + ' 个要点</span>' : '') +
            (u.texts && u.texts.length ? '<span class="tag">📖 ' + u.texts.length + ' 篇课文</span>' : '') +
            (u.words && u.words.length ? '<span class="tag">🔤 ' + u.words.length + ' 词</span>' : '') +
            '<span class="tag y">📝 ' + nq + ' 题</span>' +
            '</span></span>' +
            '<span class="u-right">' +
            '<span class="stars">' + A.starHTML(p.stars) + '</span>' +
            '<span class="u-score">' + (p.attempts ? Math.round(p.best * 100) + '%' : '未测试') + '</span>' +
            '</span></button>';
          flat++;
        });
        html += '</div></div>';
      });
      V().innerHTML = html;

      Array.prototype.forEach.call(document.querySelectorAll('.unit'), function (b) {
        b.onclick = function () {
          if (b.dataset.open !== '1') { A.toast('先通关上一单元才能解锁哦（可在「我的」关闭闯关模式）'); return; }
          A.go('/unit/' + g + '/' + sid + '/' + b.dataset.u);
        };
      });
      w.scrollTo(0, 0);
    });
  }

  /* ================= 单元详情页 ================= */
  var curTab = 'points';
  function unit(g, sid, uid, tab) {
    w.Speech.stop(); clearBar();
    V().innerHTML = '<div class="empty"><div class="e-i">⏳</div><h3>加载中…</h3></div>';
    A.loadSubject(g, sid, function (d) {
      if (!d) { V().innerHTML = '<div class="empty"><h3>数据未找到</h3></div>'; return; }
      var u = null, idx = -1, volName = '';
      d.units.forEach(function (x, i) { if (x.id === uid) { u = x; idx = i; } });
      if (!u) { V().innerHTML = '<div class="empty"><h3>单元未找到</h3></div>'; return; }
      (d.volumes || []).forEach(function (v) { if (v.units.some(function (x) { return x.id === uid; })) volName = v.name; });
      setTitle(u.title, true);
      curTab = tab || 'points';
      renderUnit(g, d, u, idx, volName);
    });
  }

  function renderUnit(g, d, u, idx, volName) {
    var p = A.getUnit(g, d.id, u.id);
    var tabs = [];
    if (u.points && u.points.length) tabs.push(['points', '💡 要点']);
    if (u.texts && u.texts.length) tabs.push(['texts', '📖 课文']);
    if (u.words && u.words.length) tabs.push(['words', d.lang === 'en' ? '🔤 单词' : '🔤 字词']);
    tabs.push(['quiz', '📝 测试']);
    if (!tabs.some(function (t) { return t[0] === curTab; })) curTab = tabs[0][0];

    var html = '<div class="hero fadeup" style="margin-bottom:14px">' +
      '<h1 style="font-size:21px">' + A.esc(u.title) + '</h1>' +
      (volName ? '<div class="u-vol">' + A.esc(volName) + '</div>' : '') +
      '<p>' + A.esc(u.summary || '') + '</p>' +
      '<div class="u-tags" style="margin-top:9px">' +
      '<span class="tag ' + (p.passed ? 'g' : '') + '">' + (p.passed ? '✓ 已通关' : '未通关') + '</span>' +
      '<span class="tag">最好成绩 ' + (p.attempts ? Math.round(p.best * 100) + '%' : '—') + '</span>' +
      '<span class="tag"><span class="stars">' + A.starHTML(p.stars) + '</span></span>' +
      '</div></div>';

    html += '<div class="tabs">' + tabs.map(function (t) {
      return '<button class="tab' + (t[0] === curTab ? ' on' : '') + '" data-t="' + t[0] + '">' + t[1] + '</button>';
    }).join('') + '</div>';

    html += '<div id="tabBody">' + tabBody(d, u) + '</div><div class="fabspace"></div>';
    V().innerHTML = html;

    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
      b.onclick = function () {
        w.Speech.stop();
        curTab = b.dataset.t;
        Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (x) { x.classList.toggle('on', x === b); });
        document.getElementById('tabBody').innerHTML = tabBody(d, u);
        bindTab(g, d, u);
        w.scrollTo(0, 0);
      };
    });
    bindTab(g, d, u);

    var bar = document.createElement('div');
    bar.className = 'fixedbar'; bar.id = 'quizbar';
    bar.innerHTML = '<div class="fixedbar-inner">' +
      '<button class="btn btn-ghost" id="uSpeakAll" style="flex:0 0 auto;white-space:nowrap">🔊 全文朗读</button>' +
      '<button class="btn btn-primary" id="uStart">开始测试</button>' +
      '</div>';
    document.body.appendChild(bar);
    document.body.classList.add('has-fixedbar');
    document.getElementById('uStart').onclick = function () { A.go('/quiz/' + g + '/' + d.id + '/' + u.id); };
    document.getElementById('uSpeakAll').onclick = function () { speakUnit(d, u); };
    w.scrollTo(0, 0);
  }

  function tabBody(d, u) {
    var en = d.lang === 'en';
    if (curTab === 'points') {
      return (u.points || []).map(function (k, i) {
        return '<div class="kp fadeup"><button class="kp-play" data-speak="' + i + '" data-kind="p">🔊</button>' +
          '<div class="kp-h"><span class="kp-i">💡</span><span class="kp-t">' + A.rich(k.t) + '</span></div>' +
          '<div class="kp-d">' + A.rich(k.d) + '</div></div>';
      }).join('') || empty('本单元暂无知识要点');
    }
    if (curTab === 'texts') {
      return (u.texts || []).map(function (t, i) {
        var full = t.type !== 'excerpt';
        return '<div class="text-card fadeup">' +
          '<div class="tc-head"><div class="tc-h-main"><div class="tc-title">' + A.esc(t.title) + '</div>' +
          '<div class="tc-author">' + A.esc(t.author || '') + (t.genre ? ' · ' + A.esc(t.genre) : '') +
          (full ? '' : ' · <span style="color:var(--warn)">精选片段</span>') + '</div></div>' +
          '<button class="w-play" data-speak="' + i + '" data-kind="t">▶</button></div>' +
          '<div class="tc-body' + (en || t.lang === 'en' ? ' en' : '') + '" data-text="' + i + '">' +
          (t.paras || []).map(function (para, j) {
            return '<p class="para" data-t="' + i + '" data-p="' + j + '">' + A.rich(para) + '</p>';
          }).join('') + '</div>' +
          (t.trans ? '<div class="tc-note"><b>参考译文：</b>' + A.rich(t.trans) + '</div>' : '') +
          (t.note ? '<div class="tc-note">' + A.rich(t.note) + '</div>' : '') +
          '</div>';
      }).join('') || empty('本单元暂无课文');
    }
    if (curTab === 'words') {
      return '<div class="words">' + (u.words || []).map(function (x, i) {
        return '<div class="word fadeup"><div class="w-main">' +
          '<div class="w-w">' + A.esc(x.w) + '</div>' +
          (x.p ? '<div class="w-p">' + A.esc(x.p) + '</div>' : '') +
          (x.m ? '<div class="w-m">' + A.esc(x.m) + '</div>' : '') +
          '</div><button class="w-play" data-speak="' + i + '" data-kind="w">🔊</button></div>';
      }).join('') + '</div>' +
        '<button class="btn btn-ghost btn-block" id="wAll" style="margin-top:12px">🔊 连读全部' + (en ? '单词' : '字词') + '</button>';
    }
    var n = (u.quiz || []).length;
    var take = Math.min(A.QPERQUIZ || 10, n);
    var need = Math.ceil(take * A.PASS);
    return '<div class="card card-pad fadeup" style="text-align:center">' +
      '<div style="font-size:34px;margin-bottom:8px">📝</div>' +
      '<div style="font-size:17px;font-weight:700;margin-bottom:4px">单元测试</div>' +
      '<div style="color:var(--ink-2);font-size:14px;margin-bottom:14px">每次随机 ' + take + ' 题 · 答对 ' + need + ' 题（' + Math.round(A.PASS * 100) + '%）即可通关</div>' +
      '<div class="res-grid" style="margin-bottom:14px">' +
      '<div><b>' + take + '</b><span>每次题数</span></div>' +
      '<div><b>' + need + '</b><span>通关需答对</span></div>' +
      '<div><b>' + Math.round(A.PASS * 100) + '%</b><span>通关线</span></div></div>' +
      '<div style="font-size:13px;color:var(--ink-3);line-height:1.8;text-align:left">' +
      '· 题型：单选 / 多选 / 判断 / 填空，每次随机打乱顺序<br>' +
      '· 开启「自动播报」后，点击开始测试将自动朗读题目<br>' +
      '· 答错不中断，交卷后可查看全部解析与错题回顾</div>' +
      '</div>';
  }

  function empty(t) { return '<div class="empty"><div class="e-i">📭</div><h3>' + t + '</h3></div>'; }

  function bindTab(g, d, u) {
    var en = d.lang === 'en';
    Array.prototype.forEach.call(document.querySelectorAll('[data-speak]'), function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var i = +b.dataset.speak, kind = b.dataset.kind;
        if (kind === 'p') {
          var k = u.points[i];
          w.Speech.speak(strip(k.t) + '。' + strip(k.d), { label: '知识要点 ' + (i + 1) });
        } else if (kind === 't') {
          speakText(d, u, i);
        } else if (kind === 'w') {
          var x = u.words[i];
          var lg = en ? 'en' : 'zh';
          var items = [{ text: x.w, lang: lg }];
          if (x.m) items.push({ text: x.m, lang: 'zh' });
          if (en && x.eg) items.push({ text: x.eg, lang: 'en' });
          w.Speech.speak(items, { label: x.w });
        }
      };
    });

    Array.prototype.forEach.call(document.querySelectorAll('.para'), function (p) {
      p.onclick = function () {
        var ti = +p.dataset.t;
        var t = u.texts[ti];
        var lg = (en || t.lang === 'en') ? 'en' : 'zh';
        w.Speech.speak([{ text: strip(p.textContent), el: p, lang: lg }], { label: t.title });
      };
    });

    var wa = document.getElementById('wAll');
    if (wa) wa.onclick = function () {
      var items = [];
      (u.words || []).forEach(function (x) {
        items.push({ text: x.w, lang: en ? 'en' : 'zh' });
        if (x.m) items.push({ text: x.m, lang: 'zh' });
      });
      w.Speech.speak(items, { label: '词表连读' });
    };
  }

  function strip(s) { return String(s).replace(/\*\*/g, ''); }

  function speakText(d, u, i) {
    var t = u.texts[i];
    var lg = (d.lang === 'en' || t.lang === 'en') ? 'en' : 'zh';
    var nodes = document.querySelectorAll('.para[data-t="' + i + '"]');
    var items = [];
    items.push({ text: t.title + (t.author ? '。' + t.author : ''), lang: lg === 'en' ? 'en' : 'zh' });
    Array.prototype.forEach.call(nodes, function (nd) {
      items.push({ text: strip(nd.textContent), el: nd, lang: lg });
    });
    w.Speech.speak(items, { label: t.title });
  }

  function speakUnit(d, u) {
    var en = d.lang === 'en';
    var items = [{ text: u.title + '。' + (u.summary || ''), lang: 'zh' }];
    if (curTab === 'texts' && u.texts && u.texts.length) {
      u.texts.forEach(function (t, i) {
        items.push({ text: t.title, lang: 'zh' });
        var nodes = document.querySelectorAll('.para[data-t="' + i + '"]');
        Array.prototype.forEach.call(nodes, function (nd) {
          items.push({ text: strip(nd.textContent), el: nd, lang: (en || t.lang === 'en') ? 'en' : 'zh' });
        });
      });
    } else if (curTab === 'words' && u.words) {
      u.words.forEach(function (x) {
        items.push({ text: x.w, lang: en ? 'en' : 'zh' });
        if (x.m) items.push({ text: x.m, lang: 'zh' });
      });
    } else {
      (u.points || []).forEach(function (k, i) {
        items.push({ text: '要点' + (i + 1) + '，' + strip(k.t) + '。' + strip(k.d), lang: 'zh' });
      });
    }
    w.Speech.speak(items, { label: u.title });
  }

  /* ================= 成就 ================= */
  function achievements() {
    w.Speech.stop(); clearBar();
    setTitle('成就', false);
    var lv = A.level();
    V().innerHTML = '<div class="hero fadeup"><h1>我的成就</h1><p>通关解锁，星星与徽章记录每一步</p></div>' +
      '<div class="ach-ring">' + A.ringSVG(lv.cur / lv.need, 110, '#1D4ED8') +
      '<div class="ach-ring-cap">Lv.' + lv.lv + '<span>' + lv.cur + ' / ' + lv.need + ' XP</span></div></div>' +
      '<div class="stats fadeup" id="achStats">' +
      '<div class="stat"><b id="aPass">…</b><span>已通关</span></div>' +
      '<div class="stat"><b id="aStar">…</b><span>星星</span></div>' +
      '<div class="stat"><b id="aMax">…</b><span>满星数</span></div>' +
      '<div class="stat"><b>' + A.streak() + '</b><span>连续天数</span></div>' +
      '</div>' +
      '<div class="section"><div class="sec-head"><h2 class="sec-title">徽章</h2></div><div class="badges" id="badgeBox">' +
      '<div class="empty"><div class="e-i">⏳</div><h3>统计中…</h3></div></div></div>' +
      '<div class="section"><div class="sec-head"><h2 class="sec-title">各年级进度</h2></div><div id="gradeStatBox">' +
      '<div class="empty"><div class="e-i">⏳</div><h3>统计中…</h3></div></div></div>';
    w.scrollTo(0, 0);

    // 聚合所有就绪年级
    var totals = { pass: 0, star: 0, max: 0, units: 0, three: 0 };
    var gstats = [];
    var pending = 0;
    Object.keys(w.GRADES).forEach(function (gk) {
      var G = w.GRADES[gk];
      if (!G.ready) return;
      G.subjects.forEach(function (s) {
        pending++;
        A.loadSubject(gk, s.id, function (d) {
          pending--;
          if (!d) { if (pending === 0) finishAch(); return; }
          var st = A.subjectStat(gk, d);
          totals.pass += st.done; totals.star += st.stars; totals.units += st.total; totals.max += st.maxStars;
          var gInfo = gstats.filter(function (x) { return x.g === gk; })[0];
          if (!gInfo) { gInfo = { g: gk, name: G.name, pass: 0, star: 0, total: 0 }; gstats.push(gInfo); }
          gInfo.pass += st.done; gInfo.star += st.stars; gInfo.total += st.total;
          if (pending === 0) finishAch();
        });
      });
    });
    if (pending === 0) finishAch();

    function finishAch() {
      var aP = document.getElementById('aPass'), aS = document.getElementById('aStar'), aM = document.getElementById('aMax');
      if (aP) aP.textContent = totals.pass;
      if (aS) aS.textContent = totals.star;
      if (aM) aM.textContent = totals.star >= 3 ? Math.floor(totals.star / 3) : 0;
      renderBadges(totals, gstats);
      renderGradeStat(gstats);
    }
  }

  function renderBadges(t, gs) {
    var box = document.getElementById('badgeBox'); if (!box) return;
    var list = [];
    if (t.pass >= 1) list.push(['🎯', '初出茅庐', '完成第一次单元测试', true]);
    if (t.pass >= 10) list.push(['🔥', '小有成效', '累计通关 10 个单元', true]);
    if (t.three >= 1) list.push(['⭐', '满分达人', '至少获得 1 次满星', true]);
    if (t.star >= 100) list.push(['💯', '百星王者', '累计获得 100 颗星', true]);
    if (A.streak() >= 7) list.push(['📅', '持之以恒', '连续学习 7 天', true]);
    var allPass = gs.length && gs.every(function (x) { return x.pass >= x.total && x.total > 0; });
    if (allPass) list.push(['🏆', '全科通关', '某年级全部单元通关', true]);
    if (!list.length) list.push(['🌱', '新手上路', '完成测试即可解锁徽章', false]);
    box.innerHTML = list.map(function (b) {
      return '<div class="badge' + (b[3] ? ' on' : '') + '"><div class="b-ic">' + b[0] + '</div>' +
        '<div class="b-n">' + b[1] + '</div><div class="b-d">' + b[2] + '</div></div>';
    }).join('');
  }

  function renderGradeStat(gs) {
    var box = document.getElementById('gradeStatBox'); if (!box) return;
    box.innerHTML = gs.map(function (x) {
      var pct = x.total ? Math.round(x.pass / x.total * 100) : 0;
      return '<div class="gstat"><div class="gstat-h"><b>' + x.name + '</b><span>' + x.pass + '/' + x.total + ' · ★' + x.star + '</span></div>' +
        '<div class="gstat-bar"><i style="width:' + pct + '%"></i></div></div>';
    }).join('');
  }

  /* ================= 我的（资料 + 设置 + 进度） ================= */
  function mine() {
    w.Speech.stop(); clearBar();
    setTitle('我的', false);
    var S = A.S;
    var name = (S.name || '').trim();

    var html = '<div class="profile fadeup">' +
      '<div class="pf-avatar" id="pfAvatar">' + (name ? A.esc(name.charAt(0)) : '🎓') + '</div>' +
      '<div class="pf-main">' +
      '<input class="pf-name" id="mName" maxlength="12" placeholder="点击填写你的姓名" value="' + A.esc(name) + '">' +
      '<div class="pf-sub">学习等级 Lv.' + A.level().lv + ' · ' + A.S.xp + ' XP</div>' +
      '</div></div>';

    html += '<div class="card card-pad"><div class="set-label" style="margin-bottom:8px"><strong>当前年级</strong><span>用于首页与学科默认展示</span></div>' +
      '<div class="grade-sel">' + Object.keys(w.GRADES).map(function (k) {
        var G = w.GRADES[k];
        return '<button class="grade' + (k === S.grade ? ' active' : '') + '" data-g="' + k + '"><b>' + G.short + '</b></button>';
      }).join('') + '</div></div>';

    // 设置
    html += '<div class="section"><div class="sec-head"><h2 class="sec-title">设置</h2></div>' +
      setRow('mAuto', '自动播报', '开始测试时自动朗读一次题目', S.settings.autoSpeak) +
      setRow('mAutoNext', '翻页自动读题', '切换到下一题时也自动朗读', S.settings.autoSpeakNext) +
      setRow('mGate', '闯关模式', '关闭后所有单元直接解锁', S.settings.gate) +
      '<div class="set-row col"><div class="set-label"><strong>朗读语速</strong><span id="rateVal">' + (+S.settings.rate).toFixed(1) + ' 倍</span></div>' +
      '<input type="range" id="mRate" min="0.5" max="1.6" step="0.1" value="' + S.settings.rate + '"></div>' +
      '<div class="set-row col"><div class="set-label"><strong>中文语音</strong><span>系统可用的中文发音人</span></div>' +
      '<select id="mVoiceZh" class="sel"></select></div>' +
      '<div class="set-row col"><div class="set-label"><strong>英语语音</strong><span>系统可用的英文发音人</span></div>' +
      '<select id="mVoiceEn" class="sel"></select></div>' +
      '<div class="set-row"><div class="set-label"><strong>试听</strong><span>测试当前语音设置</span></div>' +
      '<button class="btn btn-ghost btn-sm" id="mTest">播放</button></div>' +
      '</div>';

    // 进度
    html += '<div class="section"><div class="sec-head"><h2 class="sec-title">学习进度</h2></div>' +
      '<div class="sheet-actions">' +
      '<button class="btn btn-ghost" id="mExport">导出进度</button>' +
      '<button class="btn btn-ghost" id="mImport">导入进度</button>' +
      '<button class="btn btn-danger-ghost" id="mReset">清空进度</button>' +
      '</div><input type="file" id="mFile" accept="application/json" hidden>' +
      '<div class="notice" style="margin-top:10px">进度保存在本机浏览器（localStorage）。换设备可用「导出进度」备份，或按 <code>docs/DEPLOY.md</code> 接入 D1 实现跨设备同步。</div>' +
      '</div>';

    V().innerHTML = html;
    bindMine();
  }

  function setRow(id, title, sub, on) {
    return '<div class="set-row"><div class="set-label"><strong>' + title + '</strong><span>' + sub + '</span></div>' +
      '<label class="switch"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span class="slider"></span></label></div>';
  }

  function bindMine() {
    var S = A.S;
    var av = document.getElementById('pfAvatar');
    var nm = document.getElementById('mName');
    nm.oninput = function () {
      S.name = nm.value; A.save();
      if (av) av.textContent = nm.value.trim() ? nm.value.trim().charAt(0) : '🎓';
    };

    Array.prototype.forEach.call(document.querySelectorAll('.grade-sel .grade'), function (b) {
      b.onclick = function () {
        S.grade = b.dataset.g; A.save();
        Array.prototype.forEach.call(document.querySelectorAll('.grade-sel .grade'), function (x) { x.classList.toggle('active', x === b); });
      };
    });

    function bindSwitch(id, key, after) {
      var el = document.getElementById(id);
      if (el) el.onchange = function () { S.settings[key] = this.checked; A.save(); if (after) after(this.checked); };
    }
    bindSwitch('mAuto', 'autoSpeak');
    bindSwitch('mAutoNext', 'autoSpeakNext');
    bindSwitch('mGate', 'gate', function (on) { A.toast(on ? '闯关模式已开启' : '已解锁全部单元'); });

    var rate = document.getElementById('mRate');
    if (rate) rate.oninput = function () {
      S.settings.rate = +this.value; A.save();
      document.getElementById('rateVal').textContent = (+this.value).toFixed(1) + ' 倍';
    };

    fillVoices('mVoiceZh', 'zh', S.settings.voiceZh);
    fillVoices('mVoiceEn', 'en', S.settings.voiceEn);
    var vz = document.getElementById('mVoiceZh');
    if (vz) vz.onchange = function () { S.settings.voiceZh = this.value; A.save(); };
    var ve = document.getElementById('mVoiceEn');
    if (ve) ve.onchange = function () { S.settings.voiceEn = this.value; A.save(); };

    var test = document.getElementById('mTest');
    if (test) test.onclick = function () {
      w.Speech.speak([
        { text: '你好，这里是学习工作台，语音测试正常。', lang: 'zh' },
        { text: 'Hello, this is your study workbench. Voice test is working.', lang: 'en' }
      ], { label: '语音试听' });
    };

    document.getElementById('mExport').onclick = function () {
      var blob = new Blob([JSON.stringify(A.S, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'studyhub-progress-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      A.toast('进度已导出');
    };
    document.getElementById('mImport').onclick = function () { document.getElementById('mFile').click(); };
    document.getElementById('mFile').onchange = function () {
      var f = this.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var o = JSON.parse(r.result);
          localStorage.setItem(A.KEY, JSON.stringify(o));
          A.toast('导入成功，正在刷新…');
          setTimeout(function () { location.reload(); }, 800);
        } catch (e) { A.toast('文件格式不正确'); }
      };
      r.readAsText(f);
      this.value = '';
    };
    document.getElementById('mReset').onclick = function () {
      if (!confirm('确定要清空全部学习进度吗？此操作不可恢复。\n建议先「导出进度」做备份。')) return;
      localStorage.removeItem(A.KEY);
      location.reload();
    };
  }

  function fillVoices(selId, lang, cur) {
    var sel = document.getElementById(selId); if (!sel) return;
    var list = w.Speech.listVoices(lang);
    sel.innerHTML = '<option value="">系统默认</option>' + list.map(function (v) {
      return '<option value="' + A.esc(v.name) + '"' + (v.name === cur ? ' selected' : '') + '>' + A.esc(v.name) + ' (' + v.lang + ')</option>';
    }).join('');
    if (!list.length) sel.innerHTML = '<option value="">未检测到可用语音</option>';
  }
  w.addEventListener('voicesready', function () {
    if (A.current().indexOf('/mine') === 0) { fillVoices('mVoiceZh', 'zh', A.S.settings.voiceZh); fillVoices('mVoiceEn', 'en', A.S.settings.voiceEn); }
  });

  w.Views = { home: home, subjects: subjects, subject: subject, unit: unit, achievements: achievements, mine: mine };
})(window);
