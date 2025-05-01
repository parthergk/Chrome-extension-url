import express, { json, Request, Response } from "express";
import cors from "cors";
import { z } from "zod";
const app = express();

app.use(cors());
app.use(json());

app.post("/groups/create",(req:Request, res:Response)=>{

});

app.post("/groups/join", (req:Request, res:Response)=>{

});

app.post("/groups/share", (req:Request, res:Response)=>{

});


app.get("/groups/:id", (req:Request, res:Response)=>{

});

app.post("/user/groups/:userId", (req:Request, res:Response)=>{

})

app.listen(3000,()=>{
    console.log("https server is runing on the port 3000");
})