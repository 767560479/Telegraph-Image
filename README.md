# Telegraph-Image

Free image hosting on **Cloudflare Pages**. Files are uploaded and stored via the **Telegram Bot API** (the original Telegraph API is discontinued).

English | [中文](README-zh.md) | [Project structure](PROJECT.md)

## What it does

- Public upload page: drag-and-drop, batch upload, copy direct link / Markdown / HTML
- Optional admin: blocklist, search, batch actions (requires KV)
- Runs on Cloudflare with no server to maintain within free tiers

## Before you deploy

1. A [Cloudflare](https://dash.cloudflare.com/) account  
2. Telegram **Bot Token** and channel **Chat ID** (**required** for uploads)

### Get Telegram credentials

1. Message [@BotFather](https://t.me/BotFather) with `/newbot`, create a bot, save the **Bot Token**  
2. Create a Telegram **channel**, add the bot as an **administrator**  
3. Get the channel **Chat ID** (often negative, e.g. `-1001234567890`) via [@GetTheirIDBot](https://t.me/GetTheirIDBot) or similar

## Deploy on Cloudflare Pages

1. **Fork** this repository  
2. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**  
3. Select your fork and set build options:

| Setting | Value |
|---------|--------|
| **Build command** | `npm run build` |
| **Build output directory** | `/` |

> **Why a build step?**  
> This project uses Pages Functions (upload, file serving, admin API) with npm dependencies (e.g. Sentry plugin). The build runs `npm ci` to install them. Without it, Functions bundling fails.  
> Static HTML is not compiled; the build only installs Function dependencies.

4. **Settings → Environment variables** (Production):

| Variable | Required | Description |
|----------|:--------:|-------------|
| `TG_Bot_Token` | Yes | Bot token |
| `TG_Chat_ID` | Yes | Channel ID; bot must be admin |

5. Save and **Deploy**. Redeploy after changing environment variables.

### Custom domain (optional)

Pages → **Custom domains** → add a domain already on Cloudflare.

## Optional features

### Image admin (requires KV)

1. Cloudflare Dashboard → **Workers & Pages** → **KV** → create a namespace  
2. Pages project → **Settings** → **Functions** → **KV namespace bindings**  
3. Add binding: variable name **`img_url`** → your KV namespace  
4. Open `https://your-domain/admin` (or `/admin-imgtc.html` grid, `/admin-waterfall.html` waterfall)

> **Important:** Do not add a `wrangler.toml` with `pages_build_output_dir` to this repo. That switches binding management to the file and disables KV editing in the Dashboard. Bind **`img_url`** in the Dashboard only.

### Admin login (optional)

| Variable | Description |
|----------|-------------|
| `BASIC_USER` | Admin username |
| `BASIC_PASS` | Admin password |

If unset, `/api/manage/*` has no Basic auth (you can use [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/) for `/admin` and `/api/manage/*`).

When set, admin pages use the custom [`login.html`](login.html) sign-in page instead of the browser’s native Basic Auth dialog; API access via `curl -u user:pass` still works.

### Content moderation (optional)

Set `ModerateContentApiKey` from [moderatecontent.com](https://moderatecontent.com/).

### Whitelist-only mode (optional)

Set `WhiteList_Mode` = `true`. Only whitelisted images are served; requires KV admin.

### Disable telemetry (optional)

Set `disable_telemetry` to any non-empty value to disable Sentry.

## Local development

```bash
npm install
npm start
```

Open `http://localhost:8080`. Local KV is persisted under `./data` (see `wrangler pages dev` in `package.json`).

## Updating a deployed site

1. Confirm env vars and KV binding in Cloudflare  
2. Push changes to the connected Git repository  
3. Pages rebuilds automatically, or **Retry deployment** in the Dashboard

## Limits (summary)

| Item | Notes |
|------|--------|
| File size | Telegram Bot uploads are typically **≤ 20MB** on this site (see Telegram docs for upstream limits) |
| Functions | ~100k requests/day on free tier |
| KV | ~1000 writes/day; first visit may write metadata; admin uses KV quotas |
| Storage | Files live on Telegram; deleting an admin record does not delete the Telegram file; use blocklist to block access |

## Pages

| Path | Purpose |
|------|---------|
| `/` | Public upload |
| `/admin.html` | Admin (table) |
| `/admin-imgtc.html` | Admin (grid, recommended) |
| `/admin-waterfall.html` | Waterfall gallery |

## License

See [LICENSE](./LICENSE).
