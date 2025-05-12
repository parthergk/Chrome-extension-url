import express from "express";
import cors from "cors";
import groupRoutes from "./routes/groupRoutes";
import { connectToDB } from "./db/connection";
import dotenv from "dotenv";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/groups",groupRoutes);

connectToDB()
  .then(() => {
    app.listen(3000, () => console.log("Server is running on port 3000"));
  })
  .catch((err) => console.error("Connection failed", err));
