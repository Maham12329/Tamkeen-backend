require('dotenv').config();

const express = require("express");
const path = require("path");
const router = express.Router();
const fs = require("fs");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const Shop = require("../model/shop");
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const { upload } = require("../middleware/multer");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const Service = require("../model/services"); 
const sendShopToken = require("../utils/shopToken");
const Product = require("../model/product");
const { createShopValidationSchema } = require("../utils/shopValidation");
const Order = require("../model/order");

// create shop
// create shop
router.post("/create-shop", upload.single("file"), async (req, res, next) => {
  try {
    const { error } = createShopValidationSchema.validate(req.body);
    if (error) {
      // If validation fails, return the first error message to the client
      return next(new ErrorHandler(error.details[0].message, 400));
    }
    const { email } = req.body;
    const sellerEmail = await Shop.findOne({ email });

    if (sellerEmail) {
      const filename = req.file.filename;
      const filePath = path.join(__dirname, "../uploads", filename);
      fs.unlink(filePath, (err) => {
        if (err) {
          console.log(err);
          res.status(500).json({ message: "Error deleting file" });
        }
      });
      return next(new ErrorHandler("User already exists", 400));
    }

    const filename = req.file.filename;
    const fileUrl = `/${filename}`;
    ; //madechanges

    const seller = {
      name: req.body.name,
      email: email,
      password: req.body.password,
      avatar: fileUrl,
      area: req.body.area,
      region: req.body.region,
      address: req.body.address,
      phoneNumber: req.body.phoneNumber,
      zipCode: req.body.zipCode,
    };

    const activationToken = createActivationToken(seller);

    const activationUrl = `http://localhost:3000/seller/activation/${activationToken}`;

    try {
      await sendMail({
        email: seller.email,
        subject: "ACTIVATE YOUR SHOP",
        message: `Hello ${seller.name}, please click on the link to activate your shop: ${activationUrl}`,
      });
      res.status(201).json({
        success: true,
        message: `please check your email:- ${seller.email} to activate your shop!`,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// create activation token
const createActivationToken = (seller) => {
  return jwt.sign(seller, process.env.ACTIVATION_SECRET, {
    expiresIn: "10m",
  });
};

// activate user
router.post(
  "/activation",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { activation_token } = req.body;

      const newSeller = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET
      );

      if (!newSeller) {
        return next(new ErrorHandler("Invalid token", 400));
      }
      const { name, email, password, avatar, zipCode, area, region, address, phoneNumber } =
        newSeller;

      let seller = await Shop.findOne({ email });

      if (seller) {
        return next(new ErrorHandler("User already exists", 400));
      }

      seller = await Shop.create({
        name,
        email,
        avatar,
        password,
        zipCode,
        area,
        region,
        address,
        phoneNumber,
      });

      sendShopToken(seller, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// login shop
router.post(
  "/login-shop",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return next(new ErrorHandler("Please provide the all fields!", 400));
      }

      const user = await Shop.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("User doesn't exists!", 400));
      }

      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return next(
          new ErrorHandler("Please provide the correct information", 400)
        );
      }

      sendShopToken(user, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// load shop
router.get(
  "/getSeller",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.seller._id);

      if (!seller) {
        return next(new ErrorHandler("User doesn't exists", 400));
      }

      res.status(200).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// log out from shop
router.get(
  "/logout",
  catchAsyncErrors(async (req, res, next) => {
    try {
      res.cookie("seller_token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
      });
      res.status(201).json({
        success: true,
        message: "Log out successful!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// get shop info
router.get(
  "/get-shop-info/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const shop = await Shop.findById(req.params.id);
      res.status(201).json({
        success: true,
        shop,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update shop profile picture
// update shop profile picture
router.put(
  "/update-shop-avatar",
  isSeller,
  upload.single("image"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const existsUser = await Shop.findById(req.seller._id);

      // Correct the avatar path by ensuring it points to the correct directory
      const existAvatarPath = path.join(__dirname, "../uploads", existsUser.avatar);

      if (fs.existsSync(existAvatarPath)) {
        fs.unlinkSync(existAvatarPath);
      }

      // Correct the path for the new file
      const fileUrl = `/${req.file.filename}`;
      await Shop.findByIdAndUpdate(req.seller._id, { avatar: fileUrl });

      // Update the avatar in the associated services
      await Service.updateMany(
        { shopId: req.seller._id.toString() },
        { $set: { 'shop.avatar': fileUrl } }
      );
      await Product.updateMany(
        { shopId: req.seller._id.toString() },
        { $set: { 'shop.avatar': fileUrl } }
      );
      const seller = await Shop.findByIdAndUpdate(req.seller._id, {
        avatar: fileUrl,
      });

      res.status(200).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


// update seller info
router.put(
  "/update-seller-info",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { name, description, area, region, address, phoneNumber, zipCode } = req.body;

      const shop = await Shop.findById(req.seller._id); //

      if (!shop) {
        return next(new ErrorHandler("User not found", 400));
      }

      
      const existingAvatar = shop.avatar;

      shop.name = name;
      shop.description = description;
      shop.address = address;
      shop.phoneNumber = phoneNumber;
      shop.zipCode = zipCode;
      shop.area = area;
      shop.region = region;


      shop.avatar = existingAvatar;

      await shop.save();
      console.log('Shop ID:', shop._id.toString());

      // PRODUCT SHOP UPDATION


  // Update the services associated with this shop
  
  


     
    
      res.status(201).json({
        success: true,
        shop,
     
        
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);
// all sellers --- for admin
router.get(
  "/admin-all-sellers",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const search = req.query.search || "";
      
      // Create search query that matches only at the beginning
      const searchQuery = search 
        ? {
            $or: [
              { name: { $regex: `^${search}`, $options: "i" } },
              { email: { $regex: `^${search}`, $options: "i" } }
            ]
          } 
        : {};
      
      const sellers = await Shop.find(searchQuery).sort({
        createdAt: -1,
      });
      
      res.status(201).json({
        success: true,
        sellers,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete seller ---admin
router.delete(
  "/delete-seller/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.params.id);

      if (!seller) {
        return next(
          new ErrorHandler("Seller is not available with this id", 400)
        );
      }
      await Service.deleteMany({ shopId: req.params.id });
      await Shop.findByIdAndDelete(req.params.id);

      res.status(201).json({
        success: true,
        message: "Seller deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);




// shop.js controller
router.get('/sales-data/:sellerId', async (req, res) => {
  try {
      const { sellerId } = req.params;
      const { startDate, endDate } = req.query;

      // Fetch orders for the seller within the date range
      const orders = await Order.find({
          'cart.shopId': sellerId,
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
      });

      // Initialize salesData object
      const salesData = {};
      let totalProfit = 0;

      // Loop through orders to accumulate sales data
      orders.forEach((order) => {
          order.cart.forEach((item) => {
              if (item.shopId === sellerId) {
                  // Initialize if not present
                  if (!salesData[item._id]) {
                      salesData[item._id] = {
                          productName: item.name,
                          totalQuantity: 0,
                          totalProfit: 0,
                      };
                  }
                  // Update quantity and profit
                  salesData[item._id].totalQuantity += item.qty;
                  salesData[item._id].totalProfit += item.qty * (item.discountPrice ? item.discountPrice : item.originalPrice);
              }
          });
      });

    

      // Return the sales data
      res.status(200).json({ success: true, salesData });
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
  }
});
router.get('/sales-data/breakdown/:sellerId', async (req, res) => {
  try {
      const { sellerId } = req.params;
      const { date, month, year, interval = 'daily' } = req.query;

      // Determine the date range based on the interval
      let dateRange;
      if (interval === 'daily') {
          dateRange = { 
              $gte: new Date(date), 
              $lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)) 
          };
      } else if (interval === 'monthly') {
          dateRange = { 
              $gte: new Date(month + '-01'), 
              $lt: new Date(new Date(month + '-01').setMonth(new Date(month + '-01').getMonth() + 1)) 
          };
      } else if (interval === 'yearly') {
          dateRange = { 
              $gte: new Date(year + '-01-01'), 
              $lt: new Date(new Date(year + '-01-01').setFullYear(new Date(year + '-01-01').getFullYear() + 1)) 
          };
      }

      // Fetch orders for the seller based on the date range
      const orders = await Order.find({
          'cart.shopId': sellerId,
          createdAt: dateRange,
      });

      const salesBreakdown = {};

      orders.forEach((order) => {
          order.cart.forEach((item) => {
              if (item.shopId === sellerId) {
                  let dateKey;
                  const orderDate = new Date(order.createdAt);

                  if (interval === 'daily') {
                      dateKey = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD
                  } else if (interval === 'monthly') {
                      dateKey = orderDate.toISOString().split('T')[0].slice(0, 7); // YYYY-MM
                  } else if (interval === 'yearly') {
                    dateKey = orderDate.toISOString().split('T')[0].slice(0, 7); // YYYY-MM
                    if (!salesBreakdown[dateKey]) {
                        salesBreakdown[dateKey] = {};
                    }
                  }

                  if (!salesBreakdown[dateKey]) {
                      salesBreakdown[dateKey] = {};
                  }
                  if (!salesBreakdown[dateKey][item._id]) {
                      salesBreakdown[dateKey][item._id] = {
                          productName: item.name,
                          totalQuantity: 0,
                          totalProfit: 0,
                      };
                  }

                  salesBreakdown[dateKey][item._id].totalQuantity += item.qty;
                  salesBreakdown[dateKey][item._id].totalProfit += item.qty * (item.discountPrice ? item.discountPrice : item.originalPrice);
              }
          });
      });
 // Adjust to provide the breakdown for each month in the year
 const annualSalesBreakdown = {};
 for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
     const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`; // YYYY-MM
     annualSalesBreakdown[monthKey] = salesBreakdown[monthKey] || {};
 }
      res.status(200).json({ success: true, salesBreakdown });
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
  }
});
  


// shop.js controller
router.get('/sales-summary/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { startDate, endDate } = req.query;

    // Fetch orders for the seller within the date range
    const orders = await Order.find({
      'cart.shopId': sellerId,
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
    });

    let totalItemsSold = 0;
    let totalProfit = 0;

    // Loop through orders to calculate total items sold and profit
    orders.forEach((order) => {
      order.cart.forEach((item) => {
        if (item.shopId === sellerId) {
          totalItemsSold += item.qty;
          totalProfit += item.qty * (item.discountPrice ? item.discountPrice : item.originalPrice);
        }
      });
    });

    // Return the summary data
    res.status(200).json({ success: true, totalItemsSold, totalProfit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});



module.exports = router;