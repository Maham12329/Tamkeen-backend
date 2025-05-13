// models/service.js
const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your service name!"],
  },
  description: {
    type: String,
    required: [true, "Please enter your service description!"],
  },
  location: {
    type: String,
    required: [true, "Please enter the service location!"],
  },
  contactInfo: {
    type: String,
    required: [true, "Please enter the contact information!"],
  },
  availability: {
    type: Map,
    of: {
      startTime: String,
      endTime: String,
      available: Boolean,
    },
    default: {},
  },
 
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  shopId: {
    type: String,
    required: true,
  },
  shop: {
    type: Object,
    required: true,
  },
  
});

module.exports = mongoose.model("Service", serviceSchema);
