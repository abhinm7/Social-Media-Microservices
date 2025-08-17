const Search = require("../models/Search");
const logger = require("../utils/logger")


const searchController = async (req, res) => {
    
    logger.info(`Search endpoint hit...`);
    try {
        const { query } = req.query;
        const results = await Search.find({
            $text: { $search: query }
        }, {
            score: { $meta: "textScore" }
        }).sort({
            score: { $meta: "textScore" }
        }).limit(10);

        res.json(results);  

    } catch (e) {
        logger.error('error while searching post', err)
        res.status(500).json({
            message: 'error searching post',
            success: false
        })
    }
}

module.exports = { searchController };