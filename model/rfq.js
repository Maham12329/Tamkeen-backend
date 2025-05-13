// models/RFQ.js
const mongoose = require('mongoose');

const rfqSchema = new mongoose.Schema({
  bulkOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BulkOrder',
    required: true,
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  price: { 
    type: Number,
     default: 0,
     required: true
     }, // Proposed price by seller
  pricePerUnit: { 
    type: Number, 
    default: 0,
    required: true
   }, // New field: Price per unit

  deliveryTime: {
     type: Number,
      default: 0,
      required: true
     }, // Proposed delivery time in days
  terms: {
     type: String,
      default: '',
      required: false
     }, // Custom terms from seller
  warranty: {
     type: String,
      default: '',
      required: false 
     }, // New field: Warranty/Return Policy

  availableQuantity: { 
    type: Number,
     default: 0,
     required: true
     }, // New field: Available quantity
  expirationDate: 
  { type: Date,
    required: false
   }, // New field: Offer expiration date
  packagingDetails: { 
    type: String, 
    default: '' ,
    required: false },
    
  status: { type: String, default: 'Pending' },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('RFQ', rfqSchema);
