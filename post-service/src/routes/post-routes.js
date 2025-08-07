const express = require('express');
const { createPost, getAllPosts } = require('../controllers/post-controller');
const { authenticateRequest } = require('../middlewares/authMiddleware')

const router = express.Router();

router.use(authenticateRequest);

router.post('/create-post', createPost);
router.post('/all-posts', getAllPosts);

module.exports = router;