const amqp = require('amqplib');
const logger = require('./logger');

let connection = null;
let channel = null;

const EXCHANGE_NAME = 'facebook_events';
async function connectRabbitMQ() {
    try {
        connection = await amqp.connect(process.env.RABBITMQ_URL);
        channel = await connection.createChannel();

        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: false });
        logger.info("Connected to rabbit mq");
        return channel;
    } catch (e) {
        logger.error('Error connetcing RabbitMQ', e);
    }
}

const publishEvent = async (routingKey, message) => {
    if (!channel) {
        await connectRabbitMQ();
    }
    channel.publish(EXCHANGE_NAME, routingKey, Buffer.from(JSON.stringify(message)));
    logger.info(`Event Published ${routingKey}`);
}

module.exports = { connectRabbitMQ, publishEvent };