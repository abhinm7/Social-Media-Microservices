const express = require('express');
const { createPost, getAllPosts, getPost, deletePost } = require('../controllers/post-controller');
const { authenticateRequest } = require('../middlewares/authMiddleware')

const router = express.Router();

router.use(authenticateRequest);

router.post('/create-post', createPost);
router.get('/all-posts', getAllPosts);
router.get('/:id', getPost);
router.delete('/:id', deletePost);

module.exports = router; 