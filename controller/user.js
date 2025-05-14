require('dotenv').config();
// module.exports = router;
const express = require("express");
const path = require("path");
const User = require("../model/user");
const { upload } = require("../middleware/multer");
const ErrorHandler = require("../utils/ErrorHandler");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const sendToken = require("../utils/jwtToken");
const { isAuthenticated, isAdmin } = require("../middleware/auth");
require("../middleware/auth");
const crypto = require("crypto");
const router = express.Router();

router.post("/create-user", upload.single("file"), async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const userEmail = await User.findOne({ email });

    if (userEmail) {
      // Handle file deletion correctly with absolute path
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
    const fileUrl = path.join(filename);

    // Generate activation token
    const activationToken = crypto.randomBytes(32).toString('hex');
    // Set expiration time (24 hours from now) - FIX: Use new Date object consistently
    const activationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    console.log("Creating user with token expiry:", activationTokenExpires);

    // Create inactive user
    const user = await User.create({
      name: name,
      email: email,
      password: password,
      avatar: fileUrl,
      role: role || "user",
      isActive: false,
      activationToken: activationToken,
      activationTokenExpires: activationTokenExpires
    });

    // Use the frontend route for activation
    const activationUrl = `http://localhost:3000/activation/${activationToken}`;

    // Send email to user
   // Email activation code with styled HTML email
try {
  // Plain text version for fallback
  const activationMessage = `Hello ${user.name}, please click on the link to activate your account: ${activationUrl}

This link is valid for 24 hours. If you didn't request this, please ignore this email.`;

  // HTML version with styling based on Forum theme
  const htmlActivationMessage = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Activate Your Tamkeen Account</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #faf7f7; color: #5a4336;">
  <!-- Header with logo area and gradient background -->
  <div style="background-image: linear-gradient(135deg, #c8a4a5 0%, #d48c8f 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px; text-shadow: 1px 1px 2px rgba(0,0,0,0.1);">Tamkeen</h1>
  </div>
  
  <!-- Main content area with card gradient effect -->
  <div style="padding: 35px 25px; border-left: 1px solid #e6d8d8; border-right: 1px solid #e6d8d8; border-bottom: 1px solid #e6d8d8; background-image: linear-gradient(to bottom, #ffffff, #f5f0f0); border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <h2 style="color: #c8a4a5; margin-top: 0; font-size: 24px;">Welcome to Our Community!</h2>
    
    <p style="font-size: 16px; line-height: 1.6; color: #5a4336;">Hello <strong>${user.name}</strong>,</p>
    
    <p style="font-size: 16px; line-height: 1.6; color: #5a4336;">Thank you for joining Tamkeen. We're excited to have you as part of our community! To activate your account and start exploring all our features, please click the button below:</p>
    
    <!-- Action Button with gradient -->
    <div style="text-align: center; margin: 35px 0;">
      <a href="${activationUrl}" style="background-image: linear-gradient(to right, #c8a4a5, #d48c8f); color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: all 0.3s ease;">Activate Your Account</a>
    </div>
    
    <p style="font-size: 16px; line-height: 1.6; color: #5a4336;">Or copy and paste this link into your browser:</p>
    
    <p style="font-size: 14px; line-height: 1.5; color: #5a4336; background-color: #f5f0f0; padding: 12px; border-radius: 6px; word-break: break-all; border-left: 4px solid #c8a4a5;">
      ${activationUrl}
    </p>
    
    <div style="margin: 30px 0; padding: 20px; border-radius: 6px; background-image: linear-gradient(to right, #f5f0f0, #e6d8d8);">
      <p style="font-size: 16px; line-height: 1.6; color: #5a4336; margin-top: 0;">Please note:</p>
      <ul style="font-size: 16px; line-height: 1.6; color: #5a4336; padding-left: 20px;">
        <li>This activation link will expire in 24 hours</li>
        <li>If you didn't create an account with us, you can safely ignore this email</li>
        <li>For security reasons, please don't share this link with anyone</li>
      </ul>
    </div>
    
    <p style="font-size: 16px; line-height: 1.6; color: #5a4336;">If you have any questions or need assistance, our support team is here to help!</p>

    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e6d8d8; text-align: center;">
      <p style="font-size: 14px; color: #b38d82; margin-bottom: 5px;">Connect with the community</p>
      <p style="font-size: 16px; font-weight: bold; color: #c8a4a5; margin-top: 0;">Join our forum discussions!</p>
    </div>
  </div>
  
  <!-- Footer area with soft gradient -->
  <div style="background-image: linear-gradient(to right, #e6d8d8, #c8a4a5); padding: 20px; text-align: center; font-size: 14px; color: #ffffff; border-radius: 8px; margin-top: 20px; box-shadow: 0 -2px 5px rgba(0,0,0,0.03);">
    <p style="margin: 0 0 10px 0;">© ${new Date().getFullYear()} Tamkeen. All rights reserved.</p>
    <p style="margin: 0;">This is an automated message from our secure notification system.</p>
  </div>
</body>
</html>
  `;

  await sendMail({
    email: user.email,
    subject: "Welcome to Tamkeen - Activate Your Account",
    message: activationMessage,
    html: htmlActivationMessage
  });
  
  console.log("Activation email sent with token:", activationToken);
  
  res.status(201).json({
    success: true,
    message: `Please check your email: ${user.email} to activate your account!`,
  });
} catch (err) {
  console.error("Email sending error:", err);
  // If email fails, still create the account but notify about email failure
  return next(new ErrorHandler("Account created but failed to send activation email. Please contact admin.", 500));
}
} catch (err) {
  console.error("Registration error:", err);
  return next(new ErrorHandler(err.message, 400));
}
});

// Activate user account via email link (POST endpoint)
router.post("/activation", catchAsyncErrors(async (req, res, next) => {
  try {
    const { activation_token } = req.body;

    const user = await User.findOne({ 
      activationToken: activation_token,
      activationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return next(new ErrorHandler("Invalid or expired activation token", 400));
    }

    user.isActive = true;
    user.activationToken = undefined;
    user.activationTokenExpires = undefined;
    await user.save();

    res.status(200).json({ 
      success: true, 
      message: "Account activated successfully!" 
    });
  } catch (error) {
    next(new ErrorHandler("Activation failed", 500));
  }
}));

// Admin route to manually activate a user
router.put(
  "/admin-activate-user/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      user.isActive = true;
      user.activationToken = undefined;
      user.activationTokenExpires = undefined;
      await user.save();

      res.status(200).json({
        success: true,
        message: "User account activated successfully"
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Resend activation email
router.post(
  "/resend-activation",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      if (user.isActive) {
        return next(new ErrorHandler("Account is already active", 400));
      }

      // Generate new activation token
      const activationToken = crypto.randomBytes(32).toString('hex');
      const activationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

      user.activationToken = activationToken;
      user.activationTokenExpires = activationTokenExpires;
      await user.save();

      const activationUrl = `http://localhost:3000/activation/${activationToken}`;

      // Send email to user
      await sendMail({
        email: user.email,
        subject: "Activate your account",
        message: `Hello ${user.name}, please click on the link to activate your account ${activationUrl} `,
      });

      res.status(200).json({
        success: true,
        message: `Activation email sent to ${user.email}`,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Login user
router.post(
  "/login-user",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return next(new ErrorHandler("Please provide all fields", 400));
      }
      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("User doesn't exist", 400));
      }

      // Compare password with database password
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return next(
          new ErrorHandler("Please provide the correct information", 400)
        );
      }
      sendToken(user, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Load user
router.get(
  "/getuser",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return next(new ErrorHandler("User doesn't exist", 400));
      }
      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Log out user
router.get(
  "/logout",
  catchAsyncErrors(async (req, res, next) => {
    try {
      res.cookie("token", null, {
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

// Update user info
router.put(
  "/update-user-info",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password, phoneNumber, name } = req.body;

      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("User not found", 400));
      }

      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return next(
          new ErrorHandler("Please provide the correct information", 400)
        );
      }

      user.name = name;
      user.email = email;
      user.phoneNumber = phoneNumber;

      await user.save();

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Update user avatar
router.put(
  "/update-avatar",
  isAuthenticated,
  upload.single("image"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const existsUser = await User.findById(req.user._id);

      const existAvatarPath = path.join(__dirname, "../uploads", existsUser.avatar);

      if (fs.existsSync(existAvatarPath)) {
        fs.unlinkSync(existAvatarPath);
      }// Delete previous image

      const fileUrl = `/${req.file.filename}`; // New image

      const user = await User.findByIdAndUpdate(req.user._id, {
        avatar: fileUrl,
      });

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Update user addresses
router.put(
  "/update-user-addresses",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);

      const sameTypeAddress = user.addresses.find(
        (address) => address.addressType === req.body.addressType
      );
      if (sameTypeAddress) {
        return next(
          new ErrorHandler(`${req.body.addressType} address already exists`)
        );
      }

      const existsAddress = user.addresses.find(
        (address) => address._id === req.body._id
      );

      if (existsAddress) {
        Object.assign(existsAddress, req.body);
      } else {
        // Add the new address to the array
        user.addresses.push(req.body);
      }

      await user.save();

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Delete user address
router.delete(
  "/delete-user-address/:id",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const userId = req.user._id;
      const addressId = req.params.id;

      await User.updateOne(
        {
          _id: userId,
        },
        { $pull: { addresses: { _id: addressId } } }
      );

      const user = await User.findById(userId);

      res.status(200).json({ success: true, user });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Update user password
router.put(
  "/update-user-password",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id).select("+password");

      const isPasswordMatched = await user.comparePassword(
        req.body.oldPassword
      );

      if (!isPasswordMatched) {
        return next(new ErrorHandler("Old password is incorrect!", 400));
      }

      if (req.body.newPassword !== req.body.confirmPassword) {
        return next(
          new ErrorHandler("Password doesn't match with each other!", 400)
        );
      }
      user.password = req.body.newPassword;

      await user.save();

      res.status(200).json({
        success: true,
        message: "Password updated successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Find user information with the userId
router.get(
  "/user-info/:id",

  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);



router.get(
  "/admin-all-users",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const search = req.query.search || "";
      
      // Create a search query that works with single characters
      const searchQuery = search 
        ? {
            $or: [
              // Use regex that matches any part of the string, even single chars
              { name: { $regex: `^${search}`, $options: "i" } },
              { email: { $regex: `^${search}`, $options: "i" } }
            ]
          } 
        : {};
      
      const users = await User.find(searchQuery).sort({
        createdAt: -1,
      });
      
      res.status(201).json({
        success: true,
        users,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Delete user ---admin
router.delete(
  "/delete-user/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return next(new ErrorHandler("User not found with this id", 404));
      }

      await User.findByIdAndDelete(req.params.id);

      res.status(200).json({
        success: true,
        message: "User deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);
// Forgot password
router.post(
  "/forgot-password",
  catchAsyncErrors(async (req, res, next) => {
    const { email, type } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordTime = Date.now() + 15 * 60 * 1000; // 15 minutes

    await user.save();

    // Send email
    const resetUrl = `http://localhost:3000/reset-password/${type}/${resetToken}`;
    
    try {
      await sendMail({
        email: user.email,
        subject: "Password Reset Request",
        message: `You requested a password reset. Click the link to continue: ${resetUrl}
                  \nThis link expires in 15 minutes.`
      });

      res.status(200).json({
        success: true,
        message: `Reset link sent to ${email}`
      });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      return next(new ErrorHandler("Email could not be sent", 500));
    }
  })
);

// Validate reset token
router.get(
  "/validate-reset-token/:token",
  catchAsyncErrors(async (req, res, next) => {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

      //console.log("sadsd");
      console.log("HASHED ONEE");
      console.log(hashedToken);
      console.log(Date.now());
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordTime: { $gt: Date.now() }
    });

    
    console.log(user);

    if (!user) {
      return next(new ErrorHandler("Invalid or expired token", 400));
    }

    res.status(200).json({ success: true });
  })
);

// Reset password
router.put(
  "/reset-password/:token",
  catchAsyncErrors(async (req, res, next) => {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordTime: { $gt: Date.now() }
    });

    if (!user) {
      return next(new ErrorHandler("Invalid or expired token", 400));
    }

    const { password, confirmPassword } = req.body;
    
    if (!password || !confirmPassword) {
      return next(new ErrorHandler("Please fill all fields", 400));
    }

    if (password !== confirmPassword) {
      return next(new ErrorHandler("Passwords do not match", 400));
    }
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordTime  = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully"
    });
  })
);


module.exports = router;
