const logger = require('../utils/logger');
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

        const { originalName, mimeType, buffer } = req.file;
        const userId = req.user.userId;

        logger.info(`file details: name=${originalName},type=${mimeType}`);
        logger.info('uploading to cloudinary ...');

        const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file)
        logger.info(`Cloudinary upload successfully. Public Id: - ${cloudinaryUploadResult.public_id}`)


        const newlyCreatedMedia = new Media({
            publicId: cloudinaryUploadResult.public_id,
            originalName,
            mimeType,
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

module.exports = { uploadMedia };