/* ============================================================
   manifest.js — 年级与学科索引
   - ready: 该年级数据是否已就绪
   - files: 该学科对应的数据文件（默认与 id 同名；下册用 _down 追加）
   - 新增学科：在此登记，并在 data/<grade>/<id>.js（及 _down.js）中写数据
   ============================================================ */
window.GRADES = {
  g7: {
    name: '七年级', short: '七年级', ready: true, subjects: [
      { id: 'chinese',   name: '语文',       icon: '文', color: '#C0392B' },
      { id: 'math',      name: '数学',       icon: '数', color: '#1D4ED8' },
      { id: 'english',   name: '英语',       icon: 'En', color: '#0F7A4D', lang: 'en' },
      { id: 'physics',   name: '物理',       icon: '物', color: '#7C3AED' },
      { id: 'biology',   name: '生物',       icon: '生', color: '#0891B2' },
      { id: 'history',   name: '历史',       icon: '史', color: '#B45309' },
      { id: 'geography', name: '地理',       icon: '地', color: '#16A34A' },
      { id: 'politics',  name: '道德与法治', icon: '道', color: '#DB2777' }
    ]
  },
  g8: {
    name: '八年级', short: '八年级', ready: true,
    subjects: [
      { id: 'chinese',   name: '语文',       icon: '文', color: '#C0392B', files: ['chinese', 'chinese_down'] },
      { id: 'math',      name: '数学',       icon: '数', color: '#1D4ED8', files: ['math', 'math_down'] },
      { id: 'english',   name: '英语',       icon: 'En', color: '#0F7A4D', lang: 'en', files: ['english', 'english_down'] },
      { id: 'physics',   name: '物理',       icon: '物', color: '#7C3AED', files: ['physics', 'physics_down'] },
      { id: 'biology',   name: '生物',       icon: '生', color: '#0891B2', files: ['biology', 'biology_down'] },
      { id: 'history',   name: '历史',       icon: '史', color: '#B45309', files: ['history', 'history_down'] },
      { id: 'geography', name: '地理',       icon: '地', color: '#16A34A', files: ['geography', 'geography_down'] },
      { id: 'politics',  name: '道德与法治', icon: '道', color: '#DB2777', files: ['politics', 'politics_down'] }
    ]
  },
  g9: {
    name: '九年级', short: '九年级', ready: true, subjects: [
      { id: 'chinese',   name: '语文',       icon: '文', color: '#C0392B' },
      { id: 'math',      name: '数学',       icon: '数', color: '#1D4ED8' },
      { id: 'english',   name: '英语',       icon: 'En', color: '#0F7A4D', lang: 'en' },
      { id: 'physics',   name: '物理',       icon: '物', color: '#7C3AED' },
      { id: 'biology',   name: '生物',       icon: '生', color: '#0891B2' },
      { id: 'history',   name: '历史',       icon: '史', color: '#B45309' },
      { id: 'geography', name: '地理',       icon: '地', color: '#16A34A' },
      { id: 'politics',  name: '道德与法治', icon: '道', color: '#DB2777' }
    ]
  }
};
