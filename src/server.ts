import dotenv from "dotenv";
import http from "http";
import { connectToDatabase } from "./config/db";
import app from "./app";

dotenv.config();

const PORT = Number(process.env.PORT || 3000);

export const startServer = async ():Promise<void> => {
    await connectToDatabase();
    const server = http.createServer(app);
    server.listen(PORT, ()=>{
        console.log(`Sever is lisetning on ${PORT}`);
    })
}


startServer().catch((error)=>{
    console.error("Error while starting the server:", error);
    process.exit(1);
})