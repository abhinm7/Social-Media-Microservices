const mongoose = require('mongoose');
const argon2 = require('argon2');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
},
    {
        timestamps: true
    }
)

userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        try {
            this.password = await argon2.hash(this.password);
            next(); // Call next() on success!
        } catch (err) {
            return next(err) // This already handles passing error to next
        }
    } else {
        next(); // Call next() even if password wasn't modified
    }
})

userSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        // 'this.password' here refers to the hashed password stored in the DB
        return await argon2.verify(this.password, candidatePassword);
    }
    catch (err) {
        throw err;
    }
}

const User = mongoose.model('User',userSchema);
module.exports = User;