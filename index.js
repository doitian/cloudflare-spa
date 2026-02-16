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

// Main fetch handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Route WebSocket connections for real-time notifications
    if (url.pathname === '/api/ws/file-share-session') {
      return handleWebSocketSession(request, env);
    }
    
    // For all other requests, serve static assets
    return env.ASSETS.fetch(request);
  }
};
