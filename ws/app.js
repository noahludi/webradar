// app.js
let lastBroadcast = 0;
const MIN_INTERVAL_MS = 50; // 20 FPS

wss.on('connection', (ws) => {
  console.log('[WS] Cliente conectado');

  ws.on('message', (data) => {
    const now = Date.now();
    if (now - lastBroadcast < MIN_INTERVAL_MS) {
      // ignoramos mensajes demasiado seguidos
      return;
    }
    lastBroadcast = now;

    for (const client of wss.clients) {
      if (client !== ws && client.readyState === ws.OPEN) {
        client.send(data);
      }
    }
  });
});
