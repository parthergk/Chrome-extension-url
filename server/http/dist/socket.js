"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userSockets = exports.initSocket = void 0;
const userSockets = new Map();
exports.userSockets = userSockets;
const initSocket = (io) => {
    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);
        socket.on("register", (username) => {
            userSockets.set(username, socket.id);
            console.log(`Registered: ${username}`);
        });
        socket.on("disconnect", () => {
            for (const [user, id] of userSockets.entries()) {
                if (id === socket.id) {
                    userSockets.delete(user);
                    console.log(`User disconnected: ${user}`);
                    break;
                }
            }
        });
    });
};
exports.initSocket = initSocket;
