const mongoose = require('mongoose');
require('dotenv').config();

let isConnected = false;

async function connectDB() {
    if (isConnected) return;

    try {
        let uri = process.env.MONGODB_URI;

        if (!uri || uri.trim() === '') {
            console.error('[MongoDB] MONGODB_URI is required. Please set it in your environment.');
            process.exit(1);
        }

        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000,
        });
        isConnected = true;
        console.log(`[MongoDB] Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('[MongoDB] Connection Error:', error.message);
        console.error('[MongoDB] Make sure your IP is whitelisted in MongoDB Atlas.');
        console.error('[MongoDB] Visit: https://cloud.mongodb.com → Network Access → Add Current IP');
        process.exit(1);
    }
}

module.exports = connectDB;
