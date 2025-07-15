
import {
  createDonation,
  verifyDonation,
  getDonationByReference,
  getAllDonations,
  getDonationStats,
  handlePaystackWebhook
} from "../controllers/donationController.js";

const router = express.Router();

// Create a new donation and initialize Paystack transaction
router.post("/makeDonation", createDonation);

// Verify donation payment status
router.get("/verify/:reference", verifyDonation);

// Get donation by Paystack reference
router.get("/reference/:reference", getDonationByReference);

// Get all donations with pagination and filters
router.get("/", getAllDonations);

// Get donation statistics
router.get("/stats", getDonationStats);

// Paystack webhook endpoint
router.post("/webhook", handlePaystackWebhook);

export default router;import express from "express";