const mongoose = require('mongoose');

// Define the reply schema
const replySchema = new mongoose.Schema({
  content: String,
  votes: { type: Number, default: 0 },
  replies: [this], // Recursive reference to allow nested replies
  name: { type: String, required: true }, 
  createdAt: { type: Date, default: Date.now },
});

// Define the forum post schema
const forumPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  name: { type: String, required: true },
  votes: { type: Number, default: 0 },
  replies: [replySchema], // Use the nested reply schema
  createdAt: { type: Date, default: Date.now },
});

// Create and export the ForumPost model
const ForumPost = mongoose.model('ForumPost', forumPostSchema);
module.exports = ForumPost;