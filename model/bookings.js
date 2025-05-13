const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Service",
    required: true,
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  dates: [
    {
      day: {
        type: String,
        required: true,
      },
      timeSlot: {
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
      },
    },
  ],
  status: {
    type: String,
    enum: ["pending", "confirmed", "canceled"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Booking", bookingSchema);
