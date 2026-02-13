var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// session-manager.js
var SESSION_MAX_AGE_MS = 864e5;
var SESSION_CLEANUP_AFTER_DISCONNECT_MS = 36e5;
var SessionManager = class {
  static {
    __name(this, "SessionManager");
  }
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = /* @__PURE__ */ new Map();
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (request.headers.get("Upgrade") === "websocket") {
      return this.handleWebSocket(request);
    }
    return new Response("Expected WebSocket", { status: 400 });
  }
  async handleWebSocket(request) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const role = url.searchParams.get("role");
    if (!code || !role) {
      return new Response("Missing code or role parameter", { status: 400 });
    }
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);
    server.accept();
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
    if (role === "creator") {
      if (session.creatorWs) {
        session.creatorWs.close(1e3, "New connection from creator");
      }
      session.creatorWs = server;
      if (session.answer) {
        this.sendMessage(server, {
          type: "answer",
          answer: session.answer
        });
      }
    } else if (role === "joiner") {
      if (session.joinerWs) {
        session.joinerWs.close(1e3, "New connection from joiner");
      }
      session.joinerWs = server;
      if (session.offer) {
        this.sendMessage(server, {
          type: "offer",
          offer: session.offer
        });
      } else {
        this.sendMessage(server, {
          type: "error",
          message: "Session not found or offer not yet available"
        });
      }
    }
    server.addEventListener("message", async (event) => {
      try {
        const message = JSON.parse(event.data);
        await this.handleMessage(code, role, message, server);
      } catch (error) {
        console.error("Error handling message:", error);
        this.sendMessage(server, {
          type: "error",
          message: "Invalid message format"
        });
      }
    });
    server.addEventListener("close", () => {
      const session2 = this.sessions.get(code);
      if (session2) {
        if (role === "creator" && session2.creatorWs === server) {
          session2.creatorWs = null;
        } else if (role === "joiner" && session2.joinerWs === server) {
          session2.joinerWs = null;
        }
        if (!session2.creatorWs && !session2.joinerWs && Date.now() - session2.createdAt > SESSION_CLEANUP_AFTER_DISCONNECT_MS) {
          this.sessions.delete(code);
        }
      }
    });
    server.addEventListener("error", (error) => {
      console.error("WebSocket error:", error);
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
        type: "error",
        message: "Session not found"
      });
      return;
    }
    switch (message.type) {
      case "offer":
        if (role === "creator") {
          session.offer = message.offer;
          if (session.joinerWs) {
            this.sendMessage(session.joinerWs, {
              type: "offer",
              offer: message.offer
            });
          }
          this.sendMessage(ws, {
            type: "offer-stored",
            code
          });
        }
        break;
      case "answer":
        if (role === "joiner") {
          session.answer = message.answer;
          if (session.creatorWs) {
            this.sendMessage(session.creatorWs, {
              type: "answer",
              answer: message.answer
            });
          }
          this.sendMessage(ws, {
            type: "answer-stored"
          });
        }
        break;
      case "ping":
        this.sendMessage(ws, {
          type: "pong"
        });
        break;
      default:
        this.sendMessage(ws, {
          type: "error",
          message: "Unknown message type"
        });
    }
  }
  sendMessage(ws, message) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  }
  // Periodic cleanup of old sessions (could be called by alarm)
  async cleanup() {
    const now = Date.now();
    for (const [code, session] of this.sessions.entries()) {
      if (now - session.createdAt > SESSION_MAX_AGE_MS) {
        if (session.creatorWs) {
          session.creatorWs.close(1e3, "Session expired");
        }
        if (session.joinerWs) {
          session.joinerWs.close(1e3, "Session expired");
        }
        this.sessions.delete(code);
      }
    }
  }
};

// index.js
async function handleFileShareSession(request, env) {
  const url = new URL(request.url);
  if (request.method === "POST") {
    try {
      const { code, offer } = await request.json();
      if (!code || !offer) {
        return new Response(JSON.stringify({ error: "Missing code or offer" }), {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        });
      }
      await env.WEBRTC_SESSIONS.put(code, JSON.stringify(offer), {
        expirationTtl: 86400
      });
      return new Response(JSON.stringify({ success: true, code }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
  }
  if (request.method === "GET") {
    try {
      const code = url.searchParams.get("code");
      if (!code) {
        return new Response(JSON.stringify({ error: "Missing code parameter" }), {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        });
      }
      const offerData = await env.WEBRTC_SESSIONS.get(code);
      if (!offerData) {
        return new Response(JSON.stringify({ error: "Session not found or expired" }), {
          status: 404,
          headers: {
            "Content-Type": "application/json"
          }
        });
      }
      try {
        const offer = JSON.parse(offerData);
        return new Response(JSON.stringify({
          success: true,
          offer
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        });
      } catch (parseError) {
        return new Response(JSON.stringify({ error: "Invalid session data" }), {
          status: 500,
          headers: {
            "Content-Type": "application/json"
          }
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
  }
  return new Response("Method not allowed", {
    status: 405
  });
}
__name(handleFileShareSession, "handleFileShareSession");
async function handleWebSocketSession(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) {
    return new Response("Missing code parameter", { status: 400 });
  }
  const id = env.SESSION_MANAGER.idFromName(code);
  const stub = env.SESSION_MANAGER.get(id);
  return stub.fetch(request);
}
__name(handleWebSocketSession, "handleWebSocketSession");
var index_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/ws/file-share-session") {
      return handleWebSocketSession(request, env);
    }
    if (url.pathname.startsWith("/api/file-share-session")) {
      return handleFileShareSession(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};

// ../../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-ZMJ24R/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = index_default;

// ../../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-ZMJ24R/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  SessionManager,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
