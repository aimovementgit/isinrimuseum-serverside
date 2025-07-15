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
import gelleryRouter from "./routes/galleryRoute.js"
import paymentRouter from "./routes/paymentRoute.js"
import exhibitionRouter from "./routes/exhibitionRoute.js"
import donationRouter from "./routes/donationRoute.js"
import traineeRouter from "./routes/trainingRoute.js"
//import { aj } from "./lib/arcjet.js"


import { sql } from "./config/db.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.resolve();

// Fix the allowed origins (remove trailing slashes)
const allowedOrigins = [
    'http://localhost:3001',
    'https://isinrimuseum-serverside.onrender.com',
    'https://isinrimuseum.org',
    'http://localhost:5173',
    'https://kachi-james-initiative-training.vercel.app'
];

// Implement a more robust CORS configuration
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(cookieParser());
//app.use(cors({origin: allowedOrigins, credentials: true}));

// middleware - helmet is a security middleare that helps protect your app by setting various HTTP headers
app.use(helmet());

//Morgan logs your request to the console
app.use(morgan("dev"));

// apply arcjet rate-limit to all routes
// app.use(async (req, res, next) => {
//     try {
//         const decision = await aj.protect(req, {
//             requested: 1 //specifies that each request consumes 1 token
//         });

//         if (decision.isDenied()) {
//             if (decision.isRateLimit) {
//                 res.status(429).json({ error: "Too Many Requests, Try Again Later" });
//             } else if (decision.reason.isBot()) {
//                 res.status(403).json({ error: " Bot access denied" });
//             } else {
//                 res.status(403).json({ error: "Forbidden" })
//             }
//             return
//         }
//         //check for spoofed bots
//         if (decision.results.some((result) => result.reason.isBot() && result.reason.isSpoofed())) {
//             res.status(403).json({ error: "Spoofed bot detected" });
//             return
//         }

//         next()

//     } catch (error) {
//         console.log("Arcjet error", error)
//         next(error)
//     }
// });

app.use("/api/products", productsRoutes);
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/gellery", gelleryRouter);
app.use("/api/exhibition", exhibitionRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/donation", donationRouter);
app.use("/api/training", traineeRouter);

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

        await sql`
        CREATE TABLE IF NOT EXISTS gallery (
            id SERIAL PRIMARY KEY,
            name VARCHAR(225) NOT NULL UNIQUE,
            price DECIMAL(10, 2) NOT NULL,
            featuredimage VARCHAR(225) NOT NULL,
            description VARCHAR(225) NOT NULL,
            yearcollected INTEGER NOT NULL DEFAULT 0,
            artist VARCHAR(225) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        `;
        await sql`
    CREATE TABLE IF NOT EXISTS exhibition (
        id SERIAL PRIMARY KEY,
        featuredimage VARCHAR(1000) NOT NULL,
        title VARCHAR(255) NOT NULL UNIQUE,
        description TEXT NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        exhibition_date DATE NOT NULL,
        phonenumber VARCHAR(20) NOT NULL,
        photo1 VARCHAR(1000),
        photo2 VARCHAR(1000),
        photo3 VARCHAR(1000),
        photo4 VARCHAR(1000),
        location VARCHAR(500) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `;

        await sql`
    CREATE TABLE IF NOT EXISTS donate (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone_number VARCHAR(20) NOT NULL,
      country VARCHAR(100) NOT NULL,
      state_province VARCHAR(100),
      city VARCHAR(100),
      in_memory_of BOOLEAN NOT NULL DEFAULT FALSE,
      memory_person_name VARCHAR(255),
      is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
      amount DECIMAL(10, 2),
      paystack_reference VARCHAR(255) UNIQUE,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT chk_donation_status CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
      CONSTRAINT chk_donation_amount CHECK (amount >= 0)
    )
  `;



        await sql`
    CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        firstname VARCHAR(255) NOT NULL,
        lastname VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        address TEXT NOT NULL,
        deliverynote TEXT,
        state VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        paystack_reference VARCHAR(255) UNIQUE,
        status VARCHAR(20) DEFAULT 'pending',
        currency VARCHAR(3) DEFAULT 'NGN',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT chk_status CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
        CONSTRAINT chk_amount CHECK (amount > 0)
    )
     `;

     await sql`
    CREATE TABLE IF NOT EXISTS trainingform (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(225) NOT NULL,
        last_name VARCHAR(225) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone_number VARCHAR(20) NOT NULL,
        date_of_birth DATE,
        gender VARCHAR(10),
        country_of_origin VARCHAR(100) NOT NULL,
        state_of_origin VARCHAR(100) NOT NULL,
        local_government_area VARCHAR(100) NOT NULL,
        address TEXT NOT NULL,
        highest_level_of_education VARCHAR(100) NOT NULL,
        field_of_study VARCHAR(100),
        institution_name VARCHAR(100),
        graduation_year INTEGER,
        employment_status VARCHAR(50) NOT NULL,
        years_of_experience VARCHAR(20),
        job_title VARCHAR(100),
        company_name VARCHAR(100),
        preferred_training_track VARCHAR(100) NOT NULL,
        training_mode VARCHAR(50) NOT NULL,
        preferred_start_date DATE,
        training_duration_preference VARCHAR(50),
        programming_languages TEXT[],
        frameworks_and_technologies TEXT[],
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