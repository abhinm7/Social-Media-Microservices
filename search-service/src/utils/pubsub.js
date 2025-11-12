const { PubSub } = require('@google-cloud/pubsub');
const logger = require('./logger');

const pubSubClient = new PubSub({
    projectId: process.env.GCP_PROJECT_ID || 'notional-cocoa-470007-p5'
});

const SUBSCRIPTION_NAME = 'search-service-subscription';

const startSubscription = (routingKey, callback) => {
    const subscription = pubSubClient.subscription(SUBSCRIPTION_NAME);

    const messageHandler = (message) => {
        logger.info(`Received message ${message.id}:`);

        if (message.attributes.routingKey === routingKey) {
            try {
                const content = JSON.parse(message.data.toString());
                logger.info(`Processing event: ${routingKey}`);
                callback(content);
            } catch (e) {
                logger.error('Error processing message:', e);
            }
        } else {
            logger.info(`Ignoring event: ${message.attributes.routingKey}`);
        }

        message.ack();
    };

    const errorHandler = (error) => {
        logger.error(`Pub/Sub Error: ${error.message}`);
    };

    subscription.on('message', messageHandler);
    subscription.on('error', errorHandler);
    
    logger.info(`Subscribed to ${SUBSCRIPTION_NAME}, listening for '${routingKey}'`);
}

module.exports = { startSubscription };