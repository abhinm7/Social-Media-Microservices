const mongoose = require('mongoose');
const logger = require('../utils/logger');
require('dotenv').config();

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in .env file');
    }
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('connected to mongodb');
  } catch (err) {
    logger.error('mongo connection error', err);
    process.exit(1);
  }
};

module.exports = connectDB;
