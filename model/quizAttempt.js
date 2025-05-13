const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  workshopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workshop',
    required: true,
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
  },
  answers: [{
    questionId: mongoose.Schema.Types.ObjectId,
    selectedOption: Number,
    isCorrect: Boolean
  }],
  score: {
    type: Number,
    required: true
  },
  passed: {
    type: Boolean,
    required: true
  },
  attemptedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);