"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const groupRoutes_1 = __importDefault(require("./routes/groupRoutes"));
const connection_1 = require("./db/connection");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/api/groups", groupRoutes_1.default);
(0, connection_1.connectToDB)()
    .then(() => {
    app.listen(3000, () => console.log("Server is running on port 3000"));
})
    .catch((err) => console.error("Connection failed", err));
