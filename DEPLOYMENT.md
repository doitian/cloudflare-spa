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

Wrangler creates a local KV namespace automatically for development.

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
