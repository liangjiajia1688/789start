# 部署教程：GitHub + Cloudflare Pages（纯静态 H5）

本教程面向**非开发者**，一步一步把学习工作台发布到公网，任何人用手机/电脑浏览器打开链接即可使用。

---

## 一、先回答：需要 D1 数据库吗？

**结论：不需要。**

本工作台是纯静态网站，学生的学习进度（通关星星、得分、连续打卡天数）全部存在**浏览器本地的 `localStorage`** 里。只要打开同一个浏览器、同一个网址，进度就在；不需要任何服务器、数据库，也不需要后端。

**什么时候才需要 D1 / 后端？** 只有当你想做下面这些事：
- 换手机/换电脑后进度还能同步（跨设备云同步）
- 老师想看全班/全校的学习数据、排行榜
- 需要后台统计哪些知识点错得最多

如果你只是自己或班级用、不需要跨设备同步，**直接按下面的“纯静态部署”即可，完全不用碰 D1**。文末附了一个可选的 D1 进阶方案，需要时可再扩展。

---

## 二、把代码上传到 GitHub

### 方式 A：网页拖拽（最简单，推荐）

1. 打开 https://github.com ，注册并登录。
2. 点右上角 **“+” → New repository（新建仓库）**。
3. 仓库名建议填 `study-hub`；**勾选 Public（公开）**（Cloudflare 连私有仓库也行，但公开最省事）；**不要**勾 “Add a README”。
4. 创建后，进入仓库，点 **“Add file → Upload files”**，把本项目 `study-hub/` 目录里的**所有文件和文件夹**（`index.html`、`assets/`、`data/`、`docs/`）直接拖进去。
5. 拉到最下面，点 **“Commit changes”** 提交。

> 注意：只上传网站文件即可，**不要**上传 `_check.js`、`node_modules` 之类无关文件。本项目是纯静态，上传后仓库根目录应能看到 `index.html`。

### 方式 B：用 Git 命令行（如果你会用）

```bash
cd study-hub
git init
git add .
git commit -m "初中学习工作台 v1"
git branch -M main
git remote add origin https://github.com/你的用户名/study-hub.git
git push -u origin main
```

---

## 三、Cloudflare Pages 拉取 GitHub 自动部署

1. 打开 https://pages.cloudflare.com ，用邮箱注册/登录 Cloudflare。
2. 进入 **Workers & Pages → Create → Pages → Connect to Git（连接 Git）**。
3. 授权并选择刚才的 **`study-hub`** 仓库。
4. **构建设置**（关键）：
   - Framework preset（框架预设）：选 **None（无）**
   - Build command（构建命令）：**留空**
   - Build output directory（构建输出目录）：填 **`/`**（表示用仓库根目录作为网站根，因为 `index.html` 就在根）
5. 点 **Save and Deploy（保存并部署）**。
6. 等待一两分钟，Cloudflare 会给你一个形如 `study-hub-xxxx.pages.dev` 的网址，**这就是你的 H5 网站地址**，分享给任何人即可访问。
7. **以后怎么更新？** 只要往 GitHub 推送（push）新代码，Cloudflare 会自动重新部署，无需手动操作。

### （可选）绑定自己的域名
在 Pages 项目里点 **Custom domains → Set up a custom domain**，填入你已有的域名（如 `study.xxx.com`），按提示在域名解析里加一条 CNAME 到 `*.pages.dev` 即可。

---

## 四、本地预览（不上传也能先看效果）

因为网站用 JS 动态加载各学科数据，直接双击 `index.html`（`file://`）在部分浏览器会被安全策略拦截。**请用本地服务器预览**：

```bash
# 进入项目目录后执行（任选其一）
python -m http.server 8080          # Python 自带
# 或
npx serve                           # Node 环境
```

然后浏览器打开 `http://localhost:8080`。

---

## 五、语音朗读不响怎么办？

- 本功能用浏览器自带的 **Web Speech API**，需要浏览器支持语音合成。请用 **Chrome / Edge / Safari** 手机或电脑版；部分国产浏览器内核可能不支持。
- 首次点击喇叭若没声音，可打开右上角 **⚙️ 设置 → 试听** 检查，并在设置里切换中/英文发音人。
- 苹果手机需先在「设置 → 辅助功能 → 语音内容」中开启相关语音包，朗读才出声。

---

## 六、（进阶，可选）用 D1 实现进度云同步

> 仅当你需要“换设备进度不丢”时才做。基础版部署**不需要**这一步。

思路：用 Cloudflare **Pages Functions**（在仓库里建 `functions/api/progress.js`）+ **D1 数据库**，前端把 `localStorage` 里的进度上传/下载。

1. 在 Cloudflare 控制台创建 D1 数据库，执行建表：
```sql
CREATE TABLE progress (
  uid TEXT PRIMARY KEY,
  data TEXT,
  updated INTEGER
);
```
2. 在 Pages 项目设置里把 D1 绑定到变量名 `DB`。
3. `functions/api/progress.js` 示例（获取/保存）：
```js
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const uid = url.searchParams.get('uid');
  if (request.method === 'GET') {
    const row = await env.DB.prepare('SELECT data FROM progress WHERE uid=?').bind(uid).first();
    return new Response(row ? row.data : '{}');
  }
  const body = await request.text();
  await env.DB.prepare('REPLACE INTO progress(uid,data,updated) VALUES(?,?,?)')
    .bind(uid, body, Date.now()).run();
  return new Response('ok');
}
```
4. 前端（`assets/js/core.js` 的 `save()` 里）加一段 `fetch('/api/progress?uid=...', {method:'POST', body: JSON.stringify(S)})` 即可同步。

> 这一步涉及函数与绑定配置，非必需。先把纯静态版跑起来最重要。

---

## 七、目录结构速览

```
study-hub/
├─ index.html              # 入口页面
├─ assets/
│  ├─ css/app.css          # 样式
│  └─ js/                  # 核心逻辑（路由/语音/测试/渲染）
│     ├─ core.js  speech.js  quiz.js  views.js  app.js
├─ data/
│  ├─ manifest.js          # 年级与学科索引
│  └─ g8/                  # 八年级各科数据（语文/数学/英语/物理/生物/历史/地理/道法）
│     ├─ chinese.js  math.js  english.js  physics.js
│     ├─ biology.js  history.js  geography.js  politics.js
└─ docs/DEPLOY.md          # 本教程
```

**想加新课文 / 新题目**：直接编辑 `data/g8/` 下对应学科 `.js` 文件，按现有格式加 `points`（要点）、`texts`（课文）、`words`（字词/单词）、`quiz`（每单元10题）即可，无需改动其他代码。
