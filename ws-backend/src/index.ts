import { WebSocketServer } from "ws";
import type { WebSocket as WSWebSocket } from "ws";
import http from "http";

const server = http.createServer();
const wss = new WebSocketServer({ server });

const userSockets = new Map<string, WSWebSocket>();

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
    
      if (msg.type === "register") {
        userSockets.set(msg.username, ws);
        console.log(`User registered: ${msg.username}`);
      }

      if (msg.type === "share_url") {
        const {sharedBy} = msg;
        userSockets.forEach((socket, username) => {
          if (username !== sharedBy) {
            socket.send(
              JSON.stringify({
                type: "new_url_shared",
                sharedBy,
               })
            );
          }
        });
      }
    } catch (e) {
      console.error("Error parsing message:", e);
    }
  });

  ws.on("close", () => {
    for (const [username, socket] of userSockets.entries()) {
      if (socket === ws) {
        userSockets.delete(username);
        console.log(`User disconnected: ${username}`);
        break;
      }
    }
  });
});


server.listen(5000, () => {
  console.log("WebSocket server running on ws://localhost:5000");
});
