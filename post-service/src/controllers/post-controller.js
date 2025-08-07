const Post = require('../models/Post');
const logger = require('../utils/logger');
const { validateCreatePost } = require('../utils/validation');

const deleteCache = async (req, input) => {
    const keys = await req.redisClient.keys("posts:*");
    if (keys) {
        await req.redisClient.del(keys);
    }
}

const createPost = async (req, res) => {
    logger.info("Create Post endpoint hit.")
    try {
        const { error } = validateCreatePost(req.body);
        if (error) {
            logger.warn("Validation error", error.details[0].message);
            return res.status(400).json({
                success: false,
                message: error.details[0].message,
            });
        }
        const { content, mediaIDs } = req.body;
        const newPost = new Post({
            user: req.user.userId,
            content: content,
            mediaIDs: mediaIDs || []
        })

        await newPost.save();
        await deletePost(req, newPost._id.toString());
        logger.info("Post created succesfully", newPost);
        res.status(201).json({
            message: 'post created succesfully',
            success: true
        })

    } catch (err) {
        logger.error('error while creating post', err)
        res.status(500).json({
            message: 'error creating post',
            success: false
        })
    }
}

const getPost = async () => {
    try {

    } catch (err) {
        logger.error('error while fetching all post', err)
        res.status(500).json({
            message: 'error fetching all post',
            success: false
        })
    }
}

const getAllPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;

        const cacheKey = `posts:${page}:${limit}`;
        const cachedPost = await req.redisClient.get(cacheKey);

        if (cachedPost) {
            return res.json(JSON.parse(cachedPost));
        }
        const post = await Post.find({}).sort({ createdAt: -1 }).skip(startIndex).limit(limit);
        const totalPost = await Post.countDocuments();

        const results = {
            post,
            currentPage: page,
            totalPages: Math.ceil(totalPost / limit),
            totalPosts: totalPost
        }

        await req.redisClient.setex(cacheKey, 300, JSON.stringify(results));

        res.json(results);


    } catch (err) {
        logger.error('error while fetching post by ID', err)
        res.status(500).json({
            message: 'error fetching post by ID',
            success: false
        })
    }
}

const deletePost = async () => {
    try {
    } catch (err) {
        logger.error('error while removing post', err)
        res.status(500).json({
            message: 'error deleting post',
            success: false
        })
    }
}

module.exports = { createPost, getPost, getAllPosts, deletePost };