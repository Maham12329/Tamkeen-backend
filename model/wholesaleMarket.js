const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WholesaleMarketSchema = new Schema({
  supplierName: {
    type: String,
    required: [true, "Please enter supplier name!"],
  },
  materialType: {
    type: [String],  // Changed to array of strings
    required: [true, "Please enter at least one category type!"],
  },
  location: {
    type: String,
    required: true,
  },
  contactInfo: {
    type: String,    // Changed to String to handle formatted phone numbers
    required: false, // Made optional
    validate: {
      validator: function(v) {
        return !v || /^0[3][0-5]\d{8}$/.test(v); // Validates Pakistani mobile numbers
      },
      message: props => `${props.value} is not a valid Pakistani mobile number!`
    }
  }
}, { timestamps: true });

const WholesaleMarket = mongoose.model('WholesaleMarket', WholesaleMarketSchema);
module.exports = WholesaleMarket;