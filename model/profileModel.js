const mongoose = require('mongoose');
const { Schema } = mongoose;

const addressSchema = new mongoose.Schema({
    address: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    postalCode: {
        type: Number,
        required: true
    }
});

const profileSchema = new mongoose.Schema({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        unique: true,
        ref: "User"
    },
    addresses: [addressSchema]
}, { timestamps: true });

module.exports = mongoose.model('Profile', profileSchema);
