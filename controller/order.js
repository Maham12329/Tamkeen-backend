const express = require("express");
const router = express.Router();
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const Order = require("../model/order");
const Shop = require("../model/shop");
const Product = require("../model/product");
const sendMail = require("../utils/sendMail");


// create new order
router.post(
  "/create-order",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { cart, shippingAddress, user, totalPrice, paymentInfo } = req.body;

      //   group cart items by shopId
      const shopItemsMap = new Map();

      for (const item of cart) {
        const shopId = item.shopId;
        if (!shopItemsMap.has(shopId)) {
          shopItemsMap.set(shopId, []);
        }
        shopItemsMap.get(shopId).push(item);
      }

      // create an order for each shop
      const orders = [];

      for (const [shopId, items] of shopItemsMap) {
        const order = await Order.create({
          cart: items,
          shippingAddress,
          user,
          totalPrice,
          paymentInfo,
        });
        for (const item of items) {
          await updateProductStock(item._id, item.qty);
        }
        
        orders.push(order);
      }
         // ✅ Send email to user
         if (user?.email) {
          const productList = cart
            .map((item) => `- ${item.name} x${item.qty}`)
            .join("\n");
  
 const message = `
Hi ${user.name},

Thank you for your order! Here are the details:

Items:
${productList}

Total Price: ${totalPrice}
Shipping Address: ${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.country}

We will notify you once your order is shipped.

Best regards,  
Your Team
`;

        // Create the HTML version with styling based on theme
        const htmlMessage = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #faf7f7; color: #5a4336;">
  <!-- Header with logo area and gradient background -->
  <div style="background-image: linear-gradient(135deg, #c8a4a5 0%, #d48c8f 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px; text-shadow: 1px 1px 2px rgba(0,0,0,0.1);">Order Confirmation</h1>
  </div>
  
  <!-- Main content area with card gradient effect -->
  <div style="padding: 35px 25px; border-left: 1px solid #e6d8d8; border-right: 1px solid #e6d8d8; border-bottom: 1px solid #e6d8d8; background-image: linear-gradient(to bottom, #ffffff, #f5f0f0); border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <h2 style="color: #c8a4a5; margin-top: 0; font-size: 24px;">Thank You for Your Purchase!</h2>
    
    <p style="font-size: 16px; line-height: 1.6; color: #5a4336;">Hello <strong>${user.name}</strong>,</p>
    
    <p style="font-size: 16px; line-height: 1.6; color: #5a4336;">We're thrilled to confirm that your order has been received and is being processed. Here are your order details:</p>
    
    <!-- Order details section -->
    <div style="margin: 30px 0; padding: 25px; border-radius: 8px; background-image: linear-gradient(to right, #f5f0f0, #e6d8d8);">
      <h3 style="color: #c8a4a5; margin-top: 0; font-size: 20px;">Order Summary</h3>
      
      <div style="background-color: #ffffff; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
        <h4 style="color: #5a4336; margin-top: 0; font-size: 18px; border-bottom: 1px solid #e6d8d8; padding-bottom: 10px;">Items Purchased:</h4>
        <div style="font-size: 15px; line-height: 1.5; color: #5a4336;">
          ${productList.replace(/\n/g, '<br>')}
        </div>
      </div>
      
      <div style="display: flex; justify-content: space-between; padding: 15px 0; border-top: 1px solid #d48c8f; margin-top: 5px;">
        <span style="font-size: 18px; font-weight: bold; color: #5a4336;">Total:</span>
        <span style="font-size: 18px; font-weight: bold; color: #c8a4a5;">${totalPrice}</span>
      </div>
    </div>
    
    <!-- Shipping details section -->
    <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #c8a4a5;">
      <h3 style="color: #c8a4a5; margin-top: 0; font-size: 20px;">Shipping Information</h3>
      <p style="font-size: 16px; line-height: 1.5; color: #5a4336; margin-bottom: 5px;">
        <strong>Address:</strong> ${shippingAddress.address}
      </p>
      <p style="font-size: 16px; line-height: 1.5; color: #5a4336; margin-bottom: 5px;">
        <strong>City:</strong> ${shippingAddress.city}
      </p>
      <p style="font-size: 16px; line-height: 1.5; color: #5a4336; margin-bottom: 0;">
        <strong>Country:</strong> ${shippingAddress.country}
      </p>
    </div>
    
    <p style="font-size: 16px; line-height: 1.6; color: #5a4336;">We're preparing your items for shipment and will notify you once they're on the way. If you have any questions about your order, please don't hesitate to contact our customer support team.</p>

    <!-- Next steps section -->
    <div style="margin: 30px 0; padding: 20px; border-radius: 6px; background-color: #f5f0f0; border-left: 4px solid #d48c8f;">
      <h3 style="color: #c8a4a5; margin-top: 0; font-size: 18px;">What's Next?</h3>
      <ul style="font-size: 16px; line-height: 1.6; color: #5a4336; padding-left: 20px;">
        <li>You'll receive a shipping confirmation email once your order is on its way</li>
        <li>Track your package using the tracking information that will be provided</li>
        <li>Contact our support team if you need to make any changes to your order</li>
      </ul>
    </div>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e6d8d8; text-align: center;">
      <p style="font-size: 14px; color: #b38d82; margin-bottom: 5px;">Thank you for shopping with us!</p>
      <p style="font-size: 16px; font-weight: bold; color: #c8a4a5; margin-top: 0;">We appreciate your business</p>
    </div>
  </div>
  
  <!-- Footer area with soft gradient -->
  <div style="background-image: linear-gradient(to right, #e6d8d8, #c8a4a5); padding: 20px; text-align: center; font-size: 14px; color: #ffffff; border-radius: 0 0 8px 8px; box-shadow: 0 -2px 5px rgba(0,0,0,0.03);">
    <p style="margin: 0 0 10px 0;">© ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
    <p style="margin: 0;">This email confirms your recent purchase.</p>
  </div>
</body>
</html>`;

        try {
          await sendMail({
            email: user.email,
            subject: "Order Confirmation - Thank you for your purchase!",
            message,
            html: htmlMessage
          });
          console.log(`Confirmation email sent to ${user.email}`);
        } catch (err) {
          console.error("Error sending confirmation email:", err);
        }
      }

      res.status(201).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

async function updateProductStock(productId, quantity) {
  const product = await Product.findById(productId);

  if (product) {
    product.stock -= quantity;
    product.sold_out += quantity;

    await product.save({ validateBeforeSave: false });
  }
}
// get all orders of user
router.get(
  "/get-all-orders/:userId",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const orders = await Order.find({ "user._id": req.params.userId }).sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// get all orders of seller
router.get(
  "/get-seller-all-orders/:shopId",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const orders = await Order.find({
        "cart.shopId": req.params.shopId,
      }).sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update order status for seller    ---------------(product)
router.put(
  "/update-order-status/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 400));
      }
      if (req.body.status === "Transferred to delivery partner") {
        order.cart.forEach(async (o) => {
          await updateOrder(o._id, o.qty);
        });
      }

      order.status = req.body.status;

      if (req.body.status === "Delivered") {
        order.deliveredAt = Date.now();
        order.paymentInfo.status = "Succeeded";
        const serviceCharge = order.totalPrice * 0.1;
        await updateSellerInfo(order.totalPrice - serviceCharge);
      }

      await order.save({ validateBeforeSave: false });

      res.status(200).json({
        success: true,
        order,
      });

      async function updateOrder(id, qty) {
        const product = await Product.findById(id);

        product.stock -= qty;
        product.sold_out += qty;

        await product.save({ validateBeforeSave: false });
      }

      async function updateSellerInfo(amount) {
        const seller = await Shop.findById(req.seller.id);

        seller.availableBalance = amount;

        await seller.save();
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

router.get(
  "/admin-all-orders",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const orders = await Order.find()
        .populate({
          path: "user",
          select: "name email", // Include relevant user fields
        })
        .populate({
          path: "cart.shop", 
          select: "name", // Include shop name
        })
        .sort({
          deliveredAt: -1,
          createdAt: -1,
        });
      
      res.status(201).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);
module.exports = router;