// routes/service.js
require('dotenv').config();
const express = require("express");
const { isSeller, isAuthenticated, isAdmin } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const router = express.Router();
const Service = require("../model/services");
const Shop = require("../model/shop");
const ErrorHandler = require("../utils/ErrorHandler");
const Booking = require("../model/bookings");
const  { createServiceValidationSchema, updateServiceValidationSchema } = require("../utils/serviceValidation");
const mongoose = require('mongoose');

// Create service
router.post(
  "/create-service",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { error } = createServiceValidationSchema.validate(req.body);
      if (error) {
        return next(new ErrorHandler(error.details[0].message, 400));
      }
      const shopId = req.body.shopId;
      const shop = await Shop.findById(shopId);
      if (!shop) {
        return next(new ErrorHandler("Shop Id is invalid!", 400));
      }

      const serviceData = req.body;
      serviceData.shop = shop;
   

      const service = await Service.create(serviceData);

      res.status(201).json({
        success: true,
        service,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);


// Get all services of a shop
router.get(
  "/get-all-services-shop/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const services = await Service.find({ shopId: req.params.id }); // assuming `shop` is the reference to the Shop model


      const transformedServices = services.map(service => ({
        ...service.toObject(),
        availability: Object.fromEntries(service.availability) // Convert Map to object
      }));
      res.status(200).json({
        success: true,
        services,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// Get all services
router.get(
  "/get-all-services",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const services = await Service.find().sort({ createdAt: -1 });

      const transformedServices = services.map(service => ({
        ...service.toObject(),
        availability: Object.fromEntries(service.availability) // Convert Map to object
      }));

      res.status(200).json({
        success: true,
        services: transformedServices,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);
// delete service of a shop
router.delete(
  "/delete-shop-service/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const serviceId = req.params.id;

      // Find the service by ID and delete it
      const service = await Service.findByIdAndDelete(serviceId);

      if (!service) {
        return next(new ErrorHandler("Service not found with this id!", 500));
      }
      await Booking.deleteMany({ serviceId: serviceId });



      res.status(201).json({
        success: true,
        message: "Service and related bookings deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// Update service
router.put(
  "/update-service/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      
      
      const serviceId = req.params.id.trim();


    

      const { error } = updateServiceValidationSchema.validate(req.body);
      if (error) {
         console.error("Validation error:", error.details); //
        return next(new ErrorHandler(error.details[0].message, 400));
      }

      const serviceData = req.body;

      // Find the service by ID
      const service = await Service.findById(serviceId);
      if (!service) {
        return next(new ErrorHandler("Service not found!", 404));
      }

      // Ensure that the shop field remains unchanged if not explicitly provided
      if (!serviceData.shop) {
        serviceData.shop = service.shop;  
      }

      // Update service fields
      await Service.findByIdAndUpdate(serviceId, serviceData, { new: true });

      res.status(200).json({
        success: true,
        message: "Service updated successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  })
);



module.exports = router;
