// Main worker entry point for all API endpoints
import { SessionManager } from './session-manager.js';

// Export the Durable Object
export { SessionManager };

// Handle WebSocket connections for real-time notifications
async function handleWebSocketSession(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  
  if (!code) {
    return new Response('Missing code parameter', { status: 400 });
  }

  // Get the Durable Object stub
  // Use the session code as the ID to ensure all connections for the same session
  // go to the same Durable Object instance
  const id = env.SESSION_MANAGER.idFromName(code);
  const stub = env.SESSION_MANAGER.get(id);
  
  // Forward the request to the Durable Object
  return stub.fetch(request);
}

// Return ICE server configuration, including TURN credentials if available
async function handleIceServers(env) {
  const iceServers = [
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.l.google.com:19302' }
  ];

  // Generate TURN credentials via Cloudflare Calls API if configured
  if (env.TURN_SERVICE_ID && env.TURN_SERVICE_TOKEN) {
    try {
      const response = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_SERVICE_ID}/credentials/generate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.TURN_SERVICE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ttl: 86400 })
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.iceServers) {
          iceServers.push(data.iceServers);
        }
      }
    } catch (error) {
      console.error('Failed to get TURN credentials:', error);
    }
  }

  return Response.json({ iceServers });
}

// Main fetch handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Route WebSocket connections for real-time notifications
    if (url.pathname === '/api/ws/file-share-session') {
      return handleWebSocketSession(request, env);
    }

    // Return ICE server configuration
    if (url.pathname === '/api/ice-servers') {
      return handleIceServers(env);
    }
    
    // For all other requests, serve static assets
    return env.ASSETS.fetch(request);
  }
};
