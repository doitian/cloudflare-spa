# Cloudflare Pages Deployment Guide

This guide explains how to deploy this repository to Cloudflare Pages with the WebRTC File Sharing SPA.

## Prerequisites

1. A Cloudflare account
2. A KV namespace created in your Cloudflare account

## Cloudflare Pages Configuration

### Build Settings

When setting up your Cloudflare Pages project, use the following configuration:

- **Framework preset**: None
- **Build command**: `exit 0`
- **Build output directory**: `public`
- **Root directory**: `/` (or leave empty)

**Architecture:** This project uses a single `index.js` worker to handle all API endpoints, with static files served from the `/public` directory.

### Why `exit 0` Works

The build command `exit 0` tells Cloudflare Pages to skip the build step. This is appropriate for this project because:

1. All HTML files are **self-contained** with inline CSS and JavaScript - no build step needed
2. The `index.js` worker handles API routing without requiring compilation
3. No dependencies need to be installed (no `package.json`)
4. No transpilation or bundling is required

### Troubleshooting 404 Errors on API Endpoints

If you're getting 404 errors on `/api/file-share-session`:

1. **Verify worker deployment**: Check that `index.js` is deployed correctly
2. **Confirm KV binding**: The worker requires the `WEBRTC_SESSIONS` KV namespace binding
3. **Check wrangler.jsonc**: Ensure `main` entry points to `index.js`
4. **Wait for deployment**: After pushing changes, wait for the deployment to complete before testing

### Environment Configuration

#### KV Namespace Binding

The WebRTC File Sharing feature requires a KV namespace for session coordination.

**In the Cloudflare Dashboard:**

1. Go to **Workers & Pages** → **KV**
2. Create a new KV namespace (or use existing one with ID: `18a5d8b090144ae595321176dca58178`)
3. Go to your Pages project → **Settings** → **Functions**
4. Scroll to **KV namespace bindings**
5. Add a binding:
   - **Variable name**: `WEBRTC_SESSIONS`
   - **KV namespace**: Select your KV namespace

**Note**: The `wrangler.jsonc` file already contains the KV namespace ID `18a5d8b090144ae595321176dca58178`. If you're using a different KV namespace, update this ID in `wrangler.jsonc`.

## Local Development

For local development with Wrangler:

```bash
# Install Wrangler (if not already installed)
npm install -g wrangler

# Run local development server
npx wrangler pages dev public --kv WEBRTC_SESSIONS
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

### KV Namespace Errors

If you see errors about `WEBRTC_SESSIONS` not being found:

1. Ensure KV namespace binding is configured in Cloudflare Dashboard
2. Verify the binding variable name is exactly `WEBRTC_SESSIONS`
3. Check that the KV namespace ID in `wrangler.jsonc` matches your namespace

### Worker Not Working

If the API endpoints return 404:

1. Ensure `index.js` is at the project root
2. Check that `wrangler.jsonc` has `"main": "index.js"`
3. Verify the worker is deployed (check deployment logs)
4. Ensure KV binding is configured

## Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/platform/functions/)
- [Cloudflare KV Documentation](https://developers.cloudflare.com/kv/)
