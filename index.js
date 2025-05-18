import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";

import productsRoutes from "./routes/productRoutes.js";
import authRouter from "./routes/authRoute.js";
import userRouter from "./routes/userRoute.js"
//import { aj } from "./lib/arcjet.js"


import { sql } from "./config/db.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.resolve();

const allowedOrigins = ['http://localhost:3001', 'https://isinrimuseum.org/'];

app.use(express.json());
app.use(cookieParser());
app.use(cors({origin: allowedOrigins, credentials: true}));

// middleware - helmet is a security middleare that helps protect your app by setting various HTTP headers
app.use(helmet());

//Morgan logs your request to the console
app.use(morgan("dev"));

// apply arcjet rate-limit to all routes
// app.use(async (req,res,next) =>{
//     try {
//         const decision = await aj.protect(req, {
//             requested:1 //specifies that each request consumes 1 token
//         });
        
//         if(decision.isDenied()){
//             if(decision.isRateLimit ) {
//                 res.status(429).json({error: "Too Many Requests, Try Again Later"});
//             }else if(decision.reason.isBot()) {
//                 res.status(403).json({ error: " Bot access denied" });
//             }else {
//                 res.status(403).json({error: "Forbidden"})
//             }
//             return
//         }
//             //check for spoofed bots
//             if (decision.results.some((result) => result.reason.isBot() && result.reason.isSpoofed())){
//                 res.status(403).json({ error: "Spoofed bot detected" });
//                 return
//             }

//             next()
        
//     } catch (error) {
//         console.log("Arcjet error", error)
//         next(error)
//     }
// });

app.use("/api/products", productsRoutes);
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);

async function initDB() {
    try {
        await sql`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(225) NOT NULL,
            email VARCHAR(225) NOT NULL UNIQUE,
            accountType VARCHAR(225) NOT NULL,
            password VARCHAR(225) NOT NULL,
            verifyOtp VARCHAR(225) DEFAULT '',
            verifyOtpExpireAt INTEGER NOT NULL DEFAULT 0,
            isAccountVerified BOOLEAN NOT NULL DEFAULT FALSE,
            resetOtp VARCHAR(225) DEFAULT '',
            resetOtpExpireAt INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        `;
        await sql`
        CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(225) NOT NULL,
        categories VARCHAR(225) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        quantity VARCHAR(225) NOT NULL,
        featuredimage VARCHAR(225) NOT NULL,
        images1 VARCHAR(225) NOT NULL,
        images2 VARCHAR(225) NOT NULL,
        images3 VARCHAR(225) NOT NULL,
        images4 VARCHAR(225) NOT NULL,
        description VARCHAR(225) NOT NULL,
        additionalinfo VARCHAR(225) NOT NULL,
        instock VARCHAR(225) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        `;
        console.log('database created!!!')
    } catch (error) {
        console.log("Error initDB is here", error);
    }
}


initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is runing on port ${PORT}`);
    })
})