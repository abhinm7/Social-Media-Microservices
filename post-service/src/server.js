require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const Redis = require('ioredis');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');
const logger = require('./utils/logger');
const { connectRabbitMQ } = require('./utils/rabbitmq');
const postRoutes = require('./routes/post-routes');

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();
const RedisClient = new Redis(process.env.REDIS_URL);

//middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    logger.info(`Recieved ${req.method} request to ${req.url}`);
    logger.info(`Request Body: ${JSON.stringify(req.body)}`);
    next();
})

app.use('/api/posts', (req, res, next) => {
    req.redisClient = RedisClient;
    next();
},
    postRoutes
);

app.use(errorHandler);

const startServer = async () => {

    try {
        await connectRabbitMQ()
        app.listen(PORT, () => {
            logger.info(`post service running on port ${PORT}`);
        });
    } catch (e) {
        logger.error('Failed to connect server', e);
    }
}
startServer();

//unhandled promise rejection

process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection at", promise, "reason:", reason);
});