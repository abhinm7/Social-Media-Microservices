const Search = require("../models/Search");
const logger = require("../utils/logger")

const handlePostCreated = async (event) => {
    try {
        const newSearchPost = new Search({
            postId: event.postId,
            userId: event.userId,
            content: event.content,
            createdAt: event.createdAt
        })
        await newSearchPost.save()
        logger.info(`Search post created: ${event.postId}, search post id: ${newSearchPost._id.toString()}`);
    } catch (e) {
        logger.error('error handling post creation event');
    }
}
const handlePostDeleted = async (event) => {
    try {
        await Search.findOneAndDelete({ postId: event.postId });
        logger.info(`Search post deleted: ${event.postId}`);

    } catch (e) {
        logger.error('error handling post deletion event', e);
    }
}
module.exports = { handlePostCreated, handlePostDeleted }