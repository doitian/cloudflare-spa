# cloudflare-spa

Single Page Applications deployed to Cloudflare Pages

## Overview

This repository hosts a collection of Single Page Applications (SPAs), where each app is a self-contained HTML file with inline CSS and JavaScript.

## Structure

- `index.html` - Root page that lists all available SPAs
- `example.html` - Sample SPA demonstrating the structure

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

4. Commit and push your changes

## Local Development

Simply open any HTML file in your browser to test locally. No build step required!

## License

See [LICENSE](LICENSE) file for details.
