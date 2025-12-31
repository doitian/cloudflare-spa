# cloudflare-spa

Single Page Applications deployed to Cloudflare Pages

## Overview

This repository hosts a collection of Single Page Applications (SPAs), where each app is a self-contained HTML file with inline CSS and JavaScript. The applications are automatically deployed to Cloudflare Pages via GitHub Actions.

## Structure

- `index.html` - Root page that lists all available SPAs
- `example.html` - Sample SPA demonstrating the structure
- `.github/workflows/deploy.yml` - GitHub Actions workflow for automatic deployment

## Adding a New SPA

1. Create a new HTML file in the root directory (e.g., `my-app.html`)
2. Include all HTML, CSS, and JavaScript in a single file
3. Add your app to the list in `index.html`:

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

4. Commit and push to trigger automatic deployment

## Deployment Setup

### Prerequisites

To enable automatic deployment to Cloudflare Pages, you need to configure the following secrets in your GitHub repository:

1. **CLOUDFLARE_API_TOKEN**: Your Cloudflare API token with Pages permissions
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
   - Create a token with "Cloudflare Pages - Edit" permissions

2. **CLOUDFLARE_ACCOUNT_ID**: Your Cloudflare account ID
   - Found in the Cloudflare Dashboard URL or in your account settings

### Adding Secrets

1. Go to your GitHub repository settings
2. Navigate to `Settings > Secrets and variables > Actions`
3. Click "New repository secret"
4. Add both `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`

### Deployment Trigger

The GitHub Actions workflow automatically deploys to Cloudflare Pages when code is pushed to the `main` branch.

## Local Development

Simply open any HTML file in your browser to test locally. No build step required!

## License

See [LICENSE](LICENSE) file for details.
