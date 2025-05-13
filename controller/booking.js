const express = require("express");
const { isAuthenticated } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const Booking = require("../model/bookings");
const Service = require("../model/services");
const Shop = require("../model/shop");
const router = express.Router();
const sendMail = require('../utils/sendMail');
// Create a new booking
router.post(
  "/create-booking",

  catchAsyncErrors(async (req, res, next) => {
    const { serviceId, userId,dates } = req.body;
   
    
console.log(userId);
    // Find the service
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    const sellerId = service.shopId;

    // Create booking
    const booking = await Booking.create({
      serviceId,
      sellerId,
      userId,
      dates,
    });
 // Notify the seller via email
 const shop = await Shop.findById(sellerId); // Fetch the shop details
 if (shop && shop.email) {
   const sellerMessage = `
     Dear ${shop.name},
     
     A new booking has been made for your service:
     - Service Name: ${service.name}
     - Dates: ${dates.join(", ")} (if multiple dates are supported)
     - Booked By User ID: ${userId}
     
     Please review the booking in your dashboard and take necessary actions.
     
     Best regards,
     Your Team
   `;

   try {
     await sendMail({
       email: shop.email,
       subject: `New Booking for Your Service - ${service.name}`,
       message: sellerMessage,
     });
     console.log(`Notification email sent to seller: ${shop.email}`);
   } catch (error) {
     console.error(`Error sending notification email to seller: ${error.message}`);
   }
 } else {
   console.warn(`No email defined for the seller's shop with ID: ${sellerId}`);
 }
    res.status(201).json({
      success: true,
      booking,
    });
  })
);

// Get all bookings for a seller
router.get(
  "/seller-bookings/:sellerId",

  catchAsyncErrors(async (req, res, next) => {
    const { sellerId } = req.params;
    const bookings = await Booking.find({ sellerId }).populate("serviceId userId");
    res.status(200).json({ success: true, bookings });
  })
);
// Get all bookings for a user
router.get(
  "/user-bookings/:userId",
  
  catchAsyncErrors(async (req, res, next) => {
    const { userId } = req.params;
    const bookings = await Booking.find({ userId }).populate("serviceId sellerId");
    res.status(200).json({ success: true, bookings });
  })
);
// Update booking status to 'confirmed'
router.put(
  "/confirm-booking/:bookingId",
 // Seller should be authenticated
  catchAsyncErrors(async (req, res, next) => {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Ensure only the seller of the service can confirm the booking
   

    

    // Update booking status to confirmed
    booking.status = "confirmed";
    await booking.save();

    res.status(200).json({ success: true, message: "Booking confirmed successfully", booking });
  })
);


module.exports = router;
