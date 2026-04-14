/**
 * Clear Database Script
 * Drops all collections and optionally reseeds with fresh data
 * 
 * Usage:
 *   node backend/scripts/clear-database.js              # Clear only
 *   node backend/scripts/clear-database.js --seed       # Clear and reseed
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bridgebreak';

async function clearDatabase() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        
        // Get all collections
        const collections = await db.listCollections().toArray();
        
        if (collections.length === 0) {
            console.log('ℹ️  Database is already empty');
            return;
        }

        console.log(`\n📋 Found ${collections.length} collections:`);
        collections.forEach(col => console.log(`   - ${col.name}`));

        console.log('\n🗑️  Dropping all collections...');
        
        let dropped = 0;
        for (const collection of collections) {
            try {
                await db.dropCollection(collection.name);
                console.log(`   ✓ Dropped: ${collection.name}`);
                dropped++;
            } catch (error) {
                console.log(`   ✗ Failed to drop: ${collection.name} - ${error.message}`);
            }
        }

        console.log(`\n✅ Successfully dropped ${dropped}/${collections.length} collections`);
        console.log('🎉 Database is now fresh and empty!');

    } catch (error) {
        console.error('❌ Error clearing database:', error.message);
        process.exit(1);
    }
}

async function reseedDatabase() {
    try {
        console.log('\n🌱 Reseeding database with fresh data...');
        
        // Import seed script
        const seedScript = require('./seed');
        
        // Run seed
        await seedScript.seed();
        
        console.log('✅ Database reseeded successfully!');
    } catch (error) {
        console.error('❌ Error reseeding database:', error.message);
        console.log('ℹ️  You can manually run: npm run seed');
    }
}

async function main() {
    const shouldSeed = process.argv.includes('--seed');

    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║         BRIDGEBREAK ERP - DATABASE RESET TOOL            ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`\nMode: ${shouldSeed ? 'CLEAR & RESEED' : 'CLEAR ONLY'}`);
    console.log(`Database: ${MONGODB_URI}\n`);

    // Clear database
    await clearDatabase();

    // Optionally reseed
    if (shouldSeed) {
        await reseedDatabase();
    } else {
        console.log('\nℹ️  To reseed the database, run:');
        console.log('   node backend/scripts/clear-database.js --seed');
        console.log('   OR');
        console.log('   npm run seed');
    }

    console.log('\n✨ Done!\n');
    await mongoose.connection.close();
    process.exit(0);
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { clearDatabase };
