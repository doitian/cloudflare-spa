// Main worker entry point for all API endpoints
import { SessionManager } from './session-manager.js';

// Export the Durable Object
export { SessionManager };

// Handle file share session API endpoints (legacy KV-based, kept for backwards compatibility)
async function handleFileShareSession(request, env) {
  const url = new URL(request.url);
  
  if (request.method === 'POST') {
    try {
      const { code, offer } = await request.json();
      
      if (!code || !offer) {
        return new Response(JSON.stringify({ error: 'Missing code or offer' }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json'
          }
        });
      }

      // Store the offer in KV with 1 day expiration (86400 seconds)
      await env.WEBRTC_SESSIONS.put(code, JSON.stringify(offer), {
        expirationTtl: 86400
      });

      return new Response(JSON.stringify({ success: true, code }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json'
        }
      });
    }
  }
  
  if (request.method === 'GET') {
    try {
      const code = url.searchParams.get('code');
      
      if (!code) {
        return new Response(JSON.stringify({ error: 'Missing code parameter' }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json'
          }
        });
      }

      const offerData = await env.WEBRTC_SESSIONS.get(code);
      
      if (!offerData) {
        return new Response(JSON.stringify({ error: 'Session not found or expired' }), {
          status: 404,
          headers: { 
            'Content-Type': 'application/json'
          }
        });
      }

      try {
        const offer = JSON.parse(offerData);
        return new Response(JSON.stringify({ 
          success: true, 
          offer: offer 
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json'
          }
        });
      } catch (parseError) {
        return new Response(JSON.stringify({ error: 'Invalid session data' }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json'
        }
      });
    }
  }
  
  return new Response('Method not allowed', {
    status: 405
  });
}

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
    
    // Route API requests (legacy KV-based, kept for backwards compatibility)
    if (url.pathname.startsWith('/api/file-share-session')) {
      return handleFileShareSession(request, env);
    }
    
    // For all other requests, serve static assets
    return env.ASSETS.fetch(request);
  }
};
