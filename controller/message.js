const Messages = require("../model/messages");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const express = require("express");
const { upload } = require("../middleware/multer");
const router = express.Router();
const path = require("path");
const { translate } = 
require('@vitalets/google-translate-api');

// Function to translate a message to Urdu ('ur')
async function translateMessage(message, targetLang = 'ur') {
  try {
    const result = await translate(message, { to: targetLang });
    return result.text; // Return the translated text
  } catch (error) {
    console.error(`Error translating message: ${error.message}`);
    return null; // Return null if translation fails
  }
}

// Create new message route
router.post(
  "/create-new-message",
  upload.single("images"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const messageData = req.body;

      if (req.file) {
        const filename = req.file.filename;
        const fileUrl = path.join(filename);
        messageData.images = fileUrl;
      }

      messageData.conversationId = req.body.conversationId;
      messageData.sender = req.body.sender;
      messageData.text = req.body.text;

      // Translate the message to Urdu
      const translatedText = await translateMessage(messageData.text, 'ur');

      // Create message object with both original and translated text
      const message = new Messages({
        conversationId: messageData.conversationId,
        text: messageData.text,            // Original message (English)
        translatedText: translatedText,    // Translated message (Urdu)
        sender: messageData.sender,
        images: messageData.images ? messageData.images : undefined,
      });

      await message.save();

      res.status(201).json({
        success: true,
        message,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

router.get(
  "/get-all-messages/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const messages = await Messages.find({
        conversationId: req.params.id,
      });

      res.status(201).json({
        success: true,
        messages,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message), 500);
    }
  })
);

module.exports = router;
