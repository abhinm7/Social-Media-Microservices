require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const logger = require('./utils/logger')
const proxy = require('express-http-proxy');
const errorHandler = require('./middleware/errorHandler');
const { validateToken } = require('./middleware/authMiddleware');
const ipRangeCheck = require("ip-range-check");

const app = express();
const PORT = process.env.PORT || 3000;

const RedisClient = new Redis(process.env.REDIS_URL);

app.use(helmet());

app.use(cors({
  origin: ["http://localhost:4000", "https://yourfrontend.com"],
  credentials: true
}));

app.use(express.json());

app.get('/healthz', (req, res) => {
  res.status(200).send('API Gateway is alive :1');
});
//rate limiting
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

app.use(rateLimiter)

app.use((req, res, next) => {
    logger.info(`Recieved ${req.method} request to ${req.url}`);
    logger.info(`Request Body ${req.body}`);
    next();
})

const proxyOptions = {
    proxyReqPathResolver: (req) => {
        return req.originalUrl.replace(/^\/v1/, '/api');
    },
    proxyErrorHandler: (err, res, next) => {
        logger.error(`Proxy error: ${err.message}`)
        res.status(500).json({
            message: 'internal server error',
            error: err.message
        })
    }
}

app.use('/v1/auth', proxy(process.env.IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        proxyReqOpts.headers["Content-Type"] = "application/json"
        return proxyReqOpts;
    },
    userResDecorator: (proxyRes, ProxyResData, userReq, userRes) => {
        logger.info(`response recieved from identity-service :${proxyRes.statusCode}`);
        return ProxyResData;
    }
}));

app.use('/v1/posts', validateToken, proxy(process.env.POST_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        proxyReqOpts.headers['Content-Type'] = "application/json"
        proxyReqOpts.headers['x-user-id'] = srcReq.user.userId;

        return proxyReqOpts;
    },
    userResDecorator: (proxyRes, ProxyResData, userReq, userRes) => {
        logger.info(`response recieved from post-service :${proxyRes.statusCode}`);
        return ProxyResData;
    }
}))

app.use('/v1/media', validateToken, proxy(process.env.MEDIA_SERVICE_URL, {
    ...proxyOptions, proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        proxyReqOpts.headers['x-user-id'] = srcReq.user.userId;
        if (!srcReq.headers['content-type'].startsWith('multipart/form-data')) {
            proxyReqOpts.headers['Content-Type'] = "application/json"
        }
        return proxyReqOpts;
    }
}))

app.use('/v1/search', validateToken, proxy(process.env.SEARCH_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        proxyReqOpts.headers['Content-Type'] = "application/json"
        proxyReqOpts.headers['x-user-id'] = srcReq.user.userId;

        return proxyReqOpts;
    },
    userResDecorator: (proxyRes, ProxyResData, userReq, userRes) => {
        logger.info(`response recieved from search-service :${proxyRes.statusCode}`);
        return ProxyResData;
    }
}))

app.use(errorHandler);

app.listen(PORT, () => {
    logger.info(`API Gateway is Running on PORT : ${PORT}`);
    logger.info(`Identity Service is Running on ${process.env.IDENTITY_SERVICE_URL}`);
    logger.info(`Post Service is Running on ${process.env.POST_SERVICE_URL}`);
    logger.info(`Media Service is Running on ${process.env.MEDIA_SERVICE_URL}`);
    logger.info(`Search Service is Running on ${process.env.SEARCH_SERVICE_URL}`);
    logger.info(`Redis is Running on ${process.env.REDIS_URL}`);
})





