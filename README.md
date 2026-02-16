# cloudflare-spa

Single Page Applications deployed to Cloudflare Workers

## Overview

A collection of self-contained SPAs (HTML + CSS + JavaScript in single files) served via Cloudflare Workers with static assets.

## Available SPAs

- **WebRTC File Share** (`file-share.html`) - Share files directly between browsers using WebRTC with real-time push notifications
- **Search Results** (`search.html`) - Multi-search engine opener

## Features

### WebRTC File Share

The file sharing app includes:
- **Real-time Push Notifications**: WebSocket-based signaling using Cloudflare Durable Objects (no polling!)
- **Peer-to-Peer Transfer**: Files transferred directly between browsers, nothing stored on servers
- **Session Management**: Secure 6-digit session codes for pairing
- **Chat Support**: Send text messages alongside file transfers
- **Progress Tracking**: Real-time progress bars for file transfers

See [docs/PUSH_NOTIFICATIONS.md](docs/PUSH_NOTIFICATIONS.md) for detailed architecture documentation.

## Structure

```
├── docs/                  # Documentation
├── public/                # Static HTML files
├── index.js              # Worker with API endpoints
├── session-manager.js    # Durable Object for session management
└── wrangler.jsonc        # Worker configuration
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment instructions.

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
