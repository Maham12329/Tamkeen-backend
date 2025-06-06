const express = require('express');
const router = express.Router();
const BulkOrder = require('../model/bulkoorder');
const Product = require('../model/product'); // Import the Product model
const Shop = require('../model/shop');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const { upload } = require('../middleware/multer'); // Import multer middleware for image uploads
const RFQ = require('../model/rfq'); // Import the RFQ model
const sendMail = require('../utils/sendMail');

// Create bulk order and generate RFQ
router.post("/create",upload.single("inspoPic"), catchAsyncErrors(async (req, res, next) => {
  const { userId, productName, description, quantity, category, budget, deliveryDeadline, shippingAddress, packagingRequirements, supplierLocationPreference} = req.body;

  // Check if userId is provided
  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID is required to create a bulk order.' });
  }
  const inspoPic = req.file ? req.file.filename : '';

  // Save the bulk order request
  const bulkOrder = await BulkOrder.create({
    userId,
    productName,
    description,
    quantity,
    category,
    inspoPic,
    budget,
    deliveryDeadline,
    shippingAddress,
    packagingRequirements,
    supplierLocationPreference,

  });

  // Find all products with the specified category
  const products = await Product.find({ category });

  // Extract unique shop IDs from the products
  const uniqueShopIds = [...new Set(products.map(product => product.shopId))];

  // Find all shops that match these shop IDs
  const relevantShops = await Shop.find({ _id: { $in: uniqueShopIds } });

  // Generate and send RFQ to relevant shops

   // Generate and send RFQ to relevant shops
   const rfqs = [];
   for (const shop of relevantShops) {
     console.log(`Sending RFQ to Shop: ${shop.name}`);
     
     const rfq = await RFQ.create({
       bulkOrderId: bulkOrder._id,
       shopId: shop._id,
       userId: bulkOrder.userId,
     });


  if (rfq.price !== null && rfq.price !== undefined) {
    rfqs.push(rfq); // Only add valid RFQs
// Ensure shop email exists
if (shop.email) {
  const message = `A new bulk order has been created for your product category. Please review the RFQ and submit your offer. 
  Product Name: ${productName}
  Quantity: ${quantity}
  Budget: ${budget}
  Delivery Deadline: ${deliveryDeadline}`;

  const htmlMessage = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Bulk Order Request</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #faf7f7; color: #5a4336;">
  <!-- Header with logo area and gradient background -->
  <div style="background-image: linear-gradient(135deg, #c8a4a5 0%, #d48c8f 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px; text-shadow: 1px 1px 2px rgba(0,0,0,0.1);">New Bulk Order Request</h1>
  </div>
  
  <!-- Main content area with card gradient effect -->
  <div style="padding: 35px 25px; border-left: 1px solid #e6d8d8; border-right: 1px solid #e6d8d8; border-bottom: 1px solid #e6d8d8; background-image: linear-gradient(to bottom, #ffffff, #f5f0f0); border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <h2 style="color: #c8a4a5; margin-top: 0; font-size: 24px;">New Bulk Order Opportunity!</h2>
    
    <p style="font-size: 16px; line-height: 1.6; color: #5a4336;">Hello,</p>
    
    <p style="font-size: 16px; line-height: 1.6; color: #5a4336;">A new bulk order has been created for your product category. Please review the details below and submit your offer if you're interested.</p>
    
    <!-- Order details section -->
    <div style="margin: 30px 0; padding: 25px; border-radius: 8px; background-image: linear-gradient(to right, #f5f0f0, #e6d8d8);">
      <h3 style="color: #c8a4a5; margin-top: 0; font-size: 20px;">Bulk Order Details</h3>
      
      <div style="background-color: #ffffff; border-radius: 6px; padding: 15px; margin-bottom: 10px;">
        <p style="font-size: 16px; line-height: 1.5; color: #5a4336; margin: 5px 0;">
          <strong style="color: #c8a4a5;">Product Name:</strong> ${productName}
        </p>
      </div>
      
      <div style="background-color: #ffffff; border-radius: 6px; padding: 15px; margin-bottom: 10px;">
        <p style="font-size: 16px; line-height: 1.5; color: #5a4336; margin: 5px 0;">
          <strong style="color: #c8a4a5;">Quantity:</strong> ${quantity}
        </p>
      </div>
      
      <div style="background-color: #ffffff; border-radius: 6px; padding: 15px; margin-bottom: 10px;">
        <p style="font-size: 16px; line-height: 1.5; color: #5a4336; margin: 5px 0;">
          <strong style="color: #c8a4a5;">Budget:</strong> ${budget}
        </p>
      </div>
      
      <div style="background-color: #ffffff; border-radius: 6px; padding: 15px;">
        <p style="font-size: 16px; line-height: 1.5; color: #5a4336; margin: 5px 0;">
          <strong style="color: #c8a4a5;">Delivery Deadline:</strong> ${deliveryDeadline}
        </p>
      </div>
    </div>
    
    <!-- Next steps section -->
    <div style="margin: 30px 0; padding: 20px; border-radius: 6px; background-color: #f5f0f0; border-left: 4px solid #d48c8f;">
      <h3 style="color: #c8a4a5; margin-top: 0; font-size: 18px;">What's Next?</h3>
      <ul style="font-size: 16px; line-height: 1.6; color: #5a4336; padding-left: 20px;">
        <li>Login to your seller dashboard to view the complete RFQ details</li>
        <li>Submit your best offer with competitive pricing and terms</li>
        <li>Specify your delivery timeline and any special conditions</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
      <a href="#" style="display: inline-block; background-image: linear-gradient(135deg, #c8a4a5 0%, #d48c8f 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">View Full RFQ Details</a>
    </div>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e6d8d8; text-align: center;">
      <p style="font-size: 14px; color: #b38d82; margin-bottom: 5px;">Don't miss this opportunity!</p>
      <p style="font-size: 16px; font-weight: bold; color: #c8a4a5; margin-top: 0;">Submit your offer today</p>
    </div>
  </div>
  
  <!-- Footer area with soft gradient -->
  <div style="background-image: linear-gradient(to right, #e6d8d8, #c8a4a5); padding: 20px; text-align: center; font-size: 14px; color: #ffffff; border-radius: 0 0 8px 8px; box-shadow: 0 -2px 5px rgba(0,0,0,0.03);">
    <p style="margin: 0 0 10px 0;">© ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
    <p style="margin: 0;">This email is regarding a new bulk order request on our platform.</p>
  </div>
</body>
</html>`;

  try {
    await sendMail({
      email: shop.email,
      subject: `New Bulk Order Request - ${productName}`,
      message,
      html: htmlMessage
    });
    console.log(`Email sent to ${shop.email}`);
  } catch (error) {
    console.error(`Error sending email to ${shop.email}:`, error);
  }
} else {
  console.warn(`No email defined for shop: ${shop.name}`);
}




    
  }}
 
   
  res.status(201).json({
    success: true,
    message: 'Bulk order created and RFQ sent to relevant shops.',
    bulkOrder,
    rfqs,
    
  });
}));




// SHOPS EXSISTING BULKORDER--SELLER SIDE
router.get("/get-orders/:shopId", catchAsyncErrors(async (req, res, next) => {
  const { shopId } = req.params;

  // Find RFQs related to the shop
  const rfqs = await RFQ.find({ shopId }).populate('bulkOrderId')
   .populate('userId', 'name email'); // Populate user details (name, email, etc.);
  

  // If no RFQs are found
  if (!rfqs.length) {
    return res.status(404).json({ success: false });
  }
  const offers = rfqs.map(rfq => ({
    ...rfq.toObject(),
    offer: {
      price: rfq.price,
      deliveryTime: rfq.deliveryTime,
      terms: rfq.terms,
      status: rfq.status,
      pricePerUnit: rfq.pricePerUnit,
deliveryTime: rfq.deliveryTime,
warranty: rfq.warranty,
availableQuantity:rfq.availableQuantity,
expirationDate:rfq.expirationDate,
packagingDetails:rfq.packagingDetails
    }
  }));

  // Send back the RFQs along with their associated bulk order details
  res.status(200).json({
    success: true,
    bulkOrders: offers,
  });
}));
// controllers/bulkOrderController.js

// SUBMITTING OFFERS
router.post("/submit-offer/:rfqId", catchAsyncErrors(async (req, res, next) => {
  const { rfqId } = req.params;
  const { price,
    pricePerUnit,
    deliveryTime,
    terms,
    warranty,
    availableQuantity,
    expirationDate,
    packagingDetails, } = req.body;
 // Check if an offer has already been submitted
 const existingOffer = await RFQ.findOne({ _id: rfqId, price: { $gt: 0 } }); // Ensure a price exists
 if (existingOffer) {
   return res.status(400).json({ success: false, message: 'Offer has already been submitted for this RFQ.' });
 }

  // Update the RFQ with the seller's offer details
  const updatedRFQ = await RFQ.findByIdAndUpdate(
    rfqId,
    { 
      price,
      pricePerUnit,
      deliveryTime,
      terms,
      warranty,
      availableQuantity,
      expirationDate,
      packagingDetails,
 status: 'Offer Submitted' },
    { new: true }
  );

  if (!updatedRFQ) {
    return res.status(404).json({ success: false, message: 'RFQ not found' });
  }

  // Fetch the bulk order and user information for the notification
  const bulkOrder = await BulkOrder.findById(updatedRFQ.bulkOrderId).populate('userId', 'name email');
  if (!bulkOrder || !bulkOrder.userId) {
    return res.status(404).json({ success: false, message: 'Bulk order or user information not found' });
  }

  // Notify the user via email
  const user = bulkOrder.userId;
if (user?.email) {
  const message = `
    Dear ${user.name},
    
    An offer has been submitted for your bulk order:
    - Product Name: ${bulkOrder.productName}
    - Offered Price: ${price}
    - Delivery Time: ${deliveryTime}
    - Terms: ${terms}
    
    Please review the offer in your dashboard and take the necessary actions.
    
    Best regards,
    Your Team
  `;

  const htmlMessage = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Offer Received</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #faf7f7; color: #5a4336;">
  <!-- Header with logo area and gradient background -->
  <div style="background-image: linear-gradient(135deg, #c8a4a5 0%, #d48c8f 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px; text-shadow: 1px 1px 2px rgba(0,0,0,0.1);">New Offer Received!</h1>
  </div>
  
  <!-- Main content area with card gradient effect -->
  <div style="padding: 35px 25px; border-left: 1px solid #e6d8d8; border-right: 1px solid #e6d8d8; border-bottom: 1px solid #e6d8d8; background-image: linear-gradient(to bottom, #ffffff, #f5f0f0); border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <h2 style="color: #c8a4a5; margin-top: 0; font-size: 24px;">Great News!</h2>
    
    <p style="font-size: 16px; line-height: 1.6; color: #5a4336;">Hello ${user.name},</p>
    
    <p style="font-size: 16px; line-height: 1.6; color: #5a4336;">An offer has been submitted for your bulk order. Here are the details:</p>
    
    <!-- Order details section -->
    <div style="margin: 30px 0; padding: 25px; border-radius: 8px; background-image: linear-gradient(to right, #f5f0f0, #e6d8d8);">
      <h3 style="color: #c8a4a5; margin-top: 0; font-size: 20px;">Offer Details</h3>
      
      <div style="background-color: #ffffff; border-radius: 6px; padding: 15px; margin-bottom: 10px;">
        <p style="font-size: 16px; line-height: 1.5; color: #5a4336; margin: 5px 0;">
          <strong style="color: #c8a4a5;">Product Name:</strong> ${bulkOrder.productName}
        </p>
      </div>
      
      <div style="background-color: #ffffff; border-radius: 6px; padding: 15px; margin-bottom: 10px;">
        <p style="font-size: 16px; line-height: 1.5; color: #5a4336; margin: 5px 0;">
          <strong style="color: #c8a4a5;">Offered Price:</strong> ${price}
        </p>
      </div>
      
      <div style="background-color: #ffffff; border-radius: 6px; padding: 15px; margin-bottom: 10px;">
        <p style="font-size: 16px; line-height: 1.5; color: #5a4336; margin: 5px 0;">
          <strong style="color: #c8a4a5;">Delivery Time:</strong> ${deliveryTime}
        </p>
      </div>
      
      <div style="background-color: #ffffff; border-radius: 6px; padding: 15px;">
        <p style="font-size: 16px; line-height: 1.5; color: #5a4336; margin: 5px 0;">
          <strong style="color: #c8a4a5;">Terms:</strong> ${terms}
        </p>
      </div>
    </div>
    
    <!-- Next steps section -->
    <div style="margin: 30px 0; padding: 20px; border-radius: 6px; background-color: #f5f0f0; border-left: 4px solid #d48c8f;">
      <h3 style="color: #c8a4a5; margin-top: 0; font-size: 18px;">What's Next?</h3>
      <ul style="font-size: 16px; line-height: 1.6; color: #5a4336; padding-left: 20px;">
        <li>Review the complete offer details in your dashboard</li>
        <li>Compare with other offers if available</li>
        <li>Accept the offer if it meets your requirements</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
      <a href="#" style="display: inline-block; background-image: linear-gradient(135deg, #c8a4a5 0%, #d48c8f 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">View Full Offer Details</a>
    </div>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e6d8d8; text-align: center;">
      <p style="font-size: 14px; color: #b38d82; margin-bottom: 5px;">Thank you for using our platform!</p>
      <p style="font-size: 16px; font-weight: bold; color: #c8a4a5; margin-top: 0;">We're here to help you find the best suppliers</p>
    </div>
  </div>
  
  <!-- Footer area with soft gradient -->
  <div style="background-image: linear-gradient(to right, #e6d8d8, #c8a4a5); padding: 20px; text-align: center; font-size: 14px; color: #ffffff; border-radius: 0 0 8px 8px; box-shadow: 0 -2px 5px rgba(0,0,0,0.03);">
    <p style="margin: 0 0 10px 0;">© ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
    <p style="margin: 0;">This email is regarding an offer for your bulk order request.</p>
  </div>
</body>
</html>`;

  try {
    await sendMail({
      email: user.email,
      subject: `New Offer for Your Bulk Order - ${bulkOrder.productName}`,
      message,
      html: htmlMessage
    });
    console.log(`Notification email sent to user: ${user.email}`);
  } catch (error) {
    console.error(`Error sending notification email to user: ${error.message}`);
  }
}

  res.status(200).json({
    success: true,
    message: 'Offer submitted successfully',
    rfq: updatedRFQ,
  });
  console.log('Updated RFQ:', updatedRFQ);

}));




// Get all bulk orders placed by a user-- USER SIDE
router.get("/user-orders/:userId", catchAsyncErrors(async (req, res, next) => {
  const { userId } = req.params;

  // Find all bulk orders created by the user
  const bulkOrders = await BulkOrder.find({ userId }).populate('userId', 'name email phoneNumber');

  if (!bulkOrders.length) {
    return res.status(404).json({ success: false });
  }

  res.status(200).json({
    success: true,
    bulkOrders,
  });
}));


// USER OFFERS OF SELLERS -USER SIDE 
router.get("/offers/:bulkOrderId", catchAsyncErrors(async (req, res, next) => {
  const { bulkOrderId } = req.params;

  // Fetch only RFQs tied to the given bulkOrderId
  const rfqs = await RFQ.find({
    bulkOrderId, // Ensure strict matching of the bulkOrderId
    price: { $gt: 0 }, // Include only RFQs where a valid offer exists
  })
    .populate("shopId", "name email");

  // If no offers are found, send an empty array
  if (!rfqs.length) {
    return res.status(200).json({ success: true, offers: [] });
  }

  // Send back the offers
  res.status(200).json({
    success: true,
    offers: rfqs,
  });
}));

// USER SIDE--INDIVIDUAL OFFERS 

// Get detailed offer for a specific RFQ
router.get('/offer-details/:rfqId', catchAsyncErrors(async (req, res, next) => {
  const { rfqId } = req.params;

  const rfq = await RFQ.findById(rfqId)
    .populate('bulkOrderId')
    .populate('shopId', 'name email phoneNumber');

  if (!rfq) {
    return res.status(404).json({ success: false, message: 'Offer not found' });
  }
  // Calculate the average rating of the shop's products
  const products = await Product.find({ shopId: rfq.shopId._id });
  const totalRatings = products.reduce((acc, product) => acc + (product.ratings || 0), 0);
  const averageRating = products.length ? (totalRatings / products.length).toFixed(2) : null;

  res.status(200).json({
    success: true,
    offer: {
      price: rfq.price,
      pricePerUnit: rfq.pricePerUnit,
      deliveryTime: rfq.deliveryTime,
      terms: rfq.terms,
      warranty: rfq.warranty,
      availableQuantity: rfq.availableQuantity,
      expirationDate: rfq.expirationDate,
      packagingDetails: rfq.packagingDetails,
      bulkOrder: rfq.bulkOrderId,
      shop: {
        ...rfq.shopId.toObject(),
        rating: averageRating, // Include the calculated rating
      },
      createdAt: rfq.createdAt,
      status:rfq.status
    },
  });
}));

// Accept an Offer



router.post(
  "/confirm-payment/:rfqId",
  catchAsyncErrors(async (req, res) => {
    const { rfqId } = req.params;
    const { paymentInfo } = req.body;

    // Find the RFQ to be updated
    const rfq = await RFQ.findById(rfqId);
    if (!rfq) return res.status(404).json({ message: "RFQ not found" });

    // Find the associated bulk order
    const bulkOrder = await BulkOrder.findById(rfq.bulkOrderId);
    if (!bulkOrder) return res.status(404).json({ message: "Bulk order not found" });

    // Check if RFQ status is already accepted
    if (rfq.status === "Accepted") {
      return res.status(400).json({ message: "This offer has already been accepted." });
    }

    // Update the bulk order and RFQ status when payment is confirmed
    bulkOrder.status = "Processing"; // Set bulk order status to 'Paid'
    bulkOrder.paymentInfo = paymentInfo;
    bulkOrder.paidAt = new Date();
    bulkOrder.acceptedOffer = rfqId; 
    await bulkOrder.save();

    rfq.status = "Accepted"; // Set RFQ status to 'Accepted'
    await rfq.save();

    // Decline other offers related to the same bulk order
    await RFQ.updateMany(
      { bulkOrderId: rfq.bulkOrderId, _id: { $ne: rfqId } },
      { $set: { status: "Declined" } }
    );
// Notify the seller via email
  // Notify the seller via email
  const shop = await Shop.findById(rfq.shopId); // Fetch the shop details
  if (shop && shop.email) {
  const sellerMessage = `
    Dear ${shop.name},
    
    Congratulations! Your offer for the bulk order has been accepted:
    - Product Name: ${bulkOrder.productName}
    - Accepted Price: ${rfq.price}
    - Quantity: ${bulkOrder.quantity}
    - Delivery Deadline: ${bulkOrder.deliveryDeadline}

    Please proceed with the necessary actions to fulfill this order.
    
    Best regards,
    Your Team
  `;

  const htmlMessage = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offer Accepted!</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #faf7f7; color: #5a4336;">
  <!-- Header with logo area and gradient background -->
  <div style="background-image: linear-gradient(135deg, #c8a4a5 0%, #d48c8f 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px; text-shadow: 1px 1px 2px rgba(0,0,0,0.1);">Congratulations!</h1>
  </div>
  
  <!-- Main content area with card gradient effect -->
  <div style="padding: 35px 25px; border-left: 1px solid #e6d8d8; border-right: 1px solid #e6d8d8; border-bottom: 1px solid #e6d8d8; background-image: linear-gradient(to bottom, #ffffff, #f5f0f0); border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <h2 style="color: #c8a4a5; margin-top: 0; font-size: 24px;">Your Offer Has Been Accepted!</h2>
    
    <p style="font-size: 16px; line-height: 1.6; color: #5a4336;">Dear ${shop.name},</p>
    
    <p style="font-size: 16px; line-height: 1.6; color: #5a4336;">Congratulations! Your offer for the bulk order has been accepted and payment has been confirmed. It's time to begin order fulfillment!</p>
    
    <!-- Order details section -->
    <div style="margin: 30px 0; padding: 25px; border-radius: 8px; background-image: linear-gradient(to right, #f5f0f0, #e6d8d8);">
      <h3 style="color: #c8a4a5; margin-top: 0; font-size: 20px;">Order Details</h3>
      
      <div style="background-color: #ffffff; border-radius: 6px; padding: 15px; margin-bottom: 10px;">
        <p style="font-size: 16px; line-height: 1.5; color: #5a4336; margin: 5px 0;">
          <strong style="color: #c8a4a5;">Product Name:</strong> ${bulkOrder.productName}
        </p>
      </div>
      
      <div style="background-color: #ffffff; border-radius: 6px; padding: 15px; margin-bottom: 10px;">
        <p style="font-size: 16px; line-height: 1.5; color: #5a4336; margin: 5px 0;">
          <strong style="color: #c8a4a5;">Accepted Price:</strong> ${rfq.price}
        </p>
      </div>
      
      <div style="background-color: #ffffff; border-radius: 6px; padding: 15px; margin-bottom: 10px;">
        <p style="font-size: 16px; line-height: 1.5; color: #5a4336; margin: 5px 0;">
          <strong style="color: #c8a4a5;">Quantity:</strong> ${bulkOrder.quantity}
        </p>
      </div>
      
      <div style="background-color: #ffffff; border-radius: 6px; padding: 15px;">
        <p style="font-size: 16px; line-height: 1.5; color: #5a4336; margin: 5px 0;">
          <strong style="color: #c8a4a5;">Delivery Deadline:</strong> ${bulkOrder.deliveryDeadline}
        </p>
      </div>
    </div>
    
    <!-- Next steps section -->
    <div style="margin: 30px 0; padding: 20px; border-radius: 6px; background-color: #f5f0f0; border-left: 4px solid #d48c8f;">
      <h3 style="color: #c8a4a5; margin-top: 0; font-size: 18px;">Next Steps</h3>
      <ul style="font-size: 16px; line-height: 1.6; color: #5a4336; padding-left: 20px;">
        <li>Begin production and prepare the order for shipping</li>
        <li>Update the order status as you progress</li>
        <li>Contact the buyer for any clarifications if needed</li>
        <li>Ensure timely delivery according to the agreed terms</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
      <a href="#" style="display: inline-block; background-image: linear-gradient(135deg, #c8a4a5 0%, #d48c8f 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">View Order Details</a>
    </div>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e6d8d8; text-align: center;">
      <p style="font-size: 14px; color: #b38d82; margin-bottom: 5px;">Thank you for your business!</p>
      <p style="font-size: 16px; font-weight: bold; color: #c8a4a5; margin-top: 0;">We look forward to a successful fulfillment</p>
    </div>
  </div>
  
  <!-- Footer area with soft gradient -->
  <div style="background-image: linear-gradient(to right, #e6d8d8, #c8a4a5); padding: 20px; text-align: center; font-size: 14px; color: #ffffff; border-radius: 0 0 8px 8px; box-shadow: 0 -2px 5px rgba(0,0,0,0.03);">
    <p style="margin: 0 0 10px 0;">© ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
    <p style="margin: 0;">This email confirms the acceptance of your offer for a bulk order.</p>
  </div>
</body>
</html>`;

  try {
    await sendMail({
      email: shop.email,
      subject: `Offer Accepted for Bulk Order - ${bulkOrder.productName}`,
      message: sellerMessage,
      html: htmlMessage
    });
    console.log(`Notification email sent to seller: ${shop.email}`);
  } catch (error) {
    console.error(`Error sending notification email to seller: ${error.message}`);
  }

  } else {
    console.warn(`No email defined for the seller's shop with ID: ${rfq.shopId}`);
  }




    res.status(200).json({ message: "Payment confirmed and offer accepted.", rfq });
  })
);


/* */

router.get("/user-processing-orders/:userId", catchAsyncErrors(async (req, res, next) => {
  const { userId } = req.params;

  // Find bulk orders where the user is involved and the status is "Processing", "Shipping", or "Delivered"
  const bulkOrders = await BulkOrder.find({ 
    userId,   
    status: { $in: ["Processing", "Shipping", "Delivered"] } 
  }).populate({
    path: "acceptedOffer",
    populate: { path: "shopId", select: "name email" }, // Populate the shop details of the seller
  });

  // Instead of returning a 404 error when no orders are found, return an empty array with 200 status
  if (!bulkOrders || bulkOrders.length === 0) {
    return res.status(200).json({
      success: true,
      processingOrders: [], // Return empty array instead of an error
      message: "No processing orders found for this user",
    });
  }

  // Map through the orders to return the relevant information
  const processingOrders = bulkOrders.map((order) => ({
    bulkOrder: order,
    status: order.status,
    OfferDetails: order.acceptedOffer,
  }));

  res.status(200).json({
    success: true,
    processingOrders,
  });
}));

// SHOPS EXISTING BULKORDER--SELLER SIDE
router.get("/get-accepted-orders/:shopId", catchAsyncErrors(async (req, res, next) => {
  const { shopId } = req.params;

  // Find RFQs related to the shop where the offer has been accepted
  const rfqs = await RFQ.find({ shopId, status: 'Accepted' }) // Only show accepted offers
    .populate('bulkOrderId')
    .populate('userId', 'name email'); // Populate user details (name, email, etc.);

  if (!rfqs.length) {
    return res.status(404).json({
      success: false,
      message: 'No accepted bulk orders found for this shop.'
    });
  }

  return res.status(200).json({
    success: true,
    acceptedBulkOrders: rfqs,
  });
}));

// Update the status of a bulk order (seller side)
router.put(
  "/update-order-status/:orderId",
  catchAsyncErrors(async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body; // Status should be one of 'Processing', 'Shipped', or 'Delivered'

    // Ensure the status is valid
    if (!['Processing', 'Shipping', 'Delivered'].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Find the bulk order and update the status
    const bulkOrder = await BulkOrder.findById(orderId);
    if (!bulkOrder) {
      return res.status(404).json({ message: "Bulk order not found" });
    }

    // Update the order's status
    bulkOrder.status = status;
    if (status === "Delivered") {
      bulkOrder.deliveredAt = Date.now();
    }
    await bulkOrder.save();

    res.status(200).json({
      message: `Order status updated to ${status}`,
      bulkOrder,
    });
  })
);


// Delete a bulk order
router.delete("/delete/:id", catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  // Find the bulk order by ID
  const bulkOrder = await BulkOrder.findById(id);

  if (!bulkOrder) {
    return res.status(404).json({ success: false, message: "Bulk order not found." });
  }

  // Check if the bulk order is in "pending" status
  const rfqs = await RFQ.find({ bulkOrderId: id });

  // Ensure no offers have been accepted
  const hasAcceptedOffer = rfqs.some((rfq) => rfq.status === "Accepted");
  if (hasAcceptedOffer) {
    return res.status(400).json({
      success: false,
      message: "Cannot delete bulk order as an offer has already been accepted.",
    });
  }

  // Delete the RFQs associated with the bulk order
  await RFQ.deleteMany({ bulkOrderId: id });

  // Delete the bulk order itself
  await BulkOrder.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: "Bulk order and associated RFQs deleted successfully.",
  });
}));

// Update Offer for an RFQ
router.put("/update-offer/:rfqId", catchAsyncErrors(async (req, res, next) => {
  const { rfqId } = req.params;
  const { price, pricePerUnit, deliveryTime, terms, warranty, availableQuantity, expirationDate, packagingDetails } = req.body;

  const rfq = await RFQ.findById(rfqId);
  if (!rfq) {
    return res.status(404).json({ success: false, message: "RFQ not found" });
  }

  if (rfq.status === "Accepted") {
    return res.status(400).json({ success: false, message: "Cannot update an accepted offer" });
  }

  const updatedRFQ = await RFQ.findByIdAndUpdate(
    rfqId,
    { price, pricePerUnit, deliveryTime, terms, warranty, availableQuantity, expirationDate, packagingDetails },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: "Offer updated successfully",
    rfq: updatedRFQ,
  });
}));

// Delete Offer for an RFQ
router.delete("/delete-offer/:rfqId", catchAsyncErrors(async (req, res, next) => {
  const { rfqId } = req.params;

  const rfq = await RFQ.findById(rfqId);
  if (!rfq) {
    return res.status(404).json({ success: false, message: "RFQ not found" });
  }

  if (rfq.status === "Accepted") {
    return res.status(400).json({ success: false, message: "Cannot delete an accepted offer" });
  }

  await RFQ.findByIdAndDelete(rfqId);

  res.status(200).json({
    success: true,
    message: "Offer deleted successfully",
  });
}));



module.exports = router;
