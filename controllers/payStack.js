import { sql } from "../config/db.js";
import dotenv from "dotenv";
import Paystack from "paystack-api";

dotenv.config();
const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);

export const payment = async (req, res) => {
    const { firstname, lastname, phone, address, email, amount, deliverynote, state } = req.body;

    if (!firstname || !lastname || !phone || !amount || !address || !email || !deliverynote || !state) {
        return res.status(400).json({ success: false, message: "all fields are required" });
    }

    try {
        // Convert amount to kobo (multiply by 100 for NGN)
        const amountInKobo = Math.round(parseFloat(amount) * 100);

        // Create a transaction on Paystack
        const response = await paystack.transaction.initialize({
            email,
            amount: amountInKobo,
            currency: 'NGN',
            callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
            metadata: {
                firstname,
                lastname,
                phone,
                address,
                deliverynote,
                state
            }
        });

        // Store transaction with Paystack reference
        const newTransaction = await sql`
        INSERT INTO transactions (
            firstname, lastname, phone, amount, email, address, 
            deliverynote, state, paystack_reference, status
        )
        VALUES (
            ${firstname}, ${lastname}, ${phone}, ${amount}, ${email}, 
            ${address}, ${deliverynote}, ${state}, ${response.data.reference}, 'pending'
        )
        RETURNING *
        `;

        console.log("Transaction initialized: ", newTransaction);

        res.status(201).json({ 
            success: true, 
            data: {
                transaction: newTransaction[0],
                authorization_url: response.data.authorization_url,
                access_code: response.data.access_code,
                reference: response.data.reference
            }
        });
    } catch (error) {
        console.log(`Error in payment function: ${error}`);
        res.status(500).json({ 
            success: false, 
            message: `Error in payment function: Internal server error - ${error.message}` 
        });
    }
};

// Add webhook handler for payment verification
export const verifyPayment = async (req, res) => {
    try {
        const { reference } = req.params;
        
        // Verify transaction with Paystack
        const response = await paystack.transaction.verify(reference);
        
        if (response.data.status === 'success') {
            // Update transaction status in database
            const updatedTransaction = await sql`
            UPDATE transaction 
            SET status = 'completed', updated_at = NOW()
            WHERE paystack_reference = ${reference}
            RETURNING *
            `;
            
            res.status(200).json({
                success: true,
                message: 'Payment verified successfully',
                data: updatedTransaction[0]
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }
    } catch (error) {
        console.log(`Error in payment verification: ${error}`);
        res.status(500).json({
            success: false,
            message: `Payment verification error: ${error.message}`
        });
    }
};