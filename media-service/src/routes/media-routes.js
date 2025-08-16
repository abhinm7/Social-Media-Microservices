const express = require('express');
const multer = require('multer');

const { uploadMedia, getAllMedia } = require('../controllers/media-controller');
const logger = require('../utils/logger');
const { authenticateRequest } = require('../middlewares/authMiddleware');
const { error } = require('winston');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    }
}).single('file');

router.post('/upload', authenticateRequest, (req, res, next) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            logger.error('multer error while uploading');
            return res.status(400).json({
                message: 'multer error while uploading',
                error: err.error,
                stack: err.stack
            });
        }
        else if (err) {
            logger.error('unknown error while uploading');
            return res.status(500).json({
                message: 'unnown error while uploading',
                error: err.error,
                stack: err.stack
            });
        }

        if (!req.file) {
            return res.status(400).json({
                message: 'file not found'
            })
        }

        next();


    })
}, uploadMedia);
router.get('/get-media', authenticateRequest, getAllMedia);

module.exports = router;