const mongoose = require('mongoose');
require('dotenv').config();

let isConnected = false;

async function connectDB() {
    if (isConnected) return;

    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
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
