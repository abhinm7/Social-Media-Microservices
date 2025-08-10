const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema({
    mediaId: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    MimeType: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

const Media = mongoose.model('Media', MediaSchema);
module.exports = Media;