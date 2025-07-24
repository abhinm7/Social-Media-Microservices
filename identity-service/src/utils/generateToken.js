const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require("../models/RefreshToken")

const generateToken = async (user) => {
    const accessToken = jwt.sign({
        userId: user._id,
        username: user.username
    }, process.env.JWT_SECRET, { expiresIn: '60m' })

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) //refresh token

    try {
        await RefreshToken.create({
            token: refreshToken,
            user: user._id,
            expiresAt
        });
        console.log("Refresh token successfully saved to DB!"); // For debugging!
    } catch (error) {
        console.error("Failed to save refresh token:", error); // Log the specific error!
        // Re-throw the error so the calling function (registerUser) can catch it
        throw error;
    }

    return { accessToken, refreshToken }
}

module.exports = generateToken