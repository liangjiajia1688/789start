# 学习工作台 · 初中闯关

一个面向初中生的**纯静态、零后端**学习 H5 应用：分科闯关、知识要点、课文朗读、单元测试，进度自动保存在浏览器本地。支持手机 / 平板 / 电脑浏览器，可一键部署到 GitHub Pages、Cloudflare Pages 等任意静态托管平台。

> 覆盖**七、八、九三个年级**，每个年级 8 大学科（语文 / 数学 / 英语 / 物理 / 生物 / 历史 / 地理 / 道德与法治），每单元 **20 道** 题库。

---

## ✨ 功能特性

- **分科闯关**：按年级 → 学科 → 单元逐级进入，每个单元独立通关进度，通关点亮星星、累积经验值（XP）。
- **知识要点**：每个单元的知识点卡片，带讲解与一键朗读。
- **课文 / 字词朗读**：基于浏览器 **Web Speech API** 的中英文语音合成，支持逐句高亮、暂停 / 继续 / 停止。
- **单元测试**：每次**随机抽取 10 题**作答，**答对 8 题（80%）即通关**；题型覆盖单选、多选、判断、填空。
- **本地进度**：通关记录、星星、连续打卡天数全部存在浏览器 `localStorage`，无需服务器、无需账号。
- **极简架构**：无任何构建步骤、无依赖、无框架，双击或起一个静态服务器即可运行。

---

## 🚀 快速开始

### 本地预览

由于网站用 JS 动态加载学科数据，直接双击 `index.html`（`file://`）在部分浏览器会被安全策略拦截，请用本地服务器预览：

```bash
# 进入项目目录后执行（任选其一）
python - m http.server 8080        # Python 自带
# 或
npx serve                          # Node 环境
```

然后浏览器打开 `http://localhost:8080` 即可。

### 部署到公网（GitHub Pages / Cloudflare Pages）

纯静态站点，**不需要数据库和后端**。详细步骤见 [`docs/DEPLOY.md`](docs/DEPLOY.md)，核心流程：

1. 把本项目全部文件（`index.html`、`assets/`、`data/`、`docs/`）推到 GitHub 仓库。
2. 在 Cloudflare Pages（或 GitHub Pages）连接该仓库，构建设置选 **None / 留空**，输出目录填 **`/`**（因为 `index.html` 在仓库根）。
3. 推送即自动重新部署，获得一个 `xxx.pages.dev` 的公网地址，分享给任何人即可访问。

---

## 📁 目录结构

```
study-hub/
├─ index.html                # 入口页面（含朗读控制条、底部导航等常驻 DOM）
├─ README.md                 # 本文件
├─ assets/
│  ├─ css/app.css            # 全部样式
│  └─ js/
│     ├─ core.js             # 路由、数据存储、注册 API、抽题/通关逻辑
│     ├─ speech.js           # 语音朗读引擎（Web Speech API）
│     ├─ quiz.js             # 单元测试答题流程
│     ├─ views.js            # 单元 / 要点 / 课文 / 词表 页面渲染
│     └─ app.js              # 启动、设置、成就页等
├─ data/
│  ├─ manifest.js            # 年级与学科索引（登记入口）
│  ├─ g7/  g8/  g9/          # 各年级学科数据（每学科一个 .js 文件）
│  └─ ...
├─ docs/
│  └─ DEPLOY.md              # 部署教程（GitHub + Cloudflare Pages）
└─ tools/                    # 内部题库维护脚本（非网站运行所需）
   ├─ show.js  expand.js  count2.js  sanitize.js
   └─ extra/                 # 题库扩充用临时 JSON
```

> `tools/` 仅用于**扩充 / 校验题库**，网站运行时不需要它，部署时可不打包上传。

---

## 🗂️ 数据格式

学科数据通过 `window.registerSubject(grade, obj)` 或 `window.registerVolume(...)` 注册，挂在 `data/<grade>/<subject>.js` 中。一个单元包含四类内容：

| 字段 | 说明 |
|---|---|
| `points` | 知识要点数组，每个含 `t`（标题）、`d`（讲解） |
| `texts`  | 课文 / 朗读素材，含 `title`、`author`、`paras` 等 |
| `words`  | 字词 / 单词表，含 `w`（词）、`m`（释义）、可选 `eg`（例句） |
| `quiz`   | 测验题库，**每单元 20 题**，题型见下 |

`quiz` 题型（`type`）：

- `single` 单选 — `answer` 为选项索引（0 起）
- `multi` 多选 — `answer` 为索引数组
- `judge` 判断 — `answer` 为 `true` / `false`
- `fill` 填空 — `answer` 为字符串

```js
// data/g8/chinese.js 示意
window.registerSubject('g8', {
  id: 'chinese', name: '语文',
  units: [
    {
      id: 'u1', title: '单元一', summary: '……',
      points: [{ t: '知识点标题', d: '讲解内容' }],
      texts:  [{ title: '课文名', author: '作者', paras: ['段落一', '段落二'] }],
      words:  [{ w: '字词', m: '释义' }],
      quiz: [
        { q: '题目？', type: 'single', options: ['A','B','C','D'], answer: 0, explain: '解析…' },
        { q: '判断对错？', type: 'judge', answer: true, explain: '解析…' }
        // …… 每单元共 20 题
      ]
    }
  ]
});
```

---

## ⚙️ 配置通关规则

通关线与每次抽题数在 `assets/js/core.js` 顶部常量中调整：

```js
var PASS = 0.8;       // 通关线：答对比例 ≥ 80%（抽 10 题即答对 8 题）
var QPERQUIZ = 10;    // 每次测试随机抽取的题数
```

---

## ➕ 如何新增内容

- **加一道题 / 一个要点**：直接编辑对应 `data/<grade>/<subject>.js`，按上述格式追加到单元数组即可，无需改动其它代码。
- **加一个新学科**：在 `data/manifest.js` 对应年级的 `subjects` 中登记，并在 `data/<grade>/<id>.js` 中写数据。
- **加一个新单元**：在学科 `units` 数组中追加一个单元对象（`id`、`title`、`points`、`texts`、`words`、`quiz`）。

详细说明见 [`docs/DEPLOY.md`](docs/DEPLOY.md)。

---

## 📱 语音朗读说明

- 使用浏览器原生 **Web Speech API**，需 Chrome / Edge / Safari 等支持语音合成的浏览器。
- 首次无声音可在右上角 **⚙️ 设置 → 试听** 检查，并可切换中 / 英文发音人。
- 部分移动端需先在系统设置中开启对应语音包。

---

## 📄 许可

本项目供学习与教学使用，欢迎自由 fork、修改、部署。
