// app.js
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { URL } from "url";

console.log("web_server started");

// Config
const PORT = Number(process.env.PORT || 22006);
const WS_PATH = process.env.WS_PATH || "/cs2_webradar";
const WS_KEY = process.env.WS_KEY || ""; // si está vacío, no exige key

const server = http.createServer();

// WS server
const wss = new WebSocketServer({
  server,
  path: WS_PATH,
  clientTracking: true,
  perMessageDeflate: false,
});

function getClientAddress(req) {
  // Cloudflare suele mandar CF-Connecting-IP si algún día lo ponés detrás
  const cfIp = req.headers["cf-connecting-ip"];
  if (typeof cfIp === "string" && cfIp.length > 0) return cfIp;

  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) return xff.split(",")[0].trim();

  const raw = req.socket?.remoteAddress || "";
  return raw.replace("::ffff:", "");
}

function isAuthorized(req) {
  if (!WS_KEY) return true; // si no configurás WS_KEY, no valida
  try {
    const host = req.headers.host || "localhost";
    const u = new URL(req.url || "", `http://${host}`);
    const key = u.searchParams.get("key") || "";
    return key === WS_KEY;
  } catch {
    return false;
  }
}

// Heartbeat
function heartbeat() {
  this.isAlive = true;
}

wss.on("connection", (ws, req) => {
  const clientAddress = getClientAddress(req);

  if (!isAuthorized(req)) {
    console.warn(`${clientAddress} rejected (bad key)`);
    ws.close(1008, "Unauthorized"); // policy violation
    return;
  }

  console.info(`${clientAddress} connected`);

  ws.isAlive = true;
  ws.on("pong", heartbeat);

  ws.on("message", (message, isBinary) => {
    // Broadcast a todos los clientes conectados (incluye al emisor si querés)
    for (const client of wss.clients) {
      if (client.readyState !== WebSocket.OPEN) continue;
      try {
        client.send(message, { binary: isBinary });
      } catch (err) {
        console.error("send error:", err);
      }
    }
  });

  ws.on("close", (code, reason) => {
    console.info(`${clientAddress} disconnected (${code}) ${reason?.toString?.() || ""}`.trim());
  });

  ws.on("error", (err) => {
    console.error(`${clientAddress} ws error:`, err);
  });
});

// Ping interval (mantiene viva la conexión y limpia muertos)
const interval = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      try { ws.terminate(); } catch { }
      continue;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch { }
  }
}, 25000);

wss.on("close", () => clearInterval(interval));

server.listen(PORT, "0.0.0.0", () => {
  console.info(`listening on port '${PORT}' path '${WS_PATH}'`);
});
