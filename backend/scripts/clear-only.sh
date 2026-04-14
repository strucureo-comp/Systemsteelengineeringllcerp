#!/bin/bash

# BridgeBreak ERP - Clear Database Only (No Reseed)
# This script only clears the database without reseeding

set -e  # Exit on error

echo "╔══════════════════════════════════════════════════════════╗"
echo "║      BRIDGEBREAK ERP - CLEAR DATABASE ONLY               ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Check if MongoDB is running
echo "🔍 Checking MongoDB connection..."
if ! mongosh --eval "db.version()" > /dev/null 2>&1; then
    echo "❌ MongoDB is not running or not accessible"
    echo "   Please start MongoDB first"
    exit 1
fi

echo "✅ MongoDB is running"
echo ""

# Navigate to backend directory
cd "$(dirname "$0")/.."

# Clear only
echo "🗑️  Clearing all data from database..."
node scripts/clear-database.js

echo ""
echo "✅ Database is now empty!"
echo ""
echo "💡 To add seed data, run:"
echo "   npm run seed"
echo ""
