import { sql } from "../config/db.js";
import dotenv from "dotenv";
import Paystack from "paystack-api";
import crypto from "crypto";

dotenv.config();
const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);

// Create donation and initialize Paystack transaction
export const createDonation = async (req, res) => {
  try {
    const {
      full_name,
      email,
      phone_number,
      country,
      state_province,
      city,
      in_memory_of = false,
      memory_person_name,
      is_anonymous = false,
      amount
    } = req.body;

    // Validate required fields
    if (!full_name || !email || !phone_number || !country || !amount) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, phone number, country, and amount are required"
      });
    }

    // Validate amount (convert to kobo for Paystack)
    const donationAmount = parseFloat(amount);
    if (donationAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0"
      });
    }

    const amountInKobo = Math.round(donationAmount * 100);
    if (amountInKobo < 100) {
      return res.status(400).json({
        success: false,
        message: "Minimum donation amount is ₦1.00"
      });
    }

    // Validate memory donation fields
    if (in_memory_of && !memory_person_name) {
      return res.status(400).json({
        success: false,
        message: "Memory person name is required when donating in memory of someone"
      });
    }

    // Initialize Paystack transaction
    const paystackData = {
      email: email,
      amount: amountInKobo,
      currency: 'NGN',
      callback_url: process.env.PAYSTACK_CALLBACK_URL,
      metadata: {
        full_name,
        phone_number,
        country,
        state_province,
        city,
        in_memory_of,
        memory_person_name,
        is_anonymous,
        transaction_type: 'donation'
      }
    };

    const response = await paystack.transaction.initialize(paystackData);

    if (!response.status) {
      return res.status(400).json({
        success: false,
        message: "Failed to initialize payment",
        error: response.message
      });
    }

    // Store donation with Paystack reference
    const newDonation = await sql`
      INSERT INTO donate (
        full_name,
        email,
        phone_number,
        country,
        state_province,
        city,
        in_memory_of,
        memory_person_name,
        is_anonymous,
        amount,
        paystack_reference,
        status
      )
      VALUES (
        ${full_name},
        ${email},
        ${phone_number},
        ${country},
        ${state_province || null},
        ${city || null},
        ${in_memory_of},
        ${memory_person_name || null},
        ${is_anonymous},
        ${donationAmount},
        ${response.data.reference},
        'pending'
      )
      RETURNING *
    `;

    res.status(201).json({
      success: true,
      message: "Donation created successfully",
      data: {
        donation: newDonation[0],
        payment_url: response.data.authorization_url,
        reference: response.data.reference
      }
    });

  } catch (error) {
    console.error("Error creating donation:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Verify Paystack transaction
export const verifyDonation = async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: "Transaction reference is required"
      });
    }

    // Verify transaction with Paystack
    const response = await paystack.transaction.verify(reference);

    if (!response.status) {
      return res.status(400).json({
        success: false,
        message: "Failed to verify transaction",
        error: response.message
      });
    }

    // Map Paystack status to our donation status
    let donationStatus = 'pending';
    if (response.data.status === 'success') {
      donationStatus = 'completed';
    } else if (response.data.status === 'failed') {
      donationStatus = 'failed';
    } else if (response.data.status === 'abandoned') {
      donationStatus = 'cancelled';
    }

    // Update donation status in database
    const updatedDonation = await sql`
      UPDATE donations 
      SET 
        status = ${donationStatus},
        updated_at = CURRENT_TIMESTAMP
      WHERE paystack_reference = ${reference}
      RETURNING *
    `;

    if (updatedDonation.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Donation not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Donation verified successfully",
      data: {
        donation: updatedDonation[0],
        paystack_data: response.data
      }
    });

  } catch (error) {
    console.error("Error verifying donation:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get donation by reference
export const getDonationByReference = async (req, res) => {
  try {
    const { reference } = req.params;

    const donation = await sql`
      SELECT * FROM donations 
      WHERE paystack_reference = ${reference}
    `;

    if (donation.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Donation not found"
      });
    }

    res.status(200).json({
      success: true,
      data: donation[0]
    });

  } catch (error) {
    console.error("Error fetching donation:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get all donations (with pagination and filters)
export const getAllDonations = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      country, 
      in_memory_of, 
      is_anonymous 
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build dynamic query conditions
    let whereConditions = [];
    let queryParams = [];

    if (status) {
      whereConditions.push(`status = $${queryParams.length + 1}`);
      queryParams.push(status);
    }

    if (country) {
      whereConditions.push(`country = $${queryParams.length + 1}`);
      queryParams.push(country);
    }

    if (in_memory_of !== undefined) {
      whereConditions.push(`in_memory_of = $${queryParams.length + 1}`);
      queryParams.push(in_memory_of === 'true');
    }

    if (is_anonymous !== undefined) {
      whereConditions.push(`is_anonymous = $${queryParams.length + 1}`);
      queryParams.push(is_anonymous === 'true');
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    const donations = await sql`
      SELECT * FROM donations 
      ${whereClause ? sql.unsafe(whereClause) : sql``}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const totalCount = await sql`
      SELECT COUNT(*) as count FROM donations
      ${whereClause ? sql.unsafe(whereClause) : sql``}
    `;

    res.status(200).json({
      success: true,
      data: donations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(totalCount[0].count),
        pages: Math.ceil(totalCount[0].count / limit)
      }
    });

  } catch (error) {
    console.error("Error fetching donations:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get donation statistics
export const getDonationStats = async (req, res) => {
  try {
    const stats = await sql`
      SELECT 
        COUNT(*) as total_donations,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_donations,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_donations,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_donations,
        COUNT(CASE WHEN in_memory_of = true THEN 1 END) as memory_donations,
        COUNT(CASE WHEN is_anonymous = true THEN 1 END) as anonymous_donations
      FROM donations
    `;

    res.status(200).json({
      success: true,
      data: stats[0]
    });

  } catch (error) {
    console.error("Error fetching donation stats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Paystack webhook handler
export const handlePaystackWebhook = async (req, res) => {
  try {
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(400).json({
        success: false,
        message: "Invalid signature"
      });
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      const { reference, status } = event.data;

      // Map Paystack status to our donation status
      let donationStatus = 'pending';
      if (status === 'success') {
        donationStatus = 'completed';
      } else if (status === 'failed') {
        donationStatus = 'failed';
      } else if (status === 'abandoned') {
        donationStatus = 'cancelled';
      }

      // Update donation status
      await sql`
        UPDATE donations 
        SET 
          status = ${donationStatus},
          updated_at = CURRENT_TIMESTAMP
        WHERE paystack_reference = ${reference}
      `;

      console.log(`Donation ${reference} updated to ${donationStatus}`);
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({
      success: false,
      message: "Webhook processing failed"
    });
  }
};