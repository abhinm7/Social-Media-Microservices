const logger = require("../utils/logger");

const authenticateRequest = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        logger.warn('please login to continue');
        res.status(401).json({
            success: false,
            message: 'user id not found'
        });
    }
    req.user = { userId };
    next();
}

module.exports = { authenticateRequest }