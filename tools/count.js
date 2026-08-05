/* count.js — 统计某数据文件每个单元的题数
 * 用法: node count.js <dataFile> */
const fs = require('fs');
const path = require('path');
const file = process.argv[2];
if (!file) { console.error('用法: node count.js <dataFile>'); process.exit(1); }
global.window = {
  registerSubject: (g, s) => { global.__cur = s; },
  registerVolume: (g, id, v) => { global.__cur = v; }
};
const code = fs.readFileSync(file, 'utf8');
// 去掉可能的 BOM
new Function('window', code)(global.window);
const subj = global.__cur;
let total = 0;
const units = subj.units || [];
units.forEach(u => {
  const n = (u.quiz || []).length;
  total += n;
  const need = Math.max(0, 20 - n);
  console.log(u.id.padEnd(6) + ' 当前 ' + String(n).padStart(2) + ' 题  ' + (need ? '需加 ' + need : '已满'));
});
console.log('--- 单元数 ' + units.length + '，总题数 ' + total + '，目标 ' + (units.length * 20) + '，缺口 ' + (units.length * 20 - total));
