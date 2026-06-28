# Telegraph-Image 项目结构说明

> 本文档用于快速熟悉项目，避免每次从零扫描代码库。  
> 用户文档见 [README-zh.md](./README-zh.md)。

## 项目定位

免费图床 / 媒体托管（Flickr、imgur 替代方案）。

- **部署平台**：Cloudflare Pages
- **文件存储**：Telegram Channel（Bot API 上传）
- **元数据 / 管理**：Cloudflare KV（可选）
- **对外 URL**：`/file/{fileId}.{ext}`

> 原 Telegraph API 已下线，上传必须配置 `TG_Bot_Token` 与 `TG_Chat_ID`。

---

## 目录结构

```
Telegraph-Image/
├── functions/                    # Cloudflare Pages Functions（服务端）
│   ├── upload.js                 # POST /upload — 上传入口
│   ├── file/
│   │   ├── [id].js               # GET /file/:id — 代理访问 + 审查/黑白名单
│   │   └── _middleware.js        # Sentry 遥测
│   ├── api/
│   │   ├── _middleware.js        # API 层 Sentry 遥测
│   │   ├── manage/               # 后台管理 API（需 KV + 可选 Basic Auth）
│   │   │   ├── list.js           # KV 分页列表
│   │   │   ├── login.js          # 302 → admin.html
│   │   │   ├── logout.js
│   │   │   ├── check.js          # 是否启用 Basic Auth
│   │   │   ├── block/[id].js     # 加入黑名单
│   │   │   ├── white/[id].js     # 加入白名单
│   │   │   ├── delete/[id].js    # 删除 KV 记录（不删 Telegram 原文件）
│   │   │   ├── editName/[id].js  # 修改显示文件名
│   │   │   ├── toggleLike/[id].js
│   │   │   └── _middleware.js    # Basic Auth + KV 绑定检查
│   │   └── bing/wallpaper/       # 必应壁纸 API（附加功能）
│   └── utils/middleware.js       # Sentry 遥测封装
├── admin.html                    # 默认后台（Element UI 表格）
├── admin-imgtc.html              # 网格视图（批量操作、上传）
├── admin-waterfall.html          # 瀑布流视图
├── admin-imgtc.css
├── index.html                    # 公开上传页（原生 JS，拖拽/批量/复制直链·Markdown·HTML）
├── index-md.html                 # 重定向至首页（旧 Markdown 页已合并）
├── block-img.html                # 黑名单拦截提示
├── whitelist-on.html             # 白名单模式拦截提示
├── test/pagination.test.js       # KV list 分页测试
├── package.json                  # 本地 dev / CI 依赖
├── .github/workflows/
│   └── ci-test.yml               # PR 跑 mocha
├── README.md / README-zh.md
└── LICENSE
```

---

## 核心数据流

```
上传:  客户端 → POST /upload → Telegram Bot API → 返回 /file/{id}.{ext}
                                              ↘ 可选写入 KV metadata

访问:  浏览器 → GET /file/:id → getFile(Telegram) → 代理文件流
                                              ↘ KV 黑白名单 / 内容审查

管理:  admin*.html → /api/manage/* → KV 读写
```

### 上传（`functions/upload.js`）

1. 解析 `formData` 中的 `file`
2. 按 MIME 调用 `sendPhoto` / `sendAudio` / `sendVideo` / `sendDocument`
3. 图片失败时降级为 `sendDocument` 重试（最多 2 次）
4. 提取 `file_id`，返回 `[{ src: "/file/..." }]`
5. 若绑定 KV `img_url`，写入 metadata（`TimeStamp`、`ListType`、`Label`、`fileName` 等）

### 访问（`functions/file/[id].js`）

1. 路径长度 > 39 → Telegram 文件：`getFile` 后代理 `api.telegram.org/file/bot...`
2. 较短路径 → 兼容旧 Telegraph（`telegra.ph`）
3. KV 可用时的访问控制顺序：
   - `ListType === "White"` → 放行
   - `ListType === "Block"` 或 `Label === "adult"` → 302 拦截页
   - `WhiteList_Mode === "true"` → 非白名单拦截
   - 可选 ModerateContent 审查
   - 首次访问 lazy 初始化 metadata
4. Referer 含 `/admin` 时跳审查（方便后台预览）

### 后台管理

- **前提**：Pages 绑定 KV，变量名 `img_url`
- **鉴权**：可选 `BASIC_USER` / `BASIC_PASS`（HTTP Basic）；未设置则 `/api/manage/*` 无鉴权
- **三个 UI**：`admin.html`（表格）、`admin-imgtc.html`（网格）、`admin-waterfall.html`（瀑布流）

---

## 环境变量

| 变量 | 必需 | 说明 |
|------|:----:|------|
| `TG_Bot_Token` | 是 | Telegram Bot Token |
| `TG_Chat_ID` | 是 | 频道/群组 ID，Bot 需为管理员 |
| `img_url`（KV 绑定） | 否 | 开启图片管理与黑白名单 |
| `BASIC_USER` / `BASIC_PASS` | 否 | 后台 Basic Auth |
| `ModerateContentApiKey` | 否 | ModerateContent 内容审查 |
| `WhiteList_Mode` | 否 | `"true"` 时仅白名单可访问 |
| `disable_telemetry` | 否 | 关闭 Sentry 遥测 |
| `sampleRate` | 否 | Sentry 采样率 |

修改环境变量后需重新部署才生效。

---

## API 路由

| 路由 | 方法 | 文件 | 说明 |
|------|------|------|------|
| `/upload` | POST | `functions/upload.js` | 上传 |
| `/file/:id` | GET | `functions/file/[id].js` | 代理访问 |
| `/api/manage/list` | GET | `functions/api/manage/list.js` | KV 列表（`limit`/`cursor`/`prefix`） |
| `/api/manage/block/:id` | * | `functions/api/manage/block/[id].js` | 黑名单 |
| `/api/manage/white/:id` | * | `functions/api/manage/white/[id].js` | 白名单 |
| `/api/manage/delete/:id` | * | `functions/api/manage/delete/[id].js` | 删 KV 记录 |
| `/api/manage/editName/:id` | * | `functions/api/manage/editName/[id].js` | 改显示名 |
| `/api/manage/toggleLike/:id` | * | `functions/api/manage/toggleLike/[id].js` | 切换 liked |
| `/api/manage/check` | * | `functions/api/manage/check.js` | 是否启用 Basic Auth |
| `/api/manage/login` | * | `functions/api/manage/login.js` | 跳转 admin |
| `/api/bing/wallpaper` | GET | `functions/api/bing/wallpaper/index.js` | 必应壁纸 |

---

## KV metadata 字段

| 字段 | 含义 |
|------|------|
| `TimeStamp` | 首次记录时间戳 |
| `ListType` | `None` / `White` / `Block` |
| `Label` | 审查结果，如 `adult`、`None` |
| `fileName` | 原始文件名 |
| `fileSize` | 文件大小 |
| `liked` | 后台标记 |

KV key 格式：`{fileId}.{ext}`（与 URL 中 `:id` 一致）。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 运行时 | Cloudflare Pages Functions |
| 文件存储 | Telegram Bot API |
| 元数据 | Cloudflare KV |
| 前端 | 首页原生 JS；后台 Vue 2 + Element UI（CDN） |
| 监控 | Sentry（`functions/utils/middleware.js`） |
| 本地开发 | Wrangler + KV persist |
| 测试 | Mocha（`test/pagination.test.js`） |

---

## 本地开发

```bash
npm install
npm start   # wrangler pages dev，:8080，模拟 img_url KV
npm test    # mocha
```

`package.json` 中 `start` 默认绑定 `BASIC_USER=admin`、`BASIC_PASS=123`。

---

## 已知限制

- 单文件受 Telegram Bot API 限制（通常 ≤ 50MB）
- Cloudflare Functions 免费约 10 万次请求/天；KV 读写/列出/删除各有免费额度
- 无法删除 Telegram 上的原文件；黑名单仅阻止代理加载
- 开启内容审查时首次访问较慢
- `file/[id].js` 仍保留 Telegraph 短路径与 `telegra.ph` 审查 URL 的兼容逻辑

---

## 维护注意

- `.gitignore` 未忽略整个 `node_modules`，勿提交依赖目录
- 首页上传 UI 见 `index.html`（无 `_nuxt` 依赖）

---

## 改代码时快速定位

| 需求 | 先看 |
|------|------|
| 首页上传 UI | `index.html` |
| 上传逻辑 / 重试 | `functions/upload.js` |
| 访问拦截 / 审查 | `functions/file/[id].js` |
| 后台鉴权 | `functions/api/manage/_middleware.js` |
| 分页列表 | `functions/api/manage/list.js` + `test/pagination.test.js` |
| 网格后台 UI | `admin-imgtc.html` |
| 遥测开关 | `functions/utils/middleware.js` + 环境变量 `disable_telemetry` |
