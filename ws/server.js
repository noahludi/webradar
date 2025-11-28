// server.js
const WebSocket = require('ws');

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws) => {
  console.log('[WS] Cliente conectado');

  ws.on('message', (data) => {
    // data es el JSON que manda Python (string)
    // Broadcast a todos los demás clientes (ej: front de radar)
    for (const client of wss.clients) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  });

  ws.on('close', () => {
    console.log('[WS] Cliente desconectado');
  });
});

console.log(`[WS] Servidor WebSocket escuchando en ws://localhost:${PORT}`);
