/* show.js — 紧凑输出某文件每个单元: 标题 / 知识点 / 已有题面，便于出题且不重复
 * 用法: node show.js <dataFile> */
const fs=require('fs');
const file=process.argv[2];
global.window={registerSubject:(g,s)=>{global.__cur=s;},registerVolume:(g,id,v)=>{global.__cur=v;}};
new Function('window',fs.readFileSync(file,'utf8'))(global.window);
const subj=global.__cur;
function unitsOf(n,path){let out=[];(n.units||[]).forEach(u=>out.push({u,path}));(n.volumes||[]).forEach((v,vi)=>{out=out.concat(unitsOf(v,(path?path+'/':'')+(v.name||v.code||'vol'+vi)));});return out;}
unitsOf(subj,'').forEach(({u,path})=>{
  console.log('\n### '+(path?path+'/':'')+u.id+'  '+ (u.title||''));
  if(u.summary) console.log('摘要: '+u.summary);
  if(u.points&&u.points.length) console.log('知识点: '+u.points.map(p=>p.t).join(' | '));
  if(u.quiz&&u.quiz.length){ console.log('已有题面:'); u.quiz.forEach((q,i)=>console.log('  '+(i+1)+'. ['+q.type+'] '+ (q.q||'').slice(0,60))); }
});
