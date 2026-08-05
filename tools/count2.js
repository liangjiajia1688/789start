/* count2.js — 统计（兼容 volumes 上下册结构）每个单元的题数，并检测"空洞/末尾逗号"污染。
 * 用法: node count2.js <dataFile> */
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('用法: node count2.js <dataFile> [目标题数/单元]'); process.exit(1); }
const TARGET = parseInt(process.argv[3], 10) || 20;
global.window = {
  registerSubject: (g, s) => { global.__cur = s; },
  registerVolume: (g, id, v) => { global.__cur = v; }
};
const code = fs.readFileSync(file, 'utf8');
new Function('window', code)(global.window);
const subj = global.__cur;

function collectUnits(node, path) {
  // node 可能是 subject 或 volume
  let out = [];
  const direct = node.units || [];
  direct.forEach(u => out.push({ u, path }));
  const vols = node.volumes || [];
  vols.forEach((v, vi) => {
    const vname = (v.name || v.code || ('vol' + vi));
    out = out.concat(collectUnits(v, (path ? path + '/' : '') + vname));
  });
  return out;
}

const all = collectUnits(subj, '');
let total = 0, holes = 0, totalTarget = 0;
all.forEach(({ u, path }) => {
  const quiz = u.quiz || [];
  let n = 0, h = 0;
  quiz.forEach(q => { if (q && q.type) { n++; } else { h++; holes++; } });
  total += n; totalTarget += TARGET;
  const flag = h ? ('  ⚠ 空洞 ' + h) : (n === TARGET ? '' : '  需加 ' + (TARGET - n));
  console.log((path ? path + '/' : '') + u.id + '  当前 ' + String(n).padStart(2) + ' 题' + flag);
});
console.log('--- 单元数 ' + all.length + '，有效题 ' + total + '，空洞 ' + holes + '，目标 ' + totalTarget + '，缺口 ' + (totalTarget - total));
