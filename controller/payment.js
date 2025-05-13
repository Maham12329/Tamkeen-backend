/**
 * Payment Routes Module
 * 
 * This module handles all payment-related routes for the application except procurement.
 * including Stripe integration for workshop certificate payments.
 */

// Load environment variables
require('dotenv').config();

// Import dependencies
const express = require("express");
const router = express.Router();
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Import models
const Workshop = require("../model/workshops");
const UserWorkshop = require("../model/userworkshop");

/**
 * Route Definitions
 */

// General payment routes
//-----------------------

/**
 * Process a generic payment through Stripe
 * @route POST /process
 */


router.post(
  "/process",
  catchAsyncErrors(async (req, res, next) => {
    const myPayment = await stripe.paymentIntents.create({
      amount: req.body.amount,
      currency: "pkr",
      metadata: {
        company: "Tamkeen",
      },
      payment_method_types: ['card']
    });
    res.status(200).json({
      success: true,
      client_secret: myPayment.client_secret,
    });
  })
);

router.get(
  "/stripeapikey",
  catchAsyncErrors(async (req, res, next) => {
    res.status(200).json({ stripeApikey: process.env.STRIPE_API_KEY });
  })
);

module.exports = router;
// Certificate payment routes
//---------------------------

/**
 * Initiate a payment for a workshop certificate
 * @route POST /initiate-certificate-payment/:workshopId
 * @param {string} workshopId - The ID of the workshop
 * @body {string} userId - The ID of the user (optional if authenticated)
 * @body {number} amount - Optional payment amount override
 */
router.post(
  "/initiate-certificate-payment/:workshopId",
  catchAsyncErrors(async (req, res, next) => {
    try {
      // Find workshop
      const workshop = await Workshop.findById(req.params.workshopId);
      if (!workshop) {
        return res.status(404).json({
          success: false,
          message: "Workshop not found"
        });
      }

      // Get userId from request body or user object
      const userId = req.body.userId || (req.user && req.user._id);
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required"
        });
      }

      // Check if certificate is already paid for
      const existingUserWorkshop = await UserWorkshop.findOne({
        userId,
        workshopId: req.params.workshopId
      });

      if (existingUserWorkshop?.paidCertificates?.get(req.params.workshopId)) {
        return res.status(200).json({
          success: true,
          paid: true,
          message: "Certificate already paid for"
        });
      }

      // Create payment intent
      const certificatePrice = workshop.certificatePrice || 500000; // Default to 5000 PKR (in paisa)
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: req.body.amount || certificatePrice,
        currency: 'pkr',
        metadata: {
          workshopId: req.params.workshopId,
          userId: userId.toString(),
          paymentType: 'certificate'
        },
        description: `${workshop.name} Certificate Payment`,
      });

      res.status(200).json({
        success: true,
        paid: false,
        client_secret: paymentIntent.client_secret,
        price: certificatePrice
      });
    } catch (error) {
      console.error("Payment initiation error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to initiate payment"
      });
    }
  })
);

/**
 * Check payment status for a workshop certificate
 * @route GET /certificate-payment-status/:workshopId
 * @param {string} workshopId - The ID of the workshop
 * @query {string} userId - The ID of the user (optional if authenticated)
 */
router.get(
  '/certificate-payment-status/:workshopId',
  catchAsyncErrors(async (req, res, next) => {
    try {
      // Get userId from query params or from authenticated user
      const userId = req.query.userId || (req.user && req.user._id);
      
      // Log for debugging
      console.log("Certificate payment status check:", {
        workshopId: req.params.workshopId,
        userId: userId,
        hasUser: !!req.user
      });
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID is required. Please log in to continue.'
        });
      }

      // Find user's workshop record
      const userWorkshop = await UserWorkshop.findOne({
        userId: userId,
        workshopId: req.params.workshopId
      });

      // Check if certificate is paid
      const paid = userWorkshop?.paidCertificates?.get(req.params.workshopId) || false;
      
      res.status(200).json({ 
        success: true,
        paid 
      });
    } catch (error) {
      console.error("Payment status check error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to check payment status"
      });
    }
  })
);

/**
 * Verify a certificate payment and update user record
 * @route POST /verify-certificate-payment/:workshopId
 * @param {string} workshopId - The ID of the workshop
 * @body {string} userId - The ID of the user
 * @body {string} paymentIntentId - Optional ID of the payment intent to verify
 */
router.post('/verify-certificate-payment/:workshopId', 
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { workshopId } = req.params;
      const { userId, paymentIntentId } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required"
        });
      }
      
      let paymentIntent;
      
      // If payment intent ID is provided, check that specific payment
      if (paymentIntentId) {
        paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        // Validate payment intent
        if (paymentIntent.status !== 'succeeded' || 
            paymentIntent.metadata.workshopId !== workshopId || 
            paymentIntent.metadata.userId !== userId.toString()) {
          return res.status(200).json({
            success: false,
            paid: false,
            message: "Invalid or unsuccessful payment"
          });
        }
      } else {
        // Otherwise search for payments
        const payments = await stripe.paymentIntents.search({
          query: `metadata['workshopId']:'${workshopId}' AND metadata['userId']:'${userId}' AND metadata['paymentType']:'certificate'`,
          limit: 1
        });

        if (payments.data.length === 0 || payments.data[0].status !== 'succeeded') {
          return res.status(200).json({
            success: false,
            paid: false,
            message: "No successful payment found"
          });
        }
        
        paymentIntent = payments.data[0];
      }

      // Update user workshop record to mark certificate as paid
      await UserWorkshop.findOneAndUpdate(
        { userId, workshopId },
        { $set: { [`paidCertificates.${workshopId}`]: true } },
        { upsert: true, new: true }
      );

      res.status(200).json({
        success: true,
        paid: true,
        paymentId: paymentIntent.id,
        message: "Payment verified successfully"
      });
    } catch (error) {
      console.error("Payment verification error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to verify payment"
      });
    }
  })
);

module.exports = router;