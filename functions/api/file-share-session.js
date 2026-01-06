// API endpoint for managing WebRTC sessions
// This handles creating new sessions and retrieving existing ones

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle OPTIONS request for CORS
export async function onRequestOptions() {
  return new Response(null, {
    headers: corsHeaders
  });
}

export async function onRequestPost({ request, env }) {
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

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
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
