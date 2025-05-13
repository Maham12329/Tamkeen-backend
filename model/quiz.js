// models/quiz.js
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Question text is required'],
  },
  options: [{
    type: String,
    required: [true, 'Options are required'],
  }],
  correctAnswer: {
    type: Number,  // Index of the correct option
    required: [true, 'Correct answer is required'],
  },
  explanation: {
    type: String,
    required: [true, 'Explanation for the answer is required'],
  }
});

const quizSchema = new mongoose.Schema({
  workshopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workshop',
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Quiz title is required'],
  },
  description: {
    type: String,
    required: [true, 'Quiz description is required'],
  },
  questions: [questionSchema],
  passingScore: {
    type: Number,
    required: [true, 'Passing score percentage is required'],
    min: 0,
    max: 100,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Quiz', quizSchema);