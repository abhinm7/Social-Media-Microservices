require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const logger = require('./logger');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

const uploadMediaToCloudinary = (file) => { 
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({
            resource_type: "auto"
        },
            (err, result) => {
                if (err) {
                    logger.error('Error while uploading to cloudinary', err);
                    reject(err);

                } else {
                    resolve(result);
                }
            });
        uploadStream.end(file.buffer);

    })
}

const deleteMediaFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        logger.info('Media deleted from the cloud storage', publicId);
        return result;
    } catch (e) {
        logger.error('Error deleting media from cloudinary', e)
        throw e
    }
}

module.exports = { uploadMediaToCloudinary, deleteMediaFromCloudinary };