require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const Redis = require('ioredis');
const cors = require('cors');

const connectDB = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');
const logger = require('./utils/logger');
const { connectRabbitMQ, consumeEvent } = require('./utils/rabbitmq');
const searchRoutes = require('./routes/search-routes');
const { handlePostCreated, handlePostDeleted } = require('./eventHandlers/search-event-handlers')

const app = express();
connectDB();
const RedisClient = new Redis(process.env.REDIS_URL);
const PORT = process.env.PORT

//middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    logger.info(`Recieved ${req.method} request to ${req.url}`);
    logger.info(`Request Query: ${JSON.stringify(req.query)}`);
    next();
})

app.use('/api/search', searchRoutes);

app.use(errorHandler);

const startServer = async (port) => {
    try {
        await connectRabbitMQ();
        await consumeEvent('post.created', handlePostCreated);
        await consumeEvent('post.deleted', handlePostDeleted);

        app.listen(port, () => {
            logger.info(`Search service is running on the port: ${port}`)
        })
    } catch (e) {
        logger.error('failed to start search service.');
    }
}
startServer(PORT);