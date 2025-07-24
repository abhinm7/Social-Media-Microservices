const logger = require("../utils/logger");
const User = require("../models/User")
const { validateRegistration } = require("../utils/validation");
const generateToken = require("../utils/generateToken");

const registerUser = async (req, res) => {
    logger.info('Register Endpoint hit...')
    try {
        const { error } = validateRegistration(req.body);
        if (error) {
            logger.warn("Validate Error", error.details[0].message);
            return res.status(400).json({
                success: false,
                message: error.details[0].message,
            })
        }
        const { email, password, username } = req.body;

        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            logger.warn("User already exists");
            return res.status(400).json({
                success: false,
                message: "User already exists"
            })
        }

        user = new User({username, password, email});
        user.save()
        logger.warn("User created succesfully", user._id);

        const { accessToken, refreshToken } = await generateToken(user);

        res.status(201).json({
            success:true,
            message:'User Registered Succesfully',
            accessToken,
            refreshToken
        })

    } catch (e) {
        logger.error('Registration Error',e)
        res.status(500).json({
            succes:false,
            message:'Internal server error'
        })
    }
}

module.exports = {registerUser};