require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const logger = require('./utils/logger');
const proxy = require('express-http-proxy');
const errorHandler = require('./middleware/errorHandler');
const { validateToken } = require('./middleware/authMiddleware');
const ipRangeCheck = require('ip-range-check');

const app = express();
const PORT = process.env.PORT || 3000;

const RedisClient = new Redis(process.env.REDIS_URL);

app.use(helmet());
app.use(cors({
    origin: ["http://localhost:4000", "https://bloomsocial.vercel.app"],
    credentials: true
}));
app.use(express.json());

app.get('/healthz', (req, res) => {
    res.status(200).send('API Gateway is alive :1');
});

// Rate limiting
const gcpHealthCheckRanges = [
    "35.191.0.0/16",
    "130.211.0.0/22"
];

const rateLimiter = rateLimit({
    windowMs: 115 * 60 * 1000,
    max: 100,
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
        sendCommand: (...args) => RedisClient.call(...args),
    }),
    skip: (req) => {
        if (req.path === "/healthz") return true;
        const ip = req.ip.replace("::ffff:", "");
        return ipRangeCheck(ip, gcpHealthCheckRanges);
    }
});

app.use(rateLimiter);

app.use((req, res, next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request Body ${JSON.stringify(req.body)}`);
    next();
});

const proxyOptions = {
    proxyReqPathResolver: (req) => {
        return req.originalUrl.replace(/^\/v1/, '/api');
    },
    proxyErrorHandler: (err, res, next) => {
        logger.error(`Proxy error: ${err.message}`);
        res.status(500).json({
            message: 'internal server error',
            error: err.message,
            success: false
        });
    }
};

// Function to create a proxy middleware
const createProxyMiddleware = (target, serviceName, requiresAuth = false, extraOptions = {}) => {
    const middleware = proxy(target, {
        ...proxyOptions,
        ...extraOptions,
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            proxyReqOpts.headers['Content-Type'] = 'application/json';
            if (requiresAuth) {
                proxyReqOpts.headers['x-user-id'] = srcReq.user.userId;
            }
            if (serviceName === 'media-service') {
                const contentType = srcReq.headers['content-type'];
                if (contentType && contentType.startsWith('multipart/form-data')) {
                    delete proxyReqOpts.headers['Content-Type'];
                }
            }
            return proxyReqOpts;
        },
        userResDecorator: (proxyRes, proxyResData) => {
            logger.info(`Response received from ${serviceName}: ${proxyRes.statusCode}`);
            return proxyResData;
        }
    });

    return requiresAuth ? [validateToken, middleware] : [middleware];
};

// Service configuration
const services = [
    { name: 'auth-service', path: '/v1/auth', url: process.env.IDENTITY_SERVICE_URL, auth: false },
    { name: 'post-service', path: '/v1/posts', url: process.env.POST_SERVICE_URL, auth: true },
    { name: 'media-service', path: '/v1/media', url: process.env.MEDIA_SERVICE_URL, auth: true, extraOptions: { limit: '15mb' } },
    { name: 'search-service', path: '/v1/search', url: process.env.SEARCH_SERVICE_URL, auth: true }
];

// Register proxies for each service
services.forEach(service => {
    app.use(service.path, ...createProxyMiddleware(service.url, service.name, service.auth, service.extraOptions));
});

app.use(errorHandler);

app.listen(PORT, () => {
    logger.info(`API Gateway is Running on PORT: ${PORT}`);
    services.forEach(service => {
        logger.info(`${service.name} is Running on ${service.url}`);
    });
    logger.info(`Redis is Running on ${process.env.REDIS_URL}`);
});
