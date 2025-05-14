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

      // HTML styled email based on the order.js template
      const htmlMessage = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #faf7f7; color: #5a4336;">
  <!-- Header with logo area and gradient background -->
  <div style="background-image: linear-gradient(135deg, #c8a4a5 0%, #d48c8f 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px; text-shadow: 1px 1px 2px rgba(0,0,0,0.1);">New Booking Notification</h1>
  </div>
  
  <!-- Main content area with card gradient effect -->
  <div style="padding: 35px 25px; border-left: 1px solid #e6d8d8; border-right: 1px solid #e6d8d8; border-bottom: 1px solid #e6d8d8; background-image: linear-gradient(to bottom, #ffffff, #f5f0f0); border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <h2 style="color: #c8a4a5; margin-top: 0; font-size: 24px;">New Service Booking!</h2>
    
    <p style="font-size: 16px; line-height: 1.6; color: #5a4336;">Hello <strong>${shop.name}</strong>,</p>
    
    <p style="font-size: 16px; line-height: 1.6; color: #5a4336;">You've received a new booking for your service. Here are the details:</p>
    
    <!-- Booking details section -->
    <div style="margin: 30px 0; padding: 25px; border-radius: 8px; background-image: linear-gradient(to right, #f5f0f0, #e6d8d8);">
      <h3 style="color: #c8a4a5; margin-top: 0; font-size: 20px;">Booking Summary</h3>
      
      <div style="background-color: #ffffff; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
        <h4 style="color: #5a4336; margin-top: 0; font-size: 18px; border-bottom: 1px solid #e6d8d8; padding-bottom: 10px;">Service Details:</h4>
        <div style="font-size: 15px; line-height: 1.5; color: #5a4336;">
          <p style="margin: 5px 0;"><strong>Service Name:</strong> ${service.name}</p>
          <p style="margin: 5px 0;"><strong>Booked Dates:</strong> ${dates.join(", ")}</p>
          <p style="margin: 5px 0;"><strong>User ID:</strong> ${userId}</p>
        </div>
      </div>
    </div>
    
    <!-- Action needed section -->
    <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #c8a4a5;">
      <h3 style="color: #c8a4a5; margin-top: 0; font-size: 20px;">Action Required</h3>
      <p style="font-size: 16px; line-height: 1.5; color: #5a4336; margin-bottom: 5px;">
        Please review this booking in your dashboard and confirm or update its status as needed.
      </p>
    </div>
    
    <p style="font-size: 16px; line-height: 1.6; color: #5a4336;">If you have any questions about this booking, please contact our support team.</p>

    <!-- Next steps section -->
    <div style="margin: 30px 0; padding: 20px; border-radius: 6px; background-color: #f5f0f0; border-left: 4px solid #d48c8f;">
      <h3 style="color: #c8a4a5; margin-top: 0; font-size: 18px;">What's Next?</h3>
      <ul style="font-size: 16px; line-height: 1.6; color: #5a4336; padding-left: 20px;">
        <li>Log in to your dashboard to confirm this booking</li>
        <li>Contact the customer if you need additional information</li>
        <li>Update the booking status when the service is completed</li>
      </ul>
    </div>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e6d8d8; text-align: center;">
      <p style="font-size: 14px; color: #b38d82; margin-bottom: 5px;">Thank you for providing your services on our platform!</p>
      <p style="font-size: 16px; font-weight: bold; color: #c8a4a5; margin-top: 0;">We appreciate your business</p>
    </div>
  </div>
  
  <!-- Footer area with soft gradient -->
  <div style="background-image: linear-gradient(to right, #e6d8d8, #c8a4a5); padding: 20px; text-align: center; font-size: 14px; color: #ffffff; border-radius: 0 0 8px 8px; box-shadow: 0 -2px 5px rgba(0,0,0,0.03);">
    <p style="margin: 0 0 10px 0;">© ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
    <p style="margin: 0;">This email notifies you of a new booking on your services.</p>
  </div>
</body>
</html>`;

      try {
        await sendMail({
          email: shop.email,
          subject: `New Booking for Your Service - ${service.name}`,
          message: sellerMessage,
          html: htmlMessage
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
