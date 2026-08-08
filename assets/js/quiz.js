/* ============================================================
   quiz.js — 单元测试引擎
   题型：single 单选 / multi 多选 / judge 判断 / fill 填空
   规则：正确率 ≥ 80% 通关（每次从题库随机抽取 10 题）
   ============================================================ */
(function (w) {
  'use strict';

  var A = w.App;
  var Q = {
    grade: null, subject: null, unit: null,
    list: [], i: 0, answers: [], locked: [],
    started: false, finished: false
  };

  var KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

  /* ---------- 入口 ---------- */
  function start(grade, subject, unit) {
    closeModal();
    Q.grade = grade; Q.subject = subject; Q.unit = unit;
    var pool = (unit.quiz || []).slice();
    var take = Math.min(A.QPERQUIZ || 10, pool.length);
    Q.list = A.shuffle(pool).slice(0, take);
    Q.i = 0;
    Q.answers = new Array(Q.list.length).fill(null);
    Q.locked = new Array(Q.list.length).fill(false);
    Q.started = false;
    Q.finished = false;
    renderIntro();
  }

  function isEn() { return Q.subject && Q.subject.lang === 'en'; }

  /* 判断是否为“纯数字答案”（允许前置 ± / - / + 及小数），用于数学题收紧判分 */
  function isNum(s) {
    return /^±?[-+]?(\d+(\.\d*)?|\.\d+)$/.test(s);
  }

  /* ---------- 开始页 ---------- */
  function renderIntro() {
    var st = A.S.settings;
    var n = Q.list.length;
    var poolN = (Q.unit.quiz || []).length;
    var need = Math.ceil(n * A.PASS);
    var p = A.getUnit(Q.grade, Q.subject.id, Q.unit.id);
    var v = document.getElementById('view');
    document.body.classList.remove('has-fixedbar');
    v.innerHTML =
      '<div class="result fadeup">' +
      '<div class="res-badge">📝</div>' +
      '<div class="res-title">' + A.esc(Q.unit.title) + '</div>' +
      '<div class="res-sub">' + A.esc(Q.subject.name) + ' · 单元测试</div>' +
      '<div class="res-grid">' +
      '<div><b>' + n + '</b><span>题目数</span></div>' +
      '<div><b>' + need + '</b><span>通关需答对</span></div>' +
      '<div><b>' + Math.round(A.PASS * 100) + '%</b><span>通关线</span></div>' +
      '</div>' +
      (poolN > n ? '<div class="res-sub" style="margin-top:2px">题库共 ' + poolN + ' 题，本次随机抽取 ' + n + ' 题作答</div>' : '') +
      (p.attempts ? '<div class="res-sub">历史最好：' + Math.round(p.best * 100) + '%　' +
        '<span class="stars">' + A.starHTML(p.stars) + '</span>　已测 ' + p.attempts + ' 次</div>' : '') +
      '<div class="set-row" style="text-align:left;border-top:1px solid var(--line);margin-top:8px">' +
      '<div class="set-label"><strong>🔊 自动播报</strong><span>开始后自动朗读一次题目</span></div>' +
      '<label class="switch"><input type="checkbox" id="qAuto"' + (st.autoSpeak ? ' checked' : '') + '><span class="slider"></span></label>' +
      '</div>' +
      '<button class="btn btn-primary btn-block" id="qStart" style="margin-top:14px">开始测试</button>' +
      '<button class="btn btn-ghost btn-block" id="qBack" style="margin-top:8px">返回单元</button>' +
      '</div>' +
      '<div class="notice">提示：答错不会终止测试，交卷后可查看全部解析与错题。' +
      (w.Speech.supported ? '' : '⚠️ 当前浏览器不支持语音朗读，建议使用 Chrome / Edge / Safari。') + '</div>';

    document.getElementById('qAuto').onchange = function () {
      A.S.settings.autoSpeak = this.checked; A.save();
      var g = document.getElementById('setAuto'); if (g) g.checked = this.checked;
    };
    document.getElementById('qStart').onclick = function () {
      Q.started = true;
      renderQ(true);   // true = 触发自动播报
    };
    document.getElementById('qBack').onclick = function () {
      A.go('/unit/' + Q.grade + '/' + Q.subject.id + '/' + Q.unit.id);
    };
  }

  /* ---------- 题目页 ---------- */
  function renderQ(autoTrigger) {
    var q = Q.list[Q.i], n = Q.list.length;
    var v = document.getElementById('view');
    var locked = Q.locked[Q.i];
    var ans = Q.answers[Q.i];
    var en = isEn() || q.lang === 'en';

    var typeLabel = { single: '单项选择', multi: '多项选择', judge: '判断题', fill: '填空题' }[q.type || 'single'];

    var html = '<div class="quiz-head">' +
      '<div class="qh-top">' +
      '<div class="qh-idx">' + (Q.i + 1) + ' <em>/ ' + n + '</em></div>' +
      '<div class="qh-right">' +
      '<label class="autoswitch">🔊 自动播报' +
      '<span class="switch sm"><input type="checkbox" id="qAuto2"' + (A.S.settings.autoSpeak ? ' checked' : '') + '><span class="slider"></span></span>' +
      '</label></div></div>' +
      '<div class="qh-bar"><i style="width:' + ((Q.i) / n * 100) + '%"></i></div>' +
      '<div class="dots">' + Q.list.map(function (_, k) {
        var c = 'dot';
        if (k === Q.i) c += ' cur';
        else if (Q.locked[k]) c += judge(k) ? ' ok' : ' no';
        return '<span class="' + c + '"></span>';
      }).join('') + '</div></div>';

    html += '<div class="qcard fadeup">';
    html += '<span class="q-type">' + typeLabel + '</span>';
    if (q.passage) html += '<div class="q-passage">' + A.rich(q.passage) + '</div>';
    html += '<div class="q-stem' + (en ? ' en' : '') + '">' + A.rich(q.q) + '</div>';
    html += '<div class="q-play">' +
      '<button class="btn btn-ghost btn-sm" id="qSpeak">🔊 朗读题目</button>' +
      (q.type === 'fill' || q.type === 'judge' ? '' : '<button class="btn btn-ghost btn-sm" id="qSpeakAll">🔊 题目+选项</button>') +
      '</div>';

    if (q.type === 'fill') {
      var val = ans == null ? '' : ans;
      html += '<div class="fillbox"><input type="text" id="qFill" placeholder="' + (en ? 'Type your answer' : '输入答案') + '" value="' + A.esc(val) + '"' + (locked ? ' disabled' : '') + ' autocomplete="off"></div>';
    } else {
      var opts = q.type === 'judge' ? (q.options || ['正确', '错误']) : q.options;
      html += '<div class="opts">';
      opts.forEach(function (o, k) {
        var c = 'opt';
        if (locked) {
          var isRight = isCorrectOpt(q, k);
          var picked = q.type === 'multi' ? (ans || []).indexOf(k) >= 0 : ans === k;
          if (isRight) c += ' right';
          else if (picked) c += ' wrong';
          else c += ' dim';
        } else {
          var sel = q.type === 'multi' ? (ans || []).indexOf(k) >= 0 : ans === k;
          if (sel) c += ' sel';
        }
        html += '<button class="' + c + '" data-k="' + k + '">' +
          '<span class="opt-k">' + KEYS[k] + '</span><span class="opt-v">' + A.rich(o) + '</span></button>';
      });
      html += '</div>';
    }

    if (locked) {
      var ok = judge(Q.i);
      html += '<div class="feedback ' + (ok ? 'ok' : 'no') + '">' +
        '<div class="fb-h">' + (ok ? '✅ 回答正确' : '❌ 回答错误') + '</div>' +
        (ok ? '' : '<div class="fb-ans">正确答案：' + A.esc(answerText(q)) + '</div>') +
        (q.explain ? '<div style="margin-top:5px">' + A.rich(q.explain) + '</div>' : '') +
        '</div>';
    }
    html += '</div>';

    html += '<div class="fabspace"></div>';

    // 重设 innerHTML 前先把朗读条移回 body，避免被一并清空丢失
    var sbKeep = document.getElementById('speakbar');
    if (sbKeep && sbKeep.parentNode === v) document.body.appendChild(sbKeep);

    v.innerHTML = html;

    // 将语音播报条移到题目卡片下方（答案区域之后）
    var sb = document.getElementById('speakbar');
    if (sb) v.appendChild(sb);

    // 底部固定操作条
    document.body.classList.add('has-fixedbar');
    var old = document.getElementById('quizbar'); if (old) old.remove();
    var barEl = document.createElement('div');
    barEl.className = 'fixedbar'; barEl.id = 'quizbar';
    barEl.innerHTML = '<div class="fixedbar-inner">' +
      (Q.i > 0 ? '<button class="btn btn-ghost" id="qPrev" style="flex:0 0 84px">上一题</button>' : '') +
      (locked
        ? '<button class="btn btn-primary" id="qNext">' + (Q.i === n - 1 ? '查看结果' : '下一题') + '</button>'
        : '<button class="btn btn-accent" id="qSubmit">确认答案</button>') +
      '</div>';
    document.body.appendChild(barEl);

    bindQ(q, autoTrigger);
  }

  function bindQ(q, autoTrigger) {
    var auto2 = document.getElementById('qAuto2');
    if (auto2) auto2.onchange = function () {
      A.S.settings.autoSpeak = this.checked; A.save();
      var g = document.getElementById('setAuto'); if (g) g.checked = this.checked;
      A.toast(this.checked ? '自动播报已开启' : '自动播报已关闭');
    };

    document.getElementById('qSpeak').onclick = function () { speakStem(q); };
    var sa = document.getElementById('qSpeakAll');
    if (sa) sa.onclick = function () { speakAll(q); };

    // 选项点击
    Array.prototype.forEach.call(document.querySelectorAll('.opt'), function (btn) {
      btn.onclick = function () {
        if (Q.locked[Q.i]) return;
        var k = +btn.dataset.k;
        if (q.type === 'multi') {
          var arr = Q.answers[Q.i] || [];
          var p = arr.indexOf(k);
          if (p >= 0) arr.splice(p, 1); else arr.push(k);
          Q.answers[Q.i] = arr;
          renderQ(false);
        } else {
          Q.answers[Q.i] = k;
          renderQ(false);
          // 单选/判断：选择即自动确认
          setTimeout(function () { doSubmit(); }, 120);
        }
      };
    });

    var fill = document.getElementById('qFill');
    if (fill) {
      fill.oninput = function () { Q.answers[Q.i] = this.value; };
      fill.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); doSubmit(); } };
    }

    var sb = document.getElementById('qSubmit');
    if (sb) sb.onclick = doSubmit;
    var nb = document.getElementById('qNext');
    if (nb) nb.onclick = function () {
      w.Speech.stop();
      if (Q.i === Q.list.length - 1) finish();
      else { Q.i++; renderQ(A.S.settings.autoSpeakNext); }
    };
    var pb = document.getElementById('qPrev');
    if (pb) pb.onclick = function () { w.Speech.stop(); Q.i--; renderQ(false); };

    // 自动播报
    if (autoTrigger && A.S.settings.autoSpeak) {
      setTimeout(function () { speakAll(q); }, 260);
    }
  }

  function stemText(q) {
    var t = '';
    if (q.passage) t += q.passage + '。';
    t += String(q.q).replace(/\*\*/g, '').replace(/_{2,}/g, '空格');
    return t;
  }
  function speakStem(q) {
    w.Speech.speak(stemText(q), { label: '第 ' + (Q.i + 1) + ' 题', lang: q.lang || (isEn() ? 'en' : null) });
  }
  function speakAll(q) {
    var items = [{ text: stemText(q), lang: q.lang || (isEn() ? 'en' : null) }];
    if (q.type !== 'fill' && q.options) {
      var opts = q.options;
      opts.forEach(function (o, k) {
        items.push({ text: KEYS[k] + '. ' + String(o).replace(/\*\*/g, ''), lang: q.lang || (isEn() ? 'en' : null) });
      });
    }
    w.Speech.speak(items, { label: '第 ' + (Q.i + 1) + ' 题', lang: q.lang || (isEn() ? 'en' : null) });
  }

  function doSubmit() {
    var q = Q.list[Q.i];
    var a = Q.answers[Q.i];
    if (a == null || (q.type === 'multi' && (!a || !a.length)) || (q.type === 'fill' && !String(a).trim())) {
      A.toast('请先作答'); return;
    }
    Q.locked[Q.i] = true;
    w.Speech.stop();
    renderQ(false);
    // 最后一题：稍作停留展示对错后自动进入结算
    if (Q.i === Q.list.length - 1) {
      setTimeout(function () { finish(); }, 900);
    }
  }

  /* ---------- 判分 ---------- */
  function isCorrectOpt(q, k) {
    if (q.type === 'multi') return (q.answer || []).indexOf(k) >= 0;
    if (q.type === 'judge') return (q.answer === true ? 0 : 1) === k;
    return q.answer === k;
  }

  function judge(i) {
    var q = Q.list[i], a = Q.answers[i];
    if (a == null) return false;
    if (q.type === 'fill') {
      // 关键词匹配：答案不唯一。用户作答只要命中正确关键词/字即判对。
      // 三个方向都算对：
      //   1) 作答 == 关键词（完全相等）
      //   2) 作答 包含 关键词（学生多写了上下文，如“北京市”含“北京”）
      //   3) 关键词 包含 作答（学生只写了核心词，如“北京”是“北京市”的子串）
      // 特例：数学题的“纯数字答案”只允许完全相等，避免“10”被误判为“0”。
      var accepts = Array.isArray(q.answer) ? q.answer : [q.answer];
      var na = A.norm(a);
      if (!na) return false;
      var mathStrict = Q.subject && Q.subject.id === 'math';
      return accepts.some(function (x) {
        var nx = A.norm(x);
        if (!nx) return false;
        if (mathStrict && isNum(na) && isNum(nx)) return na === nx; // 数字答案仅相等
        return na === nx || na.indexOf(nx) >= 0 || nx.indexOf(na) >= 0;
      });
    }
    if (q.type === 'multi') {
      var s1 = (a || []).slice().sort().join(','), s2 = (q.answer || []).slice().sort().join(',');
      return s1 === s2 && s1 !== '';
    }
    if (q.type === 'judge') return (q.answer === true ? 0 : 1) === a;
    return a === q.answer;
  }

  function answerText(q) {
    if (q.type === 'fill') return (Array.isArray(q.answer) ? q.answer[0] : q.answer);
    if (q.type === 'multi') return (q.answer || []).map(function (k) { return KEYS[k]; }).join('、');
    if (q.type === 'judge') return q.answer ? '正确' : '错误';
    return KEYS[q.answer] + '. ' + String(q.options[q.answer]).replace(/\*\*/g, '');
  }
  function userText(q, a) {
    if (a == null) return '未作答';
    if (q.type === 'fill') return String(a);
    if (q.type === 'multi') return (a || []).map(function (k) { return KEYS[k]; }).join('、') || '未作答';
    return KEYS[a] + '. ' + String(q.options[a]).replace(/\*\*/g, '');
  }

  /* ---------- 结果弹窗 ---------- */
  function ensureModal() {
    var m = document.getElementById('resultModal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'resultModal'; m.className = 'modal-mask';
      m.innerHTML = '<div class="modal-card"></div>';
      document.body.appendChild(m);
    }
    return m;
  }
  function closeModal() {
    var m = document.getElementById('resultModal');
    if (m) {
      m.classList.remove('on');
      setTimeout(function () { if (m && !m.classList.contains('on')) m.style.display = 'none'; }, 220);
    }
    document.body.classList.remove('has-fixedbar');
    var bar = document.getElementById('quizbar'); if (bar) bar.remove();
  }

  function finish() {
    if (Q.finished) return;
    Q.finished = true;
    w.Speech.stop();
    var n = Q.list.length, correct = 0, wrong = [];
    Q.list.forEach(function (q, i) {
      if (judge(i)) correct++; else wrong.push(i);
    });
    var r = A.submit(Q.grade, Q.subject.id, Q.unit.id, correct, n);
    var pct = r.pct;

    // 清理题目页底部操作条（弹窗浮于其上）
    document.body.classList.remove('has-fixedbar');
    var bar = document.getElementById('quizbar'); if (bar) bar.remove();

    // 把 speakbar 移回 body（避免 innerHTML 清空时丢失）
    var sb = document.getElementById('speakbar');
    if (sb && sb.parentNode !== document.body) document.body.appendChild(sb);

    var passed = r.passed;
    var html = '<div class="result pop">' +
      '<div class="res-badge">' + (passed ? (r.stars === 3 ? '🏆' : '🎉') : '💪') + '</div>' +
      A.ringSVG(pct, 104, passed ? '#0f7a4d' : '#c0322b') +
      '<div class="res-stars">' + A.starHTML(r.stars) + '</div>' +
      '<div class="res-title">' + (passed ? '通关成功！' : '还差一点') + '</div>' +
      '<div class="res-sub">' + (passed
        ? '答对 ' + correct + '/' + n + '，获得 ' + r.xp + ' XP' + (r.firstPass ? '，下一关已解锁 🔓' : '')
        : '答对 ' + correct + '/' + n + '，需答对 ' + Math.ceil(n * A.PASS) + ' 题才能通关') + '</div>' +
      '<div class="res-grid">' +
      '<div><b>' + correct + '</b><span>答对</span></div>' +
      '<div><b>' + (n - correct) + '</b><span>答错</span></div>' +
      '<div><b>+' + r.xp + '</b><span>经验值</span></div>' +
      '</div>' +
      '<div class="btnrow">' +
      '<button class="btn btn-ghost" id="rBack">返回单元</button>' +
      '<button class="btn btn-primary" id="rRetry">' + (passed ? '再测一次' : '重新挑战') + '</button>' +
      '</div></div>';

    if (wrong.length) {
      html += '<div class="section"><div class="sec-head"><h2 class="sec-title">错题回顾 · ' + wrong.length + ' 题</h2>' +
        '<button class="sec-more" id="rSpeakWrong" style="color:var(--accent)">🔊 朗读错题</button></div>';
      wrong.forEach(function (i) {
        var q = Q.list[i];
        html += '<div class="wrongitem">' +
          '<div class="wi-q">' + A.rich(q.q) + '</div>' +
          '<div class="wi-a">你的答案：<em>' + A.esc(userText(q, Q.answers[i])) + '</em><br>' +
          '正确答案：<b>' + A.esc(answerText(q)) + '</b>' +
          (q.explain ? '<br><span style="color:var(--ink-3)">' + A.rich(q.explain) + '</span>' : '') + '</div></div>';
      });
      html += '</div>';
    } else {
      html += '<div class="notice" style="background:var(--ok-soft);border-color:#cfe7dc;color:#0b5c3a">🌟 全部答对，满分通关！继续保持。</div>';
    }

    var mask = ensureModal();
    mask.querySelector('.modal-card').innerHTML = html;
    mask.style.display = '';
    requestAnimationFrame(function () { mask.classList.add('on'); });

    var goUnit = function () { A.go('/unit/' + Q.grade + '/' + Q.subject.id + '/' + Q.unit.id); };
    mask.onclick = function (e) { if (e.target === mask) { closeModal(); goUnit(); } };
    document.getElementById('rBack').onclick = function () { closeModal(); goUnit(); };
    document.getElementById('rRetry').onclick = function () { closeModal(); start(Q.grade, Q.subject, Q.unit); };
    var sw = document.getElementById('rSpeakWrong');
    if (sw) sw.onclick = function () {
      var items = [];
      wrong.forEach(function (i) {
        var q = Q.list[i];
        items.push({ text: stemText(q), lang: q.lang || (isEn() ? 'en' : null) });
        items.push({ text: '正确答案：' + answerText(q) + '。' + (q.explain || ''), lang: isEn() ? 'en' : null });
      });
      w.Speech.speak(items, { label: '错题讲解' });
    };
  }

  w.Quiz = { start: start };
})(window);
