# Push Notification Architecture

This document describes the WebSocket-based push notification system for the WebRTC file sharing application.

## Overview

The file sharing app now uses **Cloudflare Durable Objects** with **WebSocket connections** to provide real-time push notifications for WebRTC signaling, eliminating the need for inefficient polling.

## Architecture

### Flow Diagram

```
Alice (Creator)                Server (Durable Object)              Bob (Joiner)
     |                                  |                                 |
     |---(1) WebSocket Connect-------->|                                 |
     |    (role=creator, code=ABC123)  |                                 |
     |                                  |                                 |
     |---(2) Send Offer---------------->|                                 |
     |                                  | [Store offer]                   |
     |<---(3) Offer Stored-------------|                                 |
     |                                  |                                 |
     |     [Waiting for Bob...]         |                                 |
     |                                  |                                 |
     |                                  |<---(4) WebSocket Connect--------|
     |                                  |    (role=joiner, code=ABC123)   |
     |                                  |                                 |
     |                                  |---(5) Send Offer--------------->|
     |                                  |                                 |
     |                                  |<---(6) Send Answer--------------|
     |                                  | [Store answer]                  |
     |                                  |---(7) Answer Stored------------>|
     |                                  |                                 |
     |<---(8) Push Answer---------------|                                 |
     |                                  |                                 |
     | [WebRTC P2P Connection Established]                                |
     |<===========Direct Data Channel Communication======================>|
```

### Components

#### 1. **SessionManager Durable Object** (`session-manager.js`)

A Cloudflare Durable Object that manages:
- **WebSocket connections** for both Alice (creator) and Bob (joiner)
- **Session state** including offer, answer, and connection status
- **Real-time notifications** when peers join or respond

**Key Features:**
- Each session code maps to a unique Durable Object instance
- Stores WebSocket connections for instant bi-directional communication
- Automatically handles connection lifecycle (open, message, close, error)
- Implements notification logic: immediate push if peer is online, or save for later

#### 2. **Worker API** (`index.js`)

Main worker that routes requests:
- **WebSocket endpoint**: `/api/ws/file-share-session?code={code}&role={creator|joiner}`
- **ICE servers endpoint**: `/api/ice-servers` — returns ICE server configuration including TURN credentials if configured
- **Static assets**: Serves the SPA files

#### 3. **Frontend** (`public/file-share.html`)

Updated to use WebSockets instead of polling:
- Establishes WebSocket connection on session creation/join
- Sends/receives signaling messages in real-time
- Handles automatic reconnection and error scenarios

## Message Protocol

### Client → Server Messages

```javascript
// Creator sends offer
{
  "type": "offer",
  "offer": RTCSessionDescription
}

// Joiner sends answer
{
  "type": "answer",
  "answer": RTCSessionDescription
}

// ICE candidate (trickle ICE)
{
  "type": "ice-candidate",
  "candidate": RTCIceCandidate
}

// Keep-alive ping
{
  "type": "ping"
}
```

### Server → Client Messages

```javascript
// Offer stored confirmation
{
  "type": "offer-stored",
  "code": "ABC123"
}

// Offer sent to joiner
{
  "type": "offer",
  "offer": RTCSessionDescription
}

// Answer stored confirmation
{
  "type": "answer-stored"
}

// Answer pushed to creator
{
  "type": "answer",
  "answer": RTCSessionDescription
}

// ICE candidate relayed from peer
{
  "type": "ice-candidate",
  "candidate": RTCIceCandidate
}

// Error message
{
  "type": "error",
  "message": "Error description"
}

// Keep-alive response
{
  "type": "pong"
}
```

## Notification Logic

### Scenario 1: Both Alice and Bob Online

1. Alice creates session → establishes WebSocket as "creator"
2. Alice sends offer → server stores it
3. Bob joins session → establishes WebSocket as "joiner"
4. Server immediately sends offer to Bob
5. Bob sends answer → server immediately pushes to Alice
6. WebRTC connection established

**Result**: Instant notification, no waiting

### Scenario 2: Alice Offline When Bob Responds

1. Alice creates session → establishes WebSocket
2. Alice sends offer → server stores it
3. Alice goes offline/closes browser → WebSocket disconnected
4. Bob joins session → establishes WebSocket
5. Server sends offer to Bob
6. Bob sends answer → server stores it (Alice offline)
7. Alice comes back online → establishes WebSocket
8. Server immediately pushes stored answer to Alice
9. WebRTC connection established

**Result**: Answer saved and delivered when Alice reconnects

### Scenario 3: No Session Found

1. Bob tries to join with invalid code
2. Server sends error message
3. Bob sees "Session not found" error

**Result**: Graceful error handling

## Session Lifecycle

### Creation
- Session created when first WebSocket connects
- Stored in Durable Object's in-memory Map
- No expiration until both connections close for > 1 hour

### Active Phase
- WebSocket connections maintained
- Messages exchanged in real-time
- Automatic reconnection on temporary disconnects

### Cleanup
- Sessions cleaned up 24 hours after creation
- Early cleanup if both connections closed for > 1 hour
- Durable Objects handle state persistence

## Benefits Over Polling

### Old System (Polling)
- ❌ Alice polls every 5 seconds for up to 5 minutes
- ❌ Wastes server resources and bandwidth
- ❌ Average delay: 2.5 seconds
- ❌ Maximum 60 poll attempts per session

### New System (WebSocket + Durable Objects)
- ✅ Instant notification (< 100ms typical)
- ✅ Persistent connection (minimal overhead)
- ✅ Server can push when ready
- ✅ Works even when creator is temporarily offline
- ✅ Bi-directional communication

## Configuration

### `wrangler.jsonc`

```jsonc
{
  "durable_objects": {
    "bindings": [
      {
        "name": "SESSION_MANAGER",
        "class_name": "SessionManager"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["SessionManager"]
    }
  ]
}
```

## Deployment

### Local Development
```bash
npx wrangler dev
```

### Production Deployment
```bash
npx wrangler deploy
```

**Note**: Durable Objects are automatically created on first deployment. No additional setup required beyond the wrangler configuration.

## Security Considerations

1. **Session Code Randomness**: 6-character alphanumeric codes provide 36^6 = ~2 billion combinations
2. **WebSocket Validation**: Code and role parameters validated on connection
3. **XSS Prevention**: Session codes validated with regex before rendering
4. **No Permanent Storage**: Sessions expire after 24 hours
5. **Direct P2P**: Actual file data never touches the server

## Future Enhancements

Potential improvements:
- Add authentication for private sessions
- Implement session password protection
- Add presence indicators (online/offline status)
- Support for multiple simultaneous joiners
- Session history and audit logs
- Custom session codes (not random)

## Troubleshooting

### WebSocket Connection Failed
- Check browser console for errors
- Verify wrangler.jsonc has Durable Object bindings
- Ensure migrations are configured

### Session Not Found
- Session may have expired (24 hour TTL)
- Verify correct session code entered
- Check server logs for errors

### No Answer Received
- Verify both peers have stable internet
- Check WebRTC ICE candidate gathering
- Review browser WebRTC settings

### ICE Connection Failed
- This typically means peers cannot establish a direct connection (common with mobile or restrictive NATs)
- Configure a TURN server via `TURN_SERVICE_ID` and `TURN_SERVICE_TOKEN` environment variables (uses Cloudflare Calls TURN)
- Check `about:webrtc` (Firefox) or `chrome://webrtc-internals` (Chrome/Edge) for ICE candidate details

## References

- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Cloudflare WebSockets](https://developers.cloudflare.com/workers/runtime-apis/websockets/)
- [WebRTC Signaling](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling)
