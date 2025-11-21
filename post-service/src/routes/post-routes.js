const express = require('express');
const { createPost, getAllPosts, getPost, deletePost } = require('../controllers/post-controller');
const { authenticateRequest } = require('../middlewares/authMiddleware');
const { likePost, addComment, getComments } = require('../controllers/interaction-controller');

const router = express.Router();

//post public routes
router.get('/all-posts', getAllPosts);
//post private routes
router.post('/create-post',authenticateRequest, createPost);
router.get('/:id', authenticateRequest, getPost);
router.delete('/:id', authenticateRequest, deletePost);

//interaction private routes
router.post('/:postId/like', authenticateRequest, likePost);       
router.post('/:postId/comment', authenticateRequest, addComment);  
//interaction public routes
router.get('/:postId/comments', getComments);

module.exports = router; 