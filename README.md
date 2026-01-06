# cloudflare-spa

Single Page Applications deployed to Cloudflare Workers

## Overview

A collection of self-contained SPAs (HTML + CSS + JavaScript in single files) served via Cloudflare Workers with static assets.

## Available SPAs

- **WebRTC File Share** (`file-share.html`) - Share files directly between browsers using WebRTC
- **Search Results** (`search.html`) - Multi-search engine opener

## Structure

```
├── public/          # Static HTML files
├── index.js         # Worker with API endpoints
└── wrangler.jsonc   # Worker configuration
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment instructions.

## Local Development

Test SPAs locally by opening HTML files in your browser.

For the Worker with API endpoints:

```bash
npx wrangler dev
```

## Adding a New SPA

1. Create `public/my-app.html` with inline CSS/JavaScript
2. Add entry to the app list in `public/index.html`
3. Deploy with `npx wrangler deploy`

## License

See [LICENSE](LICENSE) file for details.
