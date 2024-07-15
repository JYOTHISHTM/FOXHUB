const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        match: [/.+\@.+\..+/, 'Please enter a valid email address']
    },
    password: {
        type: String,
        required: function() {
            return !this.googleId;
        }
    },
    mobile: {
        type: Number,
        required: function() {
            return !this.googleId;
        }
    },
    is_admin: {
        type: Boolean,
        default: false
    },
    is_verified: {
        type: Boolean,
        default: false
    },
    is_blocked: {
        type: Boolean,
        default: false
    },
    otp: String,
    otp_expires: Date,
    googleId: {
        type: String,
    },
    walletBalance: {
        type: Number,
        default: 0
    },
    referral_code: {
        type: String,
    },
    referred_code: {
        type: String,
    },
    referral_bonus_given: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
