const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    workshopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workshop",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "PKR",
    },
    stripePaymentId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "succeeded", "failed"],
      default: "pending",
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
