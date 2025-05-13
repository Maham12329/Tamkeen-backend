const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  certificateId: {
    type: String,
    unique: true,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  workshopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workshop',
    required: true
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  score: {
    type: Number,
    required: true
  },
  verificationUrl: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Certificate', certificateSchema);