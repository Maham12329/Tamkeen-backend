const express = require('express');
const router = express.Router();
const ForumPost = require('../model/forumPost');

// Get all posts
router.get('/posts', async (req, res) => {
  try {
    const posts = await ForumPost.find().sort({ votes: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Create a new post
router.post('/posts', async (req, res) => {
  const { title, content, name } = req.body;

  if (!title || !content || !name) {
    return res.status(400).json({ error: 'Title, content, and name are required' });
  }

  try {
    const newPost = new ForumPost({ title, content, name });
    await newPost.save();
    res.json(newPost);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Vote on a post
router.post('/posts/:postId/vote', async (req, res) => {
  const { postId } = req.params;
  const { voteType } = req.body;
  try {
    const post = await ForumPost.findById(postId);
    if (voteType === 'upvote') {
      post.votes += 1;
    } else if (voteType === 'downvote') {
      post.votes -= 1;
    }
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'Failed to vote on post' });
  }
});

// Add a reply to a post
router.post('/posts/:postId/reply', async (req, res) => {
  const { postId } = req.params;
  const { content, name } = req.body;

  try {
    const post = await ForumPost.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    post.replies.push({ content, name }); // Include the authenticated user's name
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

router.get('/posts/:postId', async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

router.post('/posts/:postId/replies/:replyId/vote', async (req, res) => {
  const { postId, replyId } = req.params;
  const { voteType } = req.body;

  try {
    const post = await ForumPost.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const reply = post.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    if (voteType === 'upvote') {
      reply.votes += 1;
    } else if (voteType === 'downvote') {
      reply.votes -= 1;
    }

    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'Failed to vote on reply' });
  }
});

router.post('/posts/:postId/replies/:replyId/reply', async (req, res) => {
  const { postId, replyId } = req.params;
  const { content } = req.body;

  try {
    const post = await ForumPost.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const parentReply = post.replies.id(replyId);
    if (!parentReply) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    parentReply.replies.push({ content });
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add nested reply' });
  }
});

router.post('/posts/:postId/replies/:replyId/vote', async (req, res) => {
  const { postId, replyId } = req.params;
  const { voteType } = req.body;

  try {
    const post = await ForumPost.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const reply = post.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    if (voteType === 'upvote') {
      reply.votes += 1;
    } else if (voteType === 'downvote') {
      reply.votes -= 1;
    }

    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'Failed to vote on reply' });
  }
});

module.exports = router; // Export the router