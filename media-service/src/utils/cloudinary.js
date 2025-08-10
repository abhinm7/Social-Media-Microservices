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
                    resolve();
                }
            });
        uploadStream.end(file.buffer);

    })
}

module.exports = { uploadMediaToCloudinary };