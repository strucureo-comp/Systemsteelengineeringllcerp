const mongoose = require('mongoose');
require('dotenv').config();

async function clearDatabase() {
    try {
        console.log('Connecting to Database...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bridgebreak');
        console.log('Connected. Identifying collections...');

        // Fetch all actual collections directly from the MongoDB database
        const collections = await mongoose.connection.db.collections();

        console.log(`Found ${collections.length} collections. Clearing data...`);

        for (const collection of collections) {
            // Skip system collections if any
            if (collection.collectionName.startsWith('system.')) continue;

            // Delete all documents in the collection
            await collection.deleteMany({});
            console.log(`[✔] Cleared collection: ${collection.collectionName}`);
        }

        console.log('\n========================================');
        console.log('Database successfully cleared from all data!');
        console.log('========================================\n');

        process.exit(0);
    } catch (error) {
        console.error('Error clearing database:', error);
        process.exit(1);
    }
}

clearDatabase();
