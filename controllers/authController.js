import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sql } from "../config/db.js";
import transporter from "../config/nodemailer.js";
import { EMAIL_VERIFY_TEMPLATE, PASSWORD_RESET_TEMPLATE } from "../config/EmailTemplate.js";
import { text } from "express";
// import { json } from "express";
// import { text } from "stream/consumers";

export const register = async (req, res) => {
    const { name, email, password, accountType } = req.body;

    if (!name || !email || !password || !accountType) {
        return res.json({ success: false, message: "All fields are required" });
    }

    try {
        //check if user already exists
        const existingUser = await sql`
        SELECT * FROM users WHERE email=${email}
        `;
        if (existingUser.length > 0) {
            return res.json({ success: false, message: "User already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await sql`
        INSERT INTO users (name, email, password, accountType)
        VALUES (${name}, ${email}, ${hashedPassword}, ${accountType})
        RETURNING *
        `
        console.log("new user", newUser)
        const token = jwt.sign({ id: newUser[0].id }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: "Welcome to Isi Nri Museum",
            html: `<h1>Welcome to Isi Nri Museum Web App,</h1> <p>your account has been created with email id: ${email}</p>`,
        }

        await transporter.sendMail(mailOptions);

        return res.json({ success: true, message: "User registered successfully" });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

export const login = async (req, res) => {
    const { email, password, accountType } = req.body;

    // console.log("Login request body:", req.body);
    // console.log("Extracted values:", { email, password, accountType });

    if (!email || !password || !accountType) {
        return res.json({ success: false, message: "All fields are required " });
    }

    try {
        // Retrieve user with the provided email
        const user = await sql`
            SELECT * FROM users WHERE email=${email}
        `;

        // Check if user exists
        if (user.length === 0) {
            return res.json({ success: false, message: "User not found" });
        }

        // Validate account type
        if (user[0].accounttype !== accountType) {
            return res.json({ success: false, message: "Invalid account type" });
        }

        // Compare provided password with stored hashed password
        const isMatch = await bcrypt.compare(password, user[0].password);

        if (!isMatch) {
            return res.json({ success: false, message: "Invalid password" });
        }

        // Generate JWT token
        const token = jwt.sign({ id: user[0].id }, process.env.JWT_SECRET, { expiresIn: "7d" });

        // Set cookie with token
        // res.cookie("token", token, {
        //     httpOnly: true,
        //     secure: process.env.NODE_ENV === "production",
        //     sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        //     maxAge: 7 * 24 * 60 * 60 * 1000
        // });
        
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            domain: process.env.COOKIE_DOMAIN, // Add this if needed
            path: "/",  // Ensure cookie is available across your site
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        

        return res.json({ success: true, message: "Login successful" });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
}

export const logout = (req, res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        });

        return res.json({ success: true, message: "Logout successful" });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
}

// send verification otp to user email
// send verification otp to user email
export const sendVerifyOtp = async (req, res) => {
    try {
        // Extract token from cookies
        const token = req.cookies.token;
        
        if (!token) {
            return res.json({ success: false, message: "Authentication required" });
        }
        
        // Verify and decode the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user ID from decoded token
        const userId = decoded.id;
        
        // Fetch user details from database using the ID from token
        const userResult = await sql`
            SELECT * FROM users WHERE id=${userId}
        `;
        
        if (userResult.length === 0) {
            return res.json({ success: false, message: "User not found" });
        }
        
        const user = userResult[0];
        const email = user.email;
        
        // Check if account is already verified
        if (user.isaccountverified) {
            return res.json({ success: false, message: "Account already verified" });
        }

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiryDate = Date.now() + 24 * 60 * 60 * 1000;

        // Update user with new OTP
        const result = await sql`
        UPDATE users 
        SET verifyotp = ${otp}, 
            verifyotpexpireat = ${expiryDate}
        WHERE id = ${userId}
        RETURNING *
        `;

        // Prepare email
        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: "Account Verification OTP",
            // text: `Your OTP is ${otp}. Verify your account using this OTP.`,
            html: EMAIL_VERIFY_TEMPLATE.replace('{{otp}}', otp).replace('{{email}}', email)
        };

        // Log email sending attempt for debugging
        console.log(`Attempting to send verification email to: ${email}`);
        
        // Send the email
        const info = await transporter.sendMail(mailOptions);
        console.log("Verification email sent successfully:", info.response);
        
        return res.json({ 
            success: true, 
            message: "OTP sent successfully on your email",
            userId: userId // Include userId in response for the frontend
        });
    } catch (error) {
        console.error("Error sending verification OTP:", error);
        
        // Handle token verification errors specifically
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.json({ success: false, message: "Authentication failed. Please login again." });
        }
        
        res.json({ success: false, message: error.message });
    }
}


export const verifyEmail = async (req, res) => {
    const { id, otp } = req.body;

    if (!id || !otp) {
        console.warn("Missing details in verifyEmail request:", { id, otp });
        return res.json({ success: false, message: "Missing Details" });
    }

    try {
        // Get user details
        const userResult = await sql`
            SELECT * FROM users WHERE Id=${id}
        `;

        if (userResult.length === 0) {
            console.warn(`User not found for verification. ID: ${id}`);
            return res.json({ success: false, message: "User not found" });
        }

        const user = userResult[0];

        // Get the stored OTP
        const verifyOtpResult = await sql`
            SELECT verifyOtp FROM users WHERE Id=${id}
        `;

        // Extract the actual OTP value from the result
        const storedOtp = verifyOtpResult[0]?.verifyotp;

        // Check if OTP is empty or doesn't match
        if (!storedOtp || storedOtp === '' || storedOtp !== otp) {
            console.warn(`OTP verification failed for user ID ${id}. Provided: ${otp}, Stored: ${storedOtp}`);
            return res.json({ success: false, message: "Invalid OTP" });
        }

        // Check if OTP has expired
        if (user.verifyOtpExpireAt < Date.now()) {
            console.warn(`OTP expired for user ID ${id}. Expiry: ${new Date(user.verifyOtpExpireAt)}, Current: ${new Date()}`);
            return res.json({ success: false, message: "OTP expired" });
        }

        // Update user as verified
        const result = await sql`
            UPDATE users 
            SET isAccountVerified = ${true}, 
                verifyOtp = ${''}, 
                verifyOtpExpireAt = ${0}
            WHERE id = ${id}
            RETURNING *
        `;

        console.log(`User ID ${id} successfully verified their account`);
        return res.json({ success: true, message: "Account verified successfully" });

    } catch (error) {
        console.error(`Error in verifyEmail for user ID ${id}:`, error);
        return res.json({ success: false, message: error.message });
    }
}

//check if user authenticated
export const isAuthenticated = async (req, res) => {
    try {
        return res.json({ success: true, message: "User is authenticated" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

//send password reset otp
export const sendResetOtp = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.json({ success: false, message: "Email is required" });
    }

    try {
        const user = await sql`
        SELECT * FROM users WHERE email=${email}
        `;

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiryDate = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
        //const expiryDate = Date.now() + 15 * 60 * 1000;

        const result = await sql`
        UPDATE users 
        SET resetotp = ${otp}, 
            resetotpexpireat = ${expiryDate}
        WHERE email = ${email}
        RETURNING *
        `;

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: "Isi Nri Musuem Password Reset OTP",
            //text: `your OTP for resetting your password is  ${otp}, use this to proceed with resetting your password.`
            html: PASSWORD_RESET_TEMPLATE.replace('{{otp}}', otp).replace('{{email}}', email)
        }
        await transporter.sendMail(mailOptions);
        return res.json({ success: true, message: "Password reset OTP sent successfully on your email" });

    } catch (error) {
        res.json({ success: false, message: error.message });

    }
}

// Reset user password 
export const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        return res.json({ success: false, message: "Email, OTP, and NewPassword are required" });
    }

    try {

        const user = await sql`
        SELECT * FROM users WHERE email=${email}
        `
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        // Get the stored OTP
        const resetOtpResult = await sql`
                SELECT resetotp FROM users WHERE Email=${email}
            `;

        // Extract the actual OTP value from the result
        const storedRestOtp = resetOtpResult[0]?.resetotp;

        // Check if OTP is empty or doesn't match
        if (storedRestOtp !== otp || storedRestOtp === '') {
            return res.json({ success: false, message: "Invalid OTP" });
        }

        if (user.resetotpexpireat < Math.floor(Date.now() / 1000)) {
            return res.json({ success: false, message: "OTP expired" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const result = await sql`
        UPDATE users 
        SET password = ${hashedPassword}, 
            resetotp = ${''},
            resetotpexpireat = ${0}

        WHERE email = ${email}
        RETURNING *
    `;
        res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
        res.json({ success: false, message: error.message });

    }
}
