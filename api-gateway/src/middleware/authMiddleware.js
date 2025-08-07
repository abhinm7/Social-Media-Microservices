const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

const validateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        logger.error('token not found, autherization error');
        return res.status(500).json({
            message: 'token not found, authentication required',
            success: false
        })
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            logger.error('token verification failed');
            return res.status(500).json({
                message: 'invalid token',
                success: false
            })
        }
        req.user = user;
        next();
    })
}

module.exports = { validateToken };