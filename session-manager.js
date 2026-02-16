// SessionManager Durable Object
// Manages WebSocket connections and session state for WebRTC signaling

// Constants
const SESSION_MAX_AGE_MS = 86400000; // 24 hours
const SESSION_CLEANUP_AFTER_DISCONNECT_MS = 3600000; // 1 hour

export class SessionManager {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map(); // sessionCode -> { offer, answer, creatorWs, joinerWs, createdAt }
  }

  async fetch(request) {
    const url = new URL(request.url);
    
    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }
    
    return new Response('Expected WebSocket', { status: 400 });
  }

  async handleWebSocket(request) {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const role = url.searchParams.get('role'); // 'creator' or 'joiner'
    
    if (!code || !role) {
      return new Response('Missing code or role parameter', { status: 400 });
    }

    // Create WebSocket pair
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Accept the WebSocket connection
    server.accept();

    // Initialize session if it doesn't exist
    if (!this.sessions.has(code)) {
      this.sessions.set(code, {
        offer: null,
        answer: null,
        creatorWs: null,
        joinerWs: null,
        createdAt: Date.now()
      });
    }

    const session = this.sessions.get(code);

    // Store the WebSocket connection based on role
    if (role === 'creator') {
      // Close any existing creator connection
      if (session.creatorWs) {
        session.creatorWs.close(1000, 'New connection from creator');
      }
      session.creatorWs = server;
      
      // Check if there's already an answer waiting
      if (session.answer) {
        this.sendMessage(server, {
          type: 'answer',
          answer: session.answer
        });
      }
    } else if (role === 'joiner') {
      // Close any existing joiner connection
      if (session.joinerWs) {
        session.joinerWs.close(1000, 'New connection from joiner');
      }
      session.joinerWs = server;
      
      // Send offer to joiner if available
      if (session.offer) {
        this.sendMessage(server, {
          type: 'offer',
          offer: session.offer
        });
      } else {
        this.sendMessage(server, {
          type: 'error',
          message: 'Session not found or offer not yet available'
        });
      }
    }

    // Handle incoming messages
    server.addEventListener('message', async (event) => {
      try {
        const message = JSON.parse(event.data);
        await this.handleMessage(code, role, message, server);
      } catch (error) {
        console.error('Error handling message:', error);
        this.sendMessage(server, {
          type: 'error',
          message: 'Invalid message format'
        });
      }
    });

    // Handle connection close
    server.addEventListener('close', () => {
      const session = this.sessions.get(code);
      if (session) {
        if (role === 'creator' && session.creatorWs === server) {
          session.creatorWs = null;
        } else if (role === 'joiner' && session.joinerWs === server) {
          session.joinerWs = null;
        }
        
        // Clean up session if both connections are closed and it's been more than 1 hour
        if (!session.creatorWs && !session.joinerWs && 
            Date.now() - session.createdAt > SESSION_CLEANUP_AFTER_DISCONNECT_MS) {
          this.sessions.delete(code);
        }
      }
    });

    // Handle errors
    server.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
    });

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  async handleMessage(code, role, message, ws) {
    const session = this.sessions.get(code);
    if (!session) {
      this.sendMessage(ws, {
        type: 'error',
        message: 'Session not found'
      });
      return;
    }

    switch (message.type) {
      case 'offer':
        // Creator sends offer
        if (role === 'creator') {
          session.offer = message.offer;
          
          // If joiner is already connected, send offer immediately
          if (session.joinerWs) {
            this.sendMessage(session.joinerWs, {
              type: 'offer',
              offer: message.offer
            });
          }
          
          // Acknowledge receipt
          this.sendMessage(ws, {
            type: 'offer-stored',
            code: code
          });
        }
        break;

      case 'answer':
        // Joiner sends answer
        if (role === 'joiner') {
          session.answer = message.answer;
          
          // If creator is online, push notification immediately
          if (session.creatorWs) {
            this.sendMessage(session.creatorWs, {
              type: 'answer',
              answer: message.answer
            });
          }
          // If creator is offline, answer is saved and will be sent when they reconnect
          
          // Acknowledge receipt
          this.sendMessage(ws, {
            type: 'answer-stored'
          });
        }
        break;

      case 'ping':
        // Keep-alive ping
        this.sendMessage(ws, {
          type: 'pong'
        });
        break;

      default:
        this.sendMessage(ws, {
          type: 'error',
          message: 'Unknown message type'
        });
    }
  }

  sendMessage(ws, message) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  }

  // Periodic cleanup of old sessions (could be called by alarm)
  async cleanup() {
    const now = Date.now();

    for (const [code, session] of this.sessions.entries()) {
      if (now - session.createdAt > SESSION_MAX_AGE_MS) {
        // Close any open connections
        if (session.creatorWs) {
          session.creatorWs.close(1000, 'Session expired');
        }
        if (session.joinerWs) {
          session.joinerWs.close(1000, 'Session expired');
        }
        this.sessions.delete(code);
      }
    }
  }
}
