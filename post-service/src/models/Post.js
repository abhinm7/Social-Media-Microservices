const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    mediaIDs: [
        {
            type: String
        }
    ],
    likeCount: {
        type: Number,
        default: 0
    },
    commentCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
}, {
    timestamps: true
})

postSchema.index({ content: 'text' })

const Post = mongoose.model('Post', postSchema);

module.exports = Post