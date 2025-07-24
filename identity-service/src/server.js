require('dotenv').config();
const express = require('express');
const logger = require('./utils/logger');
const connectDB = require('./config/db');
const helmet = require('helmet');
const cors = require('cors');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const Redis = require('ioredis');
const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis')
const routes = require('./routes/identity-service')
const errorHandler = require('./middleware/errorHandler')

const app = express();
const PORT = process.env.PORT || 3001;

connectDB();
const redisClient = new Redis(process.env.REDIS_URI);

//middleware
app.use(helmet());
app.use(cors);
app.use(express.json());

app.use((req, res, next) => {
    logger.info(`Recieved ${req.method} request to ${req.url}`);
    logger.info(`Request Body ${req.body}`);
    next();
})

//DDoS protection
const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'middleware',
    points: 10,
    duration: 1
})

app.use((req, res, next) => {
    rateLimiter.consume(req.ip).then(() => {
        next()
    }).catch(() => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            message: 'Too many requests'
        })
    })
})

//IP based rate limit for sensitive endpoints
const sensitiveEndpointRateLimit = rateLimit({
    windowMs: 115 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            message: 'Too many requests'
        });
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    })
});

//apply sensitive endpoint ratelimiter to router
app.use('/api/auth/register', sensitiveEndpointRateLimit);

//Routes 
app.use('/api/auth', routes);

//error handler
app.use(errorHandler);

app.listen(PORT,()=>{
    logger.info(`identity service running on port ${PORT}`);
});

//unhandled promise rejection
process.on('unhandledRejection',(reason,promise)=>{
    logger.error('unhandled rejection at', promise, "reason:", reason)
})

