const Post = require('../models/Post');
const logger = require('../utils/logger');
const axios = require('axios');
const { validateCreatePost } = require('../utils/validation');

// const { publishEvent } = require('../utils/rabbitmq');
const { publishEvent } = require('../utils/pubsub');

const deleteCache = async (req, input) => {
    const cacheKey = `post:${input}`;
    await req.redisClient.del(cacheKey);
    
    const keys = await req.redisClient.keys("posts:*");
    if (keys.length > 0) {
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
        await publishEvent('post.created', {
            postId: newPost._id.toString(),
            userId: newPost.user.toString(),
            content: newPost.content,
            createdAt: newPost.createdAt
        })
        await deleteCache(req, newPost._id.toString());
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

const getAllPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;

        const cacheKey = `posts:page=${page}:limit=${limit}`;
        const cachedData = await req.redisClient.get(cacheKey);

        if (cachedData) {
            logger.info(`Serving posts for page ${page} from cache.`);
            return res.status(200).json(JSON.parse(cachedData));
        }

        const posts = await Post.find({}).sort({ createdAt: -1 }).skip(startIndex).limit(limit);
        const totalPosts = await Post.countDocuments();

        const allMediaIds = posts.reduce((acc, post) => acc.concat(post.mediaIDs), []);
        const allUserIds = [...new Set(posts.map(post => post.user.toString()))];

        let mediaMap = {};
        let userMap = {};

        const mediaPromise = allMediaIds.length > 0
            ? axios.get(`${process.env.MEDIA_SERVICE_URL}/api/media/get-media?ids=${allMediaIds.join(',')}`)
            : Promise.resolve(null);

        const userPromise = allUserIds.length > 0
            ? axios.get(`${process.env.IDENTITY_SERVICE_URL}/api/auth/get-many-users?ids=${allUserIds.join(',')}`)
            : Promise.resolve(null);
        

        const [mediaResponse, userResponse] = await Promise.all([mediaPromise, userPromise]);
         if (mediaResponse) {
            mediaResponse.data.results.forEach(mediaItem => {
                mediaMap[mediaItem._id] = mediaItem;
            });
        }
        if (userResponse) {
            userResponse.data.users.forEach(userItem => {
                userMap[userItem._id] = userItem;
            });
        }

         const populatedPosts = posts.map(post => {
            const postObject = post.toObject();
            postObject.user = userMap[post.user.toString()];
            postObject.media = post.mediaIDs.map(id => mediaMap[id]).filter(Boolean);
            delete postObject.mediaIDs;
            return postObject;
        });
        
        const responseData = {
            totalPosts,
            populatedPosts
        };

        await req.redisClient.set(cacheKey, JSON.stringify(responseData), 'EX', 300);

        return res.status(200).json(responseData);

    } catch (error) {
        logger.error('Error in getAllPosts:', error.message || error);
        const status = error.response?.status || 500;
        return res.status(status).json({ message: 'Failed to fetch posts data', error: error.message });
    }
};


const getPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const cachekey = `post:${postId}`;
        const cachePost = await req.redisClient.get(cachekey);
        if (cachePost) {
            return res.json(JSON.parse(cachePost));
        }

        const postById = await Post.findById(postId);
        if (!postById) {
            return res.status(404).json({
                message: 'post not found',
                success: false
            });
        }

        await req.redisClient.setex(cachekey, 300, JSON.stringify(postById));
        res.status(201).json({
            postById
        })

    } catch (err) {
        logger.error('error while fetching all post', err);
        res.status(500).json({
            message: 'error fetching all post',
            success: false
        })
    }
}

const deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const deletedPost = await Post.findByIdAndDelete(postId);
        if (!deletedPost) {
            return res.status(404).json({
                message: 'post not found',
                success: false
            });
        }

        await publishEvent('post.deleted', {
            postId: deletedPost._id.toString(),
            userId: req.user.userId,
            mediaIDs: deletedPost.mediaIDs
        })

        await deleteCache(req, postId);
        res.json({
            message: 'post deleted succesfully'
        })
    } catch (err) {
        logger.error('error while removing post', err)
        res.status(500).json({
            message: 'error deleting post',
            success: false
        })
    }
}

module.exports = { createPost, getPost, getAllPosts, deletePost };