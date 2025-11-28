import { WebSocketServer } from "ws";
import http from "http";

console.log("CS2 Radar WebSocket Server started");

const port = 22006;
const server = http.createServer();
const web_socket_server = new WebSocketServer({
  server: server,
  path: "/cs2_webradar"
});

web_socket_server.on("connection", (web_socket, request) => {
  const client_address = request.socket.remoteAddress.replace("::ffff:", "");
  console.info(`${client_address} connected`);

  web_socket.on("message", (message) => {
    console.log(`Broadcasting to ${web_socket_server.clients.size} clients`);
    web_socket_server.clients.forEach((client) => {
      if (client.readyState === 1) { // OPEN
        client.send(message);
      }
    });
  });

  web_socket.on("close", () => {
    console.info(`${client_address} disconnected`);
  });

  web_socket.on("error", (error) => {
    console.error(error);
  });
});

server.listen(port);
console.info(`WebSocket server listening on port '${port}'`);