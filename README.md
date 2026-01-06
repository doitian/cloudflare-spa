# cloudflare-spa

Single Page Applications deployed to Cloudflare Pages

## Overview

This repository hosts a collection of Single Page Applications (SPAs), where each app is a self-contained HTML file with inline CSS and JavaScript.

## Available SPAs

- **WebRTC File Share** (`file-share.html`) - Share files directly between browsers using WebRTC
- **Search Results** (`search.html`) - Multi-search engine opener
- **Example App** (`example.html`) - Sample SPA demonstrating the structure

## Structure

- `public/` - Static HTML files
  - `index.html` - Root page that lists all available SPAs
  - `*.html` - Self-contained SPA files
- `functions/` - Cloudflare Pages Functions (serverless API endpoints)
- `wrangler.jsonc` - Cloudflare configuration

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions on deploying to Cloudflare Pages.

**Quick Setup:**
- Build command: `exit 0`
- Build output directory: `public`
- Configure KV namespace binding for `WEBRTC_SESSIONS`

## Adding a New SPA

1. Create a new HTML file in the `public/` directory (e.g., `public/my-app.html`)
2. Include all HTML, CSS, and JavaScript in a single file
3. Add your app to the list in `public/index.html`:

```javascript
const spas = [
    // ... existing apps
    {
        name: 'My App',
        description: 'Description of my app',
        url: 'my-app.html'
    }
];
```

4. Commit and push your changes

## Local Development

Simply open any HTML file in your browser to test locally. No build step required!

For testing Pages Functions locally:

```bash
npx wrangler pages dev public --kv WEBRTC_SESSIONS
```

## License

See [LICENSE](LICENSE) file for details.
