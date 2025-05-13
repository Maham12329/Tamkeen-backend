// controller/wholesaleMarket.js
require('dotenv').config();
const express = require("express");
const { isAuthenticated, isAdmin } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const router = express.Router();
const WholesaleMarket = require("../model/wholesaleMarket"); 
const ErrorHandler = require("../utils/ErrorHandler");

// Create a wholesale market
router.post(
  "/create-wholesale-market",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { supplierName, materialType, location, contactInfo } = req.body;

      // Validate required fields
      if (!supplierName || !materialType || !location) {
        return next(new ErrorHandler("Supplier name, material type, and location are required.", 400));
      }

      // Validate materialType is an array and not empty
      if (!Array.isArray(materialType) || materialType.length === 0) {
        return next(new ErrorHandler("At least one material type is required.", 400));
      }

      // Validate contactInfo if provided
      if (contactInfo) {
        if (!/^0[3][0-5]\d{8}$/.test(contactInfo)) {
          return next(new ErrorHandler("Invalid contact number format. Must be a valid Pakistani mobile number.", 400));
        }
      }

      // Create the wholesale market
      const wholesaleMarket = await WholesaleMarket.create({
        supplierName,
        materialType,
        location,
        ...(contactInfo && { contactInfo })
      });

      res.status(201).json({
        success: true,
        wholesaleMarket,
      });
    } catch (error) {
      console.error("Error creating wholesale market:", error);
      return next(new ErrorHandler(error.message || "Failed to create wholesale market. Please try again.", 500));
    }
  })
);

// Update the update route as well
router.put(
  "/update-wholesale-market/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const wholesaleMarketId = req.params.id;
      const { supplierName, materialType, location, contactInfo } = req.body;

      // Validate materialType if provided
      if (materialType && (!Array.isArray(materialType) || materialType.length === 0)) {
        return next(new ErrorHandler("At least one material type is required.", 400));
      }

      // Validate contactInfo if provided
      if (contactInfo && !/^0[3][0-5]\d{8}$/.test(contactInfo)) {
        return next(new ErrorHandler("Invalid contact number format. Must be a valid Pakistani mobile number.", 400));
      }

      const updateData = {
        ...(supplierName && { supplierName }),
        ...(materialType && { materialType }),
        ...(location && { location }),
        ...(contactInfo && { contactInfo })
      };

      const wholesaleMarket = await WholesaleMarket.findByIdAndUpdate(
        wholesaleMarketId, 
        updateData,
        { new: true, runValidators: true }
      );

      if (!wholesaleMarket) {
        return next(new ErrorHandler("Wholesale market not found!", 404));
      }

      res.status(200).json({
        success: true,
        wholesaleMarket,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get all wholesale markets
router.get(
  "/get-all-wholesale-markets",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const wholesaleMarkets = await WholesaleMarket.find().sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        wholesaleMarkets,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get a single wholesale market by ID
router.get(
  "/get-wholesale-market/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const wholesaleMarket = await WholesaleMarket.findById(req.params.id);
      if (!wholesaleMarket) {
        return next(new ErrorHandler("Wholesale market not found!", 404));
      }

      res.status(200).json({
        success: true,
        wholesaleMarket,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Delete a wholesale market
router.delete(
  "/delete-wholesale-market/:id",
  isAuthenticated,
  isAdmin("Admin"), // Only allow admins to delete
  catchAsyncErrors(async (req, res, next) => {
    try {
      const wholesaleMarketId = req.params.id;

      const wholesaleMarket = await WholesaleMarket.findByIdAndDelete(wholesaleMarketId);

      if (!wholesaleMarket) {
        return next(new ErrorHandler("Wholesale market not found with this id!", 404));
      }

      res.status(200).json({
        success: true,
        message: "Wholesale market deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Update a wholesale market
router.put(
  "/update-wholesale-market/:id",
  isAuthenticated,
  isAdmin("Admin"), // Only allow admins to update
  catchAsyncErrors(async (req, res, next) => {
    try {
      const wholesaleMarketId = req.params.id;
      const wholesaleMarketData = req.body;

      const wholesaleMarket = await WholesaleMarket.findByIdAndUpdate(wholesaleMarketId, wholesaleMarketData, { new: true });

      if (!wholesaleMarket) {
        return next(new ErrorHandler("Wholesale market not found!", 404));
      }

      res.status(200).json({
        success: true,
        wholesaleMarket,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
