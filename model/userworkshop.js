// userWorkshop.js
const mongoose = require("mongoose");

const userWorkshopSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  workshopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Workshop",
    required: true,
  },
  videoProgress: {
    type: Map,
    of: Number,
    default: {},
  },
  totalProgress: {  // Added total progress field
    type: Number,
    default: 0
  },
  completed: {
    type: Boolean,
    default: false,
  },
  lastWatched: {
    type: Date,
    default: Date.now,
  },
  lastVideoIndex: {
    type: Number,
    default: 0
  },
  lastVideoTime: {
    type: Number,
    default: 0
  },
  // Add these fields to your existing schema
certified: {
  type: Boolean,
  default: false
},
certificateId: {
  type: String,

  
},
certificationDate: {
  type: Date
}
,
paidCertificates: {
  type: Map,
  of: Boolean, // workshopId -> paidStatus
default:{} }
  
});

module.exports = mongoose.model("UserWorkshop", userWorkshopSchema);