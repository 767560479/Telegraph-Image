# Telegraph-Image

免费图床，基于 **Cloudflare Pages** 部署，文件经 **Telegram Bot API** 上传并存储（原 Telegraph 接口已下线）。

English | 中文 | [项目结构](PROJECT.md)

## 能做什么

- 首页拖拽/批量上传，复制直链、Markdown、HTML
- 可选后台：黑白名单、搜索、批量操作（需绑定 KV）
- 托管在 Cloudflare，免费额度内零服务器成本

## 部署前准备

1. [Cloudflare](https://dash.cloudflare.com/) 账号  
2. Telegram Bot Token 与频道 Chat ID（**上传必需**）

### 获取 Telegram 凭证

1. 向 [@BotFather](https://t.me/BotFather) 发送 `/newbot`，创建机器人，记下 **Bot Token**  
2. 新建 Telegram **频道**，把机器人设为**管理员**  
3. 用 [@GetTheirIDBot](https://t.me/GetTheirIDBot) 等工具获取频道 **Chat ID**（通常为负数，如 `-1001234567890`）

## 部署到 Cloudflare Pages

1. **Fork** 本仓库  
2. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**  
3. 选择 fork 后的仓库，配置构建设置：

| 配置项 | 值 |
|--------|-----|
| **Build command** | `npm run build` |
| **Build output directory** | `/` |

> **为什么需要 build？**  
> 项目含 Pages Functions（上传、读图、管理 API），依赖 npm 包（如 Sentry 插件）。构建时会执行 `npm ci` 安装依赖，否则 Functions 打包失败。  
> 静态 HTML 本身无需编译；build 仅用于安装 Functions 依赖。

4. **Settings → Environment variables**（Production）添加：

| 变量 | 必需 | 说明 |
|------|:----:|------|
| `TG_Bot_Token` | 是 | Bot Token |
| `TG_Chat_ID` | 是 | 频道 ID，Bot 须为管理员 |

5. 保存并 **Deploy**。修改环境变量后需 **重新部署** 才生效。

### 绑定自定义域名（可选）

Pages → **Custom domains** → 添加已在 Cloudflare 托管的域名。

## 可选功能

### 图片管理后台（需 KV）

1. Cloudflare Dashboard → **Workers & Pages** → **KV** → 创建命名空间  
2. Pages 项目 → **Settings** → **Functions** → **KV namespace bindings**  
3. 添加绑定：变量名 **`img_url`** → 选择刚创建的 KV  
4. 访问 `https://你的域名/admin`（或 `/admin-imgtc.html` 网格视图、`/admin-waterfall.html` 瀑布流）

> **注意**：请勿在仓库中添加带 `pages_build_output_dir` 的 `wrangler.toml`，否则 KV 绑定会改为由文件管理，Dashboard 里无法编辑。本项目 KV **在 Dashboard 绑定**即可。

### 后台登录（可选）

| 变量 | 说明 |
|------|------|
| `BASIC_USER` | 后台用户名 |
| `BASIC_PASS` | 后台密码 |

未设置则 `/api/manage/*` 无 Basic 鉴权（可配合 [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/) 保护 `/admin` 与 `/api/manage/*`）。

已设置时，访问后台会进入 [`login.html`](login.html) 自定义登录页（不再弹出浏览器原生 Basic Auth 对话框）；`curl -u 用户名:密码` 等方式仍可调用 API。

### 内容审查（可选）

环境变量 `ModerateContentApiKey`：在 [moderatecontent.com](https://moderatecontent.com/) 申请 API Key。

### 白名单模式（可选）

环境变量 `WhiteList_Mode` = `true`：仅白名单内图片可访问，需先开启 KV 管理。

### 关闭遥测（可选）

环境变量 `disable_telemetry` = 任意非空值，关闭 Sentry 上报。

## 本地开发

```bash
npm install
npm start
```

浏览器打开 `http://localhost:8080`。本地 KV 数据在 `./data`（见 `package.json` 中 `wrangler pages dev` 参数）。

## 更新已部署的项目

1. 确认 Cloudflare 中环境变量、KV 绑定仍正确  
2. 将代码 push 到所连接的 Git 仓库  
3. Pages 自动构建；或在 Dashboard 中 **Retry deployment**

## 限制（简要）

| 项 | 说明 |
|----|------|
| 单文件大小 | Telegram Bot 上传通常 **≤ 20MB**（本站前端默认限制；Telegram 上限见官方文档） |
| Functions 请求 | 免费约 10 万次/天 |
| KV | 写入约 1000 次/天（每张新图首次访问可能写入 metadata）；开启管理后台会占用 KV 额度 |
| 存储 | 文件在 Telegram，删除后台记录不等于删除 Telegram 原文件；可用黑名单屏蔽访问 |

## 页面入口

| 路径 | 用途 |
|------|------|
| `/` | 公开上传 |
| `/admin.html` | 管理后台（表格） |
| `/admin-imgtc.html` | 网格管理（推荐） |
| `/admin-waterfall.html` | 瀑布流浏览 |

## 许可

见 [LICENSE](./LICENSE)。
