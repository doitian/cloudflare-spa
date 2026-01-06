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
- **Build output directory**: `/` (or leave empty)
- **Root directory**: `/` (or leave empty)

### Why `exit 0` Works

The build command `exit 0` tells Cloudflare Pages to skip the build step. This is appropriate for this project because:

1. All HTML files are **self-contained** with inline CSS and JavaScript - no build step needed
2. The `/functions` directory contains **Cloudflare Pages Functions** that are deployed as-is without compilation
3. No dependencies need to be installed (no `package.json`)
4. No transpilation or bundling is required

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
npx wrangler pages dev . --kv WEBRTC_SESSIONS
```

**Note**: For local development, Wrangler will create a local KV namespace automatically.

## Project Structure

```
cloudflare-spa/
├── index.html              # Homepage listing all SPAs
├── file-share.html         # WebRTC File Sharing SPA
├── search.html             # Search results SPA
├── example.html            # Example SPA
├── functions/              # Cloudflare Pages Functions
│   └── api/
│       └── file-share-session.js  # API endpoint for WebRTC session coordination
└── wrangler.jsonc          # Cloudflare configuration
```

## How the WebRTC File Sharing Works

1. **No Build Required**: All HTML files are self-contained
2. **Pages Functions**: The `/functions/api/file-share-session.js` endpoint handles:
   - Storing WebRTC offers/answers in KV
   - Retrieving session data by code
   - Automatic expiration after 24 hours
3. **Direct Deployment**: Files are served as-is from the repository

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

### Functions Not Working

If the API endpoints return 404:

1. Ensure the `/functions` directory is included in your deployment
2. Check Cloudflare Pages Functions logs in the dashboard
3. Verify the Functions feature is enabled for your Pages project

## Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/platform/functions/)
- [Cloudflare KV Documentation](https://developers.cloudflare.com/kv/)
