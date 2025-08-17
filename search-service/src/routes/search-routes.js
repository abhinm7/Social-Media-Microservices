const express = require('express');
const { searchController } = require('../controllers/search-controller');
const { authenticateRequest } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authenticateRequest)

router.get('/posts', searchController);

module.exports = router