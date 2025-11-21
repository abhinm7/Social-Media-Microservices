const Post = require('../models/Post');
const Like = require('../models/Like');
const Comment = require('../models/Comment');
const logger = require('../utils/logger');
const axios = require('axios');

const clearPostCache = async (req, postId) => {
    if (!req.redisClient) return;

    try {
        // Clear the single post details
        await req.redisClient.del(`post:${postId}`);

        // Clear the feed lists
        const keys = await req.redisClient.keys("posts:*");
        if (keys.length > 0) {
            await req.redisClient.del(keys);
        }
    } catch (error) {
        logger.error("Cache clear failed", error);
    }
};

const likePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.userId;

        const existingLike = await Like.findOne({ post: postId, user: userId });
        let updatedPost;
        if (existingLike) {
            // If liked, unlike 
            await Like.findByIdAndDelete(existingLike._id);
            // Atomic decrement
            updatedPost = await Post.findByIdAndUpdate(
                postId,
                { $inc: { likeCount: -1 } },
                { new: true }
            );

            //clear cache
            await clearPostCache(req, postId);
            return res.status(200).json({ message: 'Post unliked', liked: false, likeCount: updatedPost.likeCount });
        }

        // Create Like
        const newLike = new Like({ post: postId, user: userId });
        await newLike.save();

        //clear cache
        await clearPostCache(req, postId);
        // Atomic Increment
        await Post.findByIdAndUpdate(postId, { $inc: { likeCount: 1 } });

        res.status(200).json({ message: 'Post liked', liked: true });

    } catch (error) {
        logger.error('Error liking post', error);
        res.status(500).json({ success: false, message: 'Error processing like' });
    }
};

const addComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { content } = req.body;
        const userId = req.user.userId;

        if (!content) {
            return res.status(400).json({ success: false, message: 'Comment content required' });
        }

        // Create Comment
        const newComment = new Comment({ post: postId, user: userId, content });
        await newComment.save();

        // Atomic Increment
        await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });

        //clear cache
        await clearPostCache(req, postId);

        res.status(201).json({ success: true, message: 'Comment added', comment: newComment });

    } catch (error) {
        logger.error('Error adding comment', error);
        res.status(500).json({ success: false, message: 'Error adding comment' });
    }
};

const getComments = async (req, res) => {
    try {
        const { postId } = req.params;

        const comments = await Comment.find({ post: postId })
            .sort({ createdAt: -1 })
            .limit(20);

        if (!comments.length) {
            return res.status(200).json({ success: true, comments: [] });
        }

        // Extract User IDs from comments
        const userIds = [...new Set(comments.map(c => c.user.toString()))];

        // Fetch User Details from Identity Service
        let userMap = {};

        if (userIds.length > 0) {
            try {
                const userResponse = await axios.get(`${process.env.IDENTITY_SERVICE_URL}/api/auth/get-many-users`, {
                    params: { ids: userIds.join(',') }
                });

                if (userResponse.data && userResponse.data.users) {
                    userResponse.data.users.forEach(u => {
                        userMap[u._id] = u;
                    });
                }
            } catch (err) {
                logger.warn("Failed to fetch user details for comments", err.message);
            }
        }

        // Merge Comment + User Data
        const populatedComments = comments.map(comment => {
            const c = comment.toObject();
            c.user = userMap[c.user.toString()] || { _id: c.user, username: 'Unknown' }; // Fallback
            return c;
        });

        res.status(200).json({ success: true, comments: populatedComments });

    } catch (error) {
        logger.error('Error fetching comments', error);
        res.status(500).json({ success: false, message: 'Error fetching comments' });
    }
};

module.exports = { likePost, addComment, getComments };