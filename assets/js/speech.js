/* ============================================================
   speech.js — 语音朗读引擎（Web Speech API）
   支持：中英文自动识别、分句队列、逐句高亮、暂停/继续/停止
   ============================================================ */
(function (w) {
  'use strict';

  var synth = w.speechSynthesis;
  var supported = !!synth && typeof w.SpeechSynthesisUtterance === 'function';
  var voices = [];
  var queue = [];      // {text, lang, el}
  var idx = -1;
  var playing = false;
  var curUtt = null;
  var onDoneCb = null;
  var lastHl = null;

  var bar = null, barText = null, barToggle = null;

  function initBar() {
    bar = document.getElementById('speakbar');
    barText = document.getElementById('sbText');
    barToggle = document.getElementById('sbToggle');
    if (!bar) return;
    barToggle.onclick = function () {
      if (!synth) return;
      if (synth.paused) { synth.resume(); barToggle.textContent = '暂停'; }
      else { synth.pause(); barToggle.textContent = '继续'; }
    };
    document.getElementById('sbStop').onclick = function () { stop(); };
  }

  function loadVoices() {
    if (!supported) return;
    voices = synth.getVoices() || [];
  }
  if (supported) {
    loadVoices();
    if (typeof synth.onvoiceschanged !== 'undefined') {
      synth.onvoiceschanged = function () { loadVoices(); w.dispatchEvent(new Event('voicesready')); };
    }
  }

  function listVoices(prefix) {
    return voices.filter(function (v) { return (v.lang || '').toLowerCase().indexOf(prefix) === 0; });
  }

  /** 判断文本主语言 */
  function detectLang(t) {
    var cjk = (t.match(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g) || []).length;
    var lat = (t.match(/[A-Za-z]/g) || []).length;
    if (cjk === 0 && lat > 0) return 'en';
    if (cjk > 0 && lat / Math.max(cjk, 1) > 3) return 'en';
    return 'zh';
  }

  function pickVoice(lang) {
    var st = w.App.S.settings;
    var want = lang === 'en' ? st.voiceEn : st.voiceZh;
    var v = null, i;
    if (want) { for (i = 0; i < voices.length; i++) if (voices[i].name === want) { v = voices[i]; break; } }
    if (!v) {
      var pref = lang === 'en' ? ['en-us', 'en-gb', 'en'] : ['zh-cn', 'zh-hans', 'zh'];
      for (var p = 0; p < pref.length && !v; p++) {
        for (i = 0; i < voices.length; i++) {
          if ((voices[i].lang || '').toLowerCase().replace('_', '-').indexOf(pref[p]) === 0) { v = voices[i]; break; }
        }
      }
    }
    return v;
  }

  /** 长文本按句切分，避免部分浏览器长句截断 */
  function splitSentences(text, lang) {
    var t = String(text).replace(/\s+/g, ' ').trim();
    if (!t) return [];
    var parts;
    if (lang === 'en') parts = t.match(/[^.!?]+[.!?]*\s*/g) || [t];
    else parts = t.match(/[^。！？；\n]+[。！？；]*/g) || [t];
    var out = [], buf = '';
    var LIMIT = lang === 'en' ? 220 : 90;
    parts.forEach(function (p) {
      if ((buf + p).length > LIMIT && buf) { out.push(buf); buf = p; }
      else buf += p;
    });
    if (buf.trim()) out.push(buf);
    return out;
  }

  function showBar(txt) {
    if (!bar) return;
    bar.classList.add('on');
    barToggle.textContent = '暂停';
    barText.textContent = txt || '正在朗读…';
  }
  function hideBar() { bar && bar.classList.remove('on'); }

  function highlight(el) {
    if (lastHl && lastHl.classList) lastHl.classList.remove('reading');
    lastHl = el || null;
    if (el && el.classList) el.classList.add('reading');
  }

  function stop() {
    queue = []; idx = -1; playing = false; curUtt = null;
    try { synth && synth.cancel(); } catch (e) { }
    highlight(null);
    hideBar();
    var cb = onDoneCb; onDoneCb = null;
    if (cb) cb(true);
  }

  function next() {
    idx++;
    if (idx >= queue.length) {
      playing = false; highlight(null); hideBar();
      var cb = onDoneCb; onDoneCb = null;
      if (cb) cb(false);
      return;
    }
    var item = queue[idx];
    highlight(item.el);
    var u = new SpeechSynthesisUtterance(item.text);
    var lang = item.lang || detectLang(item.text);
    var v = pickVoice(lang);
    if (v) { u.voice = v; u.lang = v.lang; }
    else u.lang = lang === 'en' ? 'en-US' : 'zh-CN';
    u.rate = Math.max(0.5, Math.min(2, w.App.S.settings.rate || 1));
    u.pitch = 1;
    u.onend = function () { if (playing) next(); };
    u.onerror = function () { if (playing) next(); };
    curUtt = u;
    try { synth.speak(u); } catch (e) { next(); }
  }

  /**
   * 朗读
   * @param {string|Array} input 文本，或 [{text, el, lang}]
   * @param {object} opt {label, lang, onDone}
   */
  function speak(input, opt) {
    opt = opt || {};
    if (!supported) { w.App.toast('当前浏览器不支持语音朗读'); return; }
    stop();
    var items = [];
    if (typeof input === 'string') {
      var lg = opt.lang || detectLang(input);
      splitSentences(input, lg).forEach(function (s) { items.push({ text: s, lang: lg, el: null }); });
    } else {
      (input || []).forEach(function (o) {
        var t = typeof o === 'string' ? o : o.text;
        if (!t) return;
        var lg = (typeof o === 'object' && o.lang) || opt.lang || detectLang(t);
        splitSentences(t, lg).forEach(function (s) {
          items.push({ text: s, lang: lg, el: (typeof o === 'object' ? o.el : null) });
        });
      });
    }
    if (!items.length) return;
    queue = items; idx = -1; playing = true;
    onDoneCb = opt.onDone || null;
    showBar(opt.label || '正在朗读…');
    // Chrome 偶发静音：先 cancel 再 speak
    setTimeout(next, 60);
  }

  function isPlaying() { return playing; }

  w.Speech = {
    supported: supported,
    speak: speak, stop: stop, isPlaying: isPlaying,
    listVoices: listVoices, loadVoices: loadVoices,
    detectLang: detectLang, initBar: initBar,
    get voices() { return voices; }
  };
})(window);
