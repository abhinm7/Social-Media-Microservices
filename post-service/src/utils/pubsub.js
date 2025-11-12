const { PubSub } = require('@google-cloud/pubsub');
const logger = require('./logger');

const pubSubClient = new PubSub({
    projectId: process.env.GCP_PROJECT_ID || 'notional-cocoa-470007-p5'
});

const TOPIC_NAME = 'facebook-events-topic';


 // Publishes an event to the Google Pub/Sub topic.
 
const publishEvent = async (routingKey, message) => {
    try {
        const dataBuffer = Buffer.from(JSON.stringify(message));

        const attributes = {
            routingKey: routingKey 
        };

        const messageId = await pubSubClient
            .topic(TOPIC_NAME)
            .publishMessage({ data: dataBuffer, attributes: attributes });

        logger.info(`Event Published (${routingKey}) with message ID: ${messageId}`);

    } catch (error) {
        logger.error(`Error publishing event ${routingKey}:`, error);
    }
}

module.exports = { publishEvent };