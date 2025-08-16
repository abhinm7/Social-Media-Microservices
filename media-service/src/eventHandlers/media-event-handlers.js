const Media = require("../models/Media");
const { deleteMediaFromCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger");

const handlePostDeleted = async (event) => {
    console.log(event, "event event event") 
    const { postId, mediaIDs } = event;
    try {
        const mediaToDelete = await Media.find({ _id: { $in: mediaIDs } });
        console.log("media list to delete",mediaToDelete);
        
        for (const media of mediaToDelete) {
            await deleteMediaFromCloudinary(media.publicId);
            await Media.findByIdAndDelete(media._id);

            logger.info(`Deleted media ${media._id} associated with this deleted post ${postId}`);
        }
        logger.info(`Processed deletion of media of post ID ${postId}`)

    } catch (e) {
        logger.info('failed to delete media', e)
    }
}

module.exports = { handlePostDeleted }