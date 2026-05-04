const mongoose = require('mongoose');
require('dotenv').config();

let isConnected = false;

async function connectDB() {
    if (isConnected) return;

    try {
        let uri = process.env.MONGODB_URI;

        if (!uri || uri.trim() === '') {
            console.log('[MongoDB] MONGODB_URI not provided. Starting in-memory MongoDB...');
            const { MongoMemoryServer } = require('mongodb-memory-server');
            const mongoServer = await MongoMemoryServer.create();
            uri = mongoServer.getUri();
            console.log(`[MongoDB] In-memory database started at ${uri}`);
        }

        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000,
        });
        isConnected = true;
        console.log(`[MongoDB] Connected: ${conn.connection.host}`);

        // Seed data if using in-memory database
        if (!process.env.MONGODB_URI || process.env.MONGODB_URI.trim() === '') {
            console.log('[MongoDB] Triggering automatic seed for in-memory database...');
            const seedCompleteData = require('../seed');
            await seedCompleteData();
        }
    } catch (error) {
        console.error('[MongoDB] Connection Error:', error.message);
        console.error('[MongoDB] Make sure your IP is whitelisted in MongoDB Atlas.');
        console.error('[MongoDB] Visit: https://cloud.mongodb.com → Network Access → Add Current IP');
        process.exit(1);
    }
}

module.exports = connectDB;
