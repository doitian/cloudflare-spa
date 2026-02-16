# Deployment Guide

This project is deployed as a **Cloudflare Worker** with static assets and Durable Objects.

## Prerequisites

- Cloudflare account
- Wrangler CLI: `npm install -g wrangler`

## Deploy

```bash
# Login to Cloudflare
npx wrangler login

# Deploy the worker
npx wrangler deploy
```

**Note:** The first deployment will create the SessionManager Durable Object class. Subsequent deployments can use gradual rollouts if needed.

## Local Development

```bash
npx wrangler dev
```

Wrangler creates a local Durable Object environment automatically for development.

## Durable Objects

The WebRTC File Share feature uses **Durable Objects** for real-time WebSocket-based session management. The `SessionManager` Durable Object is automatically created during deployment.

No additional setup is required - Durable Objects are configured in `wrangler.jsonc`.

## Troubleshooting

**API returns 404:**
- Verify `index.js` exists and `wrangler.jsonc` has `"main": "index.js"`
- Check deployment logs

**WebSocket connection errors:**
- Ensure the SessionManager Durable Object is properly deployed
- Check browser console for detailed error messages
- Verify the session code is correct

**Migration errors (error 10211):**
- This occurs when trying to use gradual deployments with Durable Object migrations
- Always use `npx wrangler deploy` (not version uploads) for the first deployment
- Once deployed, migrations should be removed from `wrangler.jsonc`

## Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Durable Objects Documentation](https://developers.cloudflare.com/durable-objects/)
- [Durable Objects Migrations](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/)
