const logger = require('../utils/logger');
const Media = require('../models/Media')
const { uploadMediaToCloudinary } = require('../utils/cloudinary');


const uploadMedia = async (req, res) => {
    logger.info('Starting media upload');
    try {
        if (!req.file) {
            logger.error('file not found');
            return res.status(400).json({
                success: false,
                message: 'not found'
            });
        }

        const { originalname, mimetype, buffer } = req.file;
        const userId = req.user.userId;

        logger.info(`file details: name=${originalname},type=${mimetype}`);
        logger.info('uploading to cloudinary ...');

        const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file)
        logger.info(`Cloudinary upload successfully. Public Id: - ${cloudinaryUploadResult.public_id}`)

        const newlyCreatedMedia = new Media({
            publicId: cloudinaryUploadResult.public_id,
            originalName: originalname,
            mimeType: mimetype,
            url: cloudinaryUploadResult.secure_url,
            userId
        })

        await newlyCreatedMedia.save();

        res.status(201).json({
            success: true,
            mediaId: newlyCreatedMedia._id,
            url: newlyCreatedMedia.url,
            message: "Media upload is successfully",
        });
    }
    catch (e) {
        logger.error("Error uploading media", e);
        res.status(500).json({
            success: false,
            message: 'error uploading media'
        })
    }
}

const getAllMedia = async (req, res) => {
    try {
        const results = await Media.find({});
        res.json({
            results
        });
    } catch (e) {
        logger.error("Error fetching media", e);
        res.status(500).json({
            success: false,
            message: 'error fetching media'
        })
    }
}

module.exports = { uploadMedia,getAllMedia };