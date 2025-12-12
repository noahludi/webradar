// app.js
import http from "http";
import { WebSocketServer } from "ws";
import { URL } from "url";

console.log("web_server started");

const PORT = Number(process.env.PORT || 22006);
const WS_PATH = process.env.WS_PATH || "/cs2_webradar";
const WS_KEY = process.env.WS_KEY || ""; // si está vacío, no valida

const server = http.createServer((req, res) => {
  // endpoint de health para probar rápido
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "text/plain" });
    return res.end("ok");
  }
  res.writeHead(404);
  res.end("not found");
});

const wss = new WebSocketServer({ noServer: true });

function isAuthorized(req) {
  if (!WS_KEY) return true;
  const host = req.headers.host || "localhost";
  const u = new URL(req.url || "", `http://${host}`);
  return (u.searchParams.get("key") || "") === WS_KEY;
}

server.on("upgrade", (req, socket, head) => {
  const host = req.headers.host || "localhost";
  const u = new URL(req.url || "", `http://${host}`);

  // 1) Path exacto
  if (u.pathname !== WS_PATH) {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
    return;
  }

  // 2) Auth
  if (!isAuthorized(req)) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  // OK: upgrade a WebSocket
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", (ws, req) => {
  console.log("WS CONNECT:", req.url);

  ws.on("message", (message) => {
    for (const client of wss.clients) {
      if (client.readyState === 1) client.send(message);
    }
  });

  ws.on("close", (code, reason) => {
    console.log("WS CLOSE:", code, reason?.toString?.() || "");
  });

  ws.on("error", (err) => console.error("WS ERROR:", err));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`listening on http://0.0.0.0:${PORT}`);
  console.log(`ws path: ${WS_PATH}`);
});
