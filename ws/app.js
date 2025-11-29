// app.js (ESM)
import { WebSocketServer } from 'ws';

const PORT = 8080;

// host: '0.0.0.0' para escuchar en la red local también
const wss = new WebSocketServer({ port: PORT, host: '0.0.0.0' });

wss.on('connection', (ws) => {
  console.log('[WS] Cliente conectado');

  ws.on('message', (data) => {
    const msg = data.toString();
    console.log('[WS] Mensaje recibido, len:', msg.length);

    // Broadcast a todos los demás clientes (front del radar, etc.)
    for (const client of wss.clients) {
      if (client !== ws && client.readyState === ws.OPEN) {
        client.send(msg);
      }
    }
  });

  ws.on('close', () => {
    console.log('[WS] Cliente desconectado');
  });
});

console.log(`[WS] Servidor WebSocket escuchando en ws://0.0.0.0:${PORT}`);
