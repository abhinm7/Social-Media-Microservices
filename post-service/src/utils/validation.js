const Joi = require('joi');

const validateCreatePost = (data) => {
    const schema = Joi.object({
        content: Joi.string().min(3).max(5000).required()
    })
    return schema.validate(data)
}

module.exports = { validateCreatePost };
