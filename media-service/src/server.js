require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose')
const cors = require("cors");
const helmet = require("helmet");
const mediaRoutes = require('./routes/media-routes')
const errorHandler = require('./middlewares/errorHandler');
const logger = require("./utils/logger");
const connectDB = require('./config/db')

const app = express()
const PORT = process.env.PORT || 3003

connectDB();

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use((req, res, next) => {
    logger.info(`Recieved ${req.method} request to ${req.url}`);
    logger.info(`Request Body : ${req.body}`);
    next();
});

app.use('/api/media', mediaRoutes);
app.use(errorHandler);

app.listen(PORT,()=>{
    logger.info(`Media service running on port ${PORT}`);
});

process.on("Unhandled rejection",(reason,promise)=>{
    logger.error("Unhandled Rejection at",promise, "reason:",reason);
})



