// API endpoint for managing WebRTC sessions
// This handles creating new sessions and retrieving existing ones

export async function onRequestPost({ request, env }) {
  try {
    const { code, offer } = await request.json();
    
    if (!code || !offer) {
      return new Response(JSON.stringify({ error: 'Missing code or offer' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Store the offer in KV with 1 day expiration (86400 seconds)
    await env.WEBRTC_SESSIONS.put(code, JSON.stringify(offer), {
      expirationTtl: 86400
    });

    return new Response(JSON.stringify({ success: true, code }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
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
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const offerData = await env.WEBRTC_SESSIONS.get(code);
    
    if (!offerData) {
      return new Response(JSON.stringify({ error: 'Session not found or expired' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      const offer = JSON.parse(offerData);
      return new Response(JSON.stringify({ 
        success: true, 
        offer: offer 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (parseError) {
      return new Response(JSON.stringify({ error: 'Invalid session data' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
