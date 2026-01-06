// Main worker entry point for all API endpoints

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle CORS preflight requests
function handleOptions() {
  return new Response(null, {
    headers: corsHeaders
  });
}

// Handle file share session API endpoints
async function handleFileShareSession(request, env) {
  const url = new URL(request.url);
  
  if (request.method === 'OPTIONS') {
    return handleOptions();
  }
  
  if (request.method === 'POST') {
    try {
      const { code, offer } = await request.json();
      
      if (!code || !offer) {
        return new Response(JSON.stringify({ error: 'Missing code or offer' }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
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
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
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
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      const offerData = await env.WEBRTC_SESSIONS.get(code);
      
      if (!offerData) {
        return new Response(JSON.stringify({ error: 'Session not found or expired' }), {
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
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
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      } catch (parseError) {
        return new Response(JSON.stringify({ error: 'Invalid session data' }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
  
  return new Response('Method not allowed', {
    status: 405,
    headers: corsHeaders
  });
}

// Main fetch handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Route API requests
    if (url.pathname.startsWith('/api/file-share-session')) {
      return handleFileShareSession(request, env);
    }
    
    // For all other requests, serve static assets
    return env.ASSETS.fetch(request);
  }
};
