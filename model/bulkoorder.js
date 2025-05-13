const mongoose = require('mongoose');

const bulkOrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  productName: {
    type: String,
    required: [true, 'Please enter the product name'],
  },
  description: {
    type: String,
    required: [true, 'Please enter the product description'],
  },
  quantity: {
    type: Number,
    required: [true, 'Please enter the quantity'],
  },
  category: {
    type: String,
    required: [true, 'Please enter the product category'],
  },
  inspoPic: {
    type: String, // This will store the filename of the uploaded image
    default: '',  // It's optional, so we set the default as an empty string
  },
  status: {
    type: String,
    enum: ["Pending", "Processing", "Shipping", "Delivered"], // Restrict to valid statuses
    default: "Pending",
  },
  deliveredAt: {
    type: Date, // To record when the order was delivered
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  budget: {  // New field
    type: Number,
    required: [true, 'Please enter the budget'],
  },
  deliveryDeadline: {  // New field
    type: Date,
    required: [true, 'Please specify the delivery deadline'],
  },
  shippingAddress: {  // New field
    type: String,
    required: [true, 'Please enter the shipping address'],
  },
  packagingRequirements: {  // Optional field
    type: String,
    default: '',
  },
  supplierLocationPreference: {  // Optional field
    type: String,
    default: '',
  },

    paymentInfo: {
      id: { type: String },
      status: { type: String },
      type: { type: String },
    },
    
    paidAt: { type: Date },
  
    acceptedOffer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RFQ",
      default: null, // Default to null when no offer is accepted yet
    },


});

module.exports = mongoose.model('BulkOrder', bulkOrderSchema);
