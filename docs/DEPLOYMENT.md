# Deployment Guide

This project is deployed as a **Cloudflare Worker** with static assets and Durable Objects.

## Prerequisites

- Cloudflare account
- Wrangler CLI: `npm install -g wrangler`

## Initial Deployment

For the **first deployment** to Cloudflare:

```bash
# Login to Cloudflare
npx wrangler login

# Deploy the worker (creates SessionManager Durable Object)
npx wrangler deploy
```

**Important:** The `migrations` section in `wrangler.jsonc` is required for the initial deployment to create the SessionManager Durable Object class. Keep it for the first deployment.

## Subsequent Deployments

After the initial deployment succeeds:

1. **For regular deployments**: Use `npx wrangler deploy` as normal
2. **For gradual deployments**: You may need to remove the `migrations` section from `wrangler.jsonc` to avoid error 10211

## Local Development

```bash
npx wrangler dev
```

Wrangler creates a local Durable Object environment automatically for development.

## Durable Objects

The WebRTC File Share feature uses **Durable Objects** for real-time WebSocket-based session management. The `SessionManager` Durable Object is automatically created during the first deployment.

### Migration Lifecycle

1. **Initial state**: `wrangler.jsonc` includes `migrations` section
2. **First deployment**: Migration creates SessionManager Durable Object class
3. **Deployment succeeds**: Durable Object is now available
4. **Optional**: Remove `migrations` section if using gradual deployments (to avoid error 10211)

## Troubleshooting

**Error 10061 - "Cannot create binding for class 'SessionManager'":**
- The SessionManager Durable Object class hasn't been created yet
- Ensure the `migrations` section is present in `wrangler.jsonc`
- Deploy with `npx wrangler deploy` to create the Durable Object class

**Error 10211 - "Version upload failed" with migration:**
- This occurs when trying to use gradual deployments with Durable Object migrations
- The migration has already been applied; remove it from `wrangler.jsonc`
- Use `npx wrangler deploy` for regular deployments

**API returns 404:**
- Verify `index.js` exists and `wrangler.jsonc` has `"main": "index.js"`
- Check deployment logs

**WebSocket connection errors:**
- Ensure the SessionManager Durable Object is properly deployed
- Check browser console for detailed error messages
- Verify the session code is correct

## Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Durable Objects Documentation](https://developers.cloudflare.com/durable-objects/)
- [Durable Objects Migrations](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/)
