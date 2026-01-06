// Main worker entry point for all API endpoints

// Handle file share session API endpoints
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

// Handle WebSocket connections for WebRTC signaling
async function handleWebSocket(request, env) {
  const upgradeHeader = request.headers.get('Upgrade');
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return new Response('Expected Upgrade: websocket', { status: 426 });
  }

  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);

  server.accept();

  let pollingTimeout = null;

  server.addEventListener('message', async (event) => {
    try {
      const message = JSON.parse(event.data);
      
      if (message.type === 'offer') {
        // Store offer in KV
        await env.WEBRTC_SESSIONS.put(message.code, JSON.stringify({
          offer: message.offer,
          timestamp: Date.now()
        }), {
          expirationTtl: 86400
        });
        
        // Send confirmation
        server.send(JSON.stringify({ type: 'offer-stored', code: message.code }));
        
        // Start listening for answer
        const listenForAnswer = async () => {
          const answerKey = `${message.code}_answer`;
          let attempts = 0;
          const maxAttempts = 60;
          
          const checkAnswer = async () => {
            if (attempts >= maxAttempts) {
              server.send(JSON.stringify({ type: 'timeout' }));
              return;
            }
            
            const answerData = await env.WEBRTC_SESSIONS.get(answerKey);
            if (answerData) {
              const data = JSON.parse(answerData);
              server.send(JSON.stringify({ 
                type: 'answer', 
                answer: data.answer 
              }));
            } else {
              attempts++;
              pollingTimeout = setTimeout(checkAnswer, 5000);
            }
          };
          
          checkAnswer();
        };
        
        listenForAnswer();
      } else if (message.type === 'get-offer') {
        // Retrieve offer from KV
        const offerData = await env.WEBRTC_SESSIONS.get(message.code);
        
        if (!offerData) {
          server.send(JSON.stringify({ 
            type: 'error', 
            error: 'Session not found or expired' 
          }));
        } else {
          const data = JSON.parse(offerData);
          server.send(JSON.stringify({ 
            type: 'offer', 
            offer: data.offer 
          }));
        }
      } else if (message.type === 'answer') {
        // Store answer in KV
        const answerKey = `${message.code}_answer`;
        await env.WEBRTC_SESSIONS.put(answerKey, JSON.stringify({
          answer: message.answer,
          timestamp: Date.now()
        }), {
          expirationTtl: 86400
        });
        
        server.send(JSON.stringify({ type: 'answer-stored' }));
      }
    } catch (error) {
      server.send(JSON.stringify({ 
        type: 'error', 
        error: error.message 
      }));
    }
  });

  server.addEventListener('close', () => {
    // Cleanup pending timeouts
    if (pollingTimeout) {
      clearTimeout(pollingTimeout);
      pollingTimeout = null;
    }
  });

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}

// Main fetch handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Route WebSocket requests for WebRTC signaling
    if (url.pathname === '/api/webrtc') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader && upgradeHeader === 'websocket') {
        return handleWebSocket(request, env);
      }
      // Fallback to HTTP handler for backward compatibility during transition
      return handleFileShareSession(request, env);
    }
    
    // For all other requests, serve static assets
    return env.ASSETS.fetch(request);
  }
};
