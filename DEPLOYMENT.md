# Deployment Guide

This project is deployed as a **Cloudflare Worker** with static assets.

## Prerequisites

- Cloudflare account
- Wrangler CLI: `npm install -g wrangler`
- KV namespace for WebRTC sessions

## Deploy

```bash
# Login to Cloudflare
npx wrangler login

# Deploy the worker
npx wrangler deploy
```

## KV Namespace Setup

The WebRTC File Share feature requires a KV namespace binding.

### Create KV Namespace

```bash
# Create a new KV namespace
npx wrangler kv:namespace create WEBRTC_SESSIONS

# Copy the namespace ID and update wrangler.jsonc
```

### Or Use Dashboard

1. Go to **Workers & Pages** → **KV**
2. Create namespace or use existing: `18a5d8b090144ae595321176dca58178`
3. Update the `id` in `wrangler.jsonc` if using a different namespace

## Local Development

```bash
npx wrangler dev
```

**Note**: For local development, Wrangler will create a local KV namespace automatically.

## Project Structure

```
cloudflare-spa/
├── public/                 # Static HTML files
│   ├── index.html          # Homepage listing all SPAs
│   ├── file-share.html     # WebRTC File Sharing SPA
│   └── search.html         # Search results SPA
├── index.js                # Main worker handling all API endpoints
└── wrangler.jsonc          # Cloudflare configuration
```

## How the WebRTC File Sharing Works

1. **No Build Required**: All HTML files are self-contained
2. **Worker API**: The `index.js` worker handles all `/api/file-share-session` requests:
   - Storing WebRTC offers/answers in KV
   - Retrieving session data by code
   - Automatic expiration after 24 hours
3. **Direct Deployment**: Static files served from `/public`, API routed through worker

## Testing the Deployment

After deployment:

1. Visit your Pages URL (e.g., `https://your-project.pages.dev`)
2. Click on **WebRTC File Share**
3. Create a session - you'll get a 6-digit code
4. Open another browser/device and join using the code
5. Transfer files peer-to-peer!

## Troubleshooting

**API returns 404:**
- Verify `index.js` exists and `wrangler.jsonc` has `"main": "index.js"`
- Ensure KV binding is configured correctly
- Check deployment logs

**KV errors:**
- Confirm binding name is exactly `WEBRTC_SESSIONS`
- Verify KV namespace ID in `wrangler.jsonc` matches your namespace

## Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [KV Documentation](https://developers.cloudflare.com/kv/)
