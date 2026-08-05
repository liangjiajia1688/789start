/*
 * expand.js v2 — 把额外题目（JSON）插入到数据文件各单元 quiz 数组末尾。
 * 兼容两种结构：
 *   - 扁平 units: window.registerSubject('g8', { units:[...] })
 *   - 上下册 volumes: window.registerSubject('g7', { volumes:[{units:[...]}, ...] })
 * 单元定位用 "id: '<uid>',"（g7/g9 中 u-前缀与 l-前缀不冲突，唯一）。
 * 兼容题项已有末尾逗号的情况（不会重复插入逗号/产生空洞）。
 *
 * 用法: node expand.js <dataFile> <extraJson>
 *   extraJson: { "u1": [ {q,type,options?,answer,explain}, ... ], ... }
 */
const fs = require('fs');

function jsStr(s) {
  return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}
function jsVal(v) {
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    return '[' + v.map(jsVal).join(', ') + ']';
  }
  if (v === null) return 'null';
  if (typeof v === 'string') return jsStr(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') {
    return '{ ' + Object.keys(v).map(k => k + ': ' + jsVal(v[k])).join(', ') + ' }';
  }
  return String(v);
}

const dataFile = process.argv[2];
const extraFile = process.argv[3];
if (!dataFile || !extraFile) { console.error('用法: node expand.js <dataFile> <extraJson>'); process.exit(1); }

let text = fs.readFileSync(dataFile, 'utf8');
const extra = JSON.parse(fs.readFileSync(extraFile, 'utf8'));

function findQuizClose(text, fromIdx) {
  const marker = 'quiz: [';
  const qpos = text.indexOf(marker, fromIdx);
  if (qpos < 0) return -1;
  const open = qpos + marker.length - 1; // '[' 位置
  let depth = 0, inStr = false, strCh = '', i = open;
  for (; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === strCh) inStr = false;
      continue;
    }
    if (ch === "'" || ch === '"') { inStr = true; strCh = ch; continue; }
    if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

let totalAdded = 0;
for (const unitId of Object.keys(extra)) {
  const items = extra[unitId];
  if (!Array.isArray(items) || items.length === 0) continue;
  const idMarker = "id: '" + unitId + "',";
  const pos = text.indexOf(idMarker);
  if (pos < 0) { console.error('  [跳过] 未找到单元 ' + unitId); continue; }
  const close = findQuizClose(text, pos);
  if (close < 0) { console.error('  [跳过] 单元 ' + unitId + ' 未找到 quiz 闭合'); continue; }

  const block = items.map((it, idx) =>
    '        ' + jsVal(it) + (idx < items.length - 1 ? ',' : '')
  ).join('\n');

  // 找到 quiz 闭合 ] 前最后一个有意义字符
  let j = close - 1;
  while (j >= 0 && /\s/.test(text[j])) j--;
  const c = text[j];

  if (c === '[') {
    // quiz 原本为空
    text = text.slice(0, close) + '\n' + block + '\n      ' + text.slice(close);
  } else if (c === ',') {
    // 题项已有末尾逗号 -> 直接在其后插入，不再加逗号（避免产生空洞）
    text = text.slice(0, j + 1) + ' ' + block + text.slice(j + 1);
  } else {
    // 正常情况（最后一条以 } 结尾）-> 加逗号后插入新题块
    text = text.slice(0, j + 1) + ',\n' + block + text.slice(j + 1);
  }
  totalAdded += items.length;
  console.log('  + ' + unitId + ': 插入 ' + items.length + ' 题');
}

fs.writeFileSync(dataFile, text, 'utf8');
console.log('完成。共插入 ' + totalAdded + ' 题 -> ' + dataFile);
