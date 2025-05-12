"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const http_1 = __importDefault(require("http"));
const server = http_1.default.createServer();
const wss = new ws_1.WebSocketServer({ server });
const userSockets = new Map();
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
                const { sharedBy } = msg;
                // Broadcast to all users in the same group
                userSockets.forEach((socket, username) => {
                    if (username !== sharedBy) {
                        socket.send(JSON.stringify({
                            type: "new_url_shared",
                            sharedBy,
                        }));
                    }
                });
            }
        }
        catch (e) {
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
