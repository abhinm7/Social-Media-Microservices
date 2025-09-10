const logger = require("../utils/logger");
const User = require("../models/User")
const RefreshToken = require('../models/RefreshToken')
const { validateRegistration, validateLogin } = require("../utils/validation");
const generateToken = require("../utils/generateToken");
const { mongoose } = require("mongoose");
const { log } = require("winston");

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

        user = new User({ username, password, email });
        user.save()
        logger.warn("User created succesfully", user._id);

        const { accessToken, refreshToken } = await generateToken(user);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        res.status(201).json({
            success: true,
            message: 'User Registered Succesfully',
            accessToken,
        })

    } catch (e) {
        logger.error('Registration Error', e)
        res.status(500).json({
            succes: false,
            message: 'Internal server error'
        })
    }
}

const loginUser = async (req, res) => {

    logger.info("Login endpoint hit...");

    try {
        const { error } = validateLogin(req.body);

        if (error) {
            logger.warn("Validate Error", error.details[0].message);
            return res.status(400).json({
                success: false,
                message: error.details[0].message,
            })
        }

        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            logger.error("No user found with this email.");
            return res.status(400).json({
                message: 'invalid credentials',
                success: false
            })
        }

        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            logger.error("Password is incorrect");
            return res.status(400).json({
                message: 'invalid password',
                success: false
            })
        }

        const { accessToken, refreshToken } = await generateToken(user);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        })

        res.json({
            accessToken,
            userId: user._id
        })

    } catch (e) {
        logger.error("Registration error occured", e);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }

}

const refreshTokenUser = async (req, res) => {
    logger.info("Refresh token endpoint hit...");
    try {

        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            logger.warn("Refresh token not found");
            return res.status(400).json({
                success: false,
                message: "Refresh token not found",
            })
        }

        const storedToken = await RefreshToken.findOne({ token: refreshToken })
        if (!storedToken || storedToken.expiresAt < new Date()) {
            logger.warn("Invalid or expired Refresh token");
            return res.status(400).json({
                message: "invalid or expired refresh token",
                success: false
            })
        }

        const user = User.findById(storedToken.user);
        if (!user) {
            logger.warn("User not found for this token");
            return res.status(400).json({
                message: "User not found for this token",
                success: false
            })
        }

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await generateToken(user);
        await RefreshToken.deleteOne({ id: storedToken._id });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        res.json({
            accessToken: newAccessToken
        })

    } catch (err) {
        logger.error("Refresh token error occured", e);
        res.status(500).json({
            success: false,
            message: "Internal server error: refresh token",
        })
    }
}

const logoutUser = async (req, res) => {

    logger.info("Logout endpoint hits...");

    try {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
            logger.error("refresh token missing", e);
            res.status(400).json({
                success: false,
                message: "refresh token not found",
            })
        }

        const isRefreshToken = await RefreshToken.deleteOne({ token: refreshToken });

        logger.info("Refresh token deleted : logged out")
        res.clearCookie('refreshToken');
        res.json({
            success: true,
            message: 'Logged out succesfully',
            deleted_info: isRefreshToken
        })

    } catch (err) {
        logger.error("error occured during logging out", e);
        res.status(500).json({
            success: false,
            message: "logout error",
        })
    }
}

module.exports = { registerUser, loginUser, refreshTokenUser, logoutUser };