#!/bin/bash

# BridgeBreak ERP - Fresh Database Reset Script
# This script clears the database and reseeds with fresh data

set -e  # Exit on error

echo "╔══════════════════════════════════════════════════════════╗"
echo "║      BRIDGEBREAK ERP - FRESH DATABASE RESET              ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Check if MongoDB is running
echo "🔍 Checking MongoDB connection..."
if ! mongosh --eval "db.version()" > /dev/null 2>&1; then
    echo "❌ MongoDB is not running or not accessible"
    echo "   Please start MongoDB first:"
    echo "   - macOS: brew services start mongodb-community"
    echo "   - Linux: sudo systemctl start mongod"
    echo "   - Docker: docker-compose up -d mongodb"
    exit 1
fi

echo "✅ MongoDB is running"
echo ""

# Navigate to backend directory
cd "$(dirname "$0")/.."

# Clear and reseed
echo "🗑️  Clearing database and reseeding with fresh data..."
node scripts/clear-database.js --seed

echo ""
echo "✅ Database is now fresh with seed data!"
echo ""
echo "📝 Default credentials:"
echo "   Email: admin@bridgebreak.com"
echo "   Password: admin123"
echo ""
echo "🚀 Start the application:"
echo "   npm run dev (backend)"
echo "   npm run dev (frontend in root directory)"
echo ""
