import express, { json, Request, Response } from "express";
import cors from "cors";
const app = express();

app.use(cors());
app.use(json());

app.post("/create",(req:Request, res:Response)=>{

})

app.listen(3000,()=>{
    console.log("https server is runing on the port 3000");
})