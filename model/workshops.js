const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Video title is required'],
  },
  youtubeUrl: {
    type: String,
    required: [true, 'YouTube video URL is required'],
    validate: {
      validator: function(url) {
        // Enhanced URL validation that accepts various YouTube URL formats
        if (!url) return false;
        
        // Check if it's a URL
        try {
          new URL(url);
        } catch (e) {
          return false;
        }
        
        // Check if it's from YouTube (includes youtube.com or youtu.be)
        const isYouTubeDomain = url.includes('youtube.com') || url.includes('youtu.be');
        if (!isYouTubeDomain) return false;
        
        // Consider it valid if it's from YouTube domain
        return true;
      },
      message: "Please provide a valid YouTube video URL"
    }
  },
  duration: {
    type: String,
    required: [true, 'Duration is required'],
  },
  order: {
    type: Number,
    required: true,
  },
  thumbnail: {
    type: String,
  }
});

const workshopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Workshop name is required'],
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
  },
  videos: [videoSchema],
  totalDuration: {
    type: String,
    required: [true, 'Total duration is required'],
  },
  requirements: {
    type: String,
    required: false,
  },
  level: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Workshop', workshopSchema);
