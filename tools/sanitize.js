/*
 * sanitize.js — 清除数据文件每个单元 quiz 数组中的"空洞"（末尾逗号 bug 产生的 undefined 槽位），
 * 并把数组内容重新序列化为干净格式（去除多余末尾逗号）。保留所有真实题目及其答案。
 * 用法: node sanitize.js <dataFile>
 */
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('用法: node sanitize.js <dataFile>'); process.exit(1); }

function jsStr(s) {
  return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}
function jsVal(v) {
  if (Array.isArray(v)) return '[' + v.map(jsVal).join(', ') + ']';
  if (v === null) return 'null';
  if (typeof v === 'string') return jsStr(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') return '{ ' + Object.keys(v).map(k => k + ': ' + jsVal(v[k])).join(', ') + ' }';
  return String(v);
}

let text = fs.readFileSync(file, 'utf8');

function findQuizClose(text, fromIdx) {
  const marker = 'quiz: [';
  const qpos = text.indexOf(marker, fromIdx);
  if (qpos < 0) return -1;
  const open = qpos + marker.length - 1;
  let depth = 0, inStr = false, strCh = '', i = open;
  for (; i < text.length; i++) {
    const ch = text[i];
    if (inStr) { if (ch === '\\') { i++; continue; } if (ch === strCh) inStr = false; continue; }
    if (ch === "'" || ch === '"') { inStr = true; strCh = ch; continue; }
    if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

// 收集所有单元 id（兼容 volumes 与扁平），用 idMarker 定位
const idMarkers = [];
let m;
const re = /id: '([a-z0-9_]+)',/g;
while ((m = re.exec(text)) !== null) idMarkers.push(m[1]);

let fixed = 0, holesRemoved = 0;
for (const uid of idMarkers) {
  const idMarker = "id: '" + uid + "',";
  const pos = text.indexOf(idMarker);
  if (pos < 0) continue;
  const close = findQuizClose(text, pos);
  if (close < 0) continue;
  // 找到 quiz: [ 的 [
  const open = text.indexOf('[', text.indexOf('quiz: [', pos));
  const inner = text.slice(open + 1, close);
  let arr;
  try { arr = new Function('return [' + inner + '];')(); }
  catch (e) { console.error('  [跳过] ' + uid + ' 解析失败: ' + e.message); continue; }
  const clean = arr.filter(it => it && it.type && it.q);
  const removed = arr.length - clean.length;
  if (removed > 0) {
    const newInner = clean.map(it => '        ' + jsVal(it)).join(',\n');
    text = text.slice(0, open + 1) + '\n' + newInner + '\n      ' + text.slice(close);
    fixed++; holesRemoved += removed;
    console.log('  * ' + uid + ': 移除 ' + removed + ' 个空洞，保留 ' + clean.length + ' 题');
  }
}
fs.writeFileSync(file, text, 'utf8');
console.log('完成。修复 ' + fixed + ' 个单元，共移除 ' + holesRemoved + ' 个空洞 -> ' + file);
