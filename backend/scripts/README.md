# 🗄️ Database Management Scripts

This directory contains scripts for managing the BridgeBreak ERP database.

---

## 🚀 Quick Commands

### Clear Database and Reseed (Recommended)
```bash
# From backend directory
npm run db:reset

# OR using shell script
./scripts/reset-fresh.sh
```

### Clear Database Only (No Seed Data)
```bash
# From backend directory
npm run db:clear

# OR using shell script
./scripts/clear-only.sh
```

### Seed Database (Without Clearing)
```bash
npm run seed
```

---

## 📋 Available Scripts

### 1. `clear-database.js`
**Purpose**: Drop all collections from the database

**Usage**:
```bash
# Clear only
node scripts/clear-database.js

# Clear and reseed
node scripts/clear-database.js --seed
```

**What it does**:
- Connects to MongoDB
- Lists all collections
- Drops each collection
- Optionally reseeds with fresh data

---

### 2. `reset-fresh.sh`
**Purpose**: Complete database reset with fresh seed data

**Usage**:
```bash
./scripts/reset-fresh.sh
```

**What it does**:
- Checks if MongoDB is running
- Clears all collections
- Reseeds with default data
- Shows default admin credentials

---

### 3. `clear-only.sh`
**Purpose**: Clear database without reseeding

**Usage**:
```bash
./scripts/clear-only.sh
```

**What it does**:
- Checks if MongoDB is running
- Drops all collections
- Leaves database empty

---

## 🎯 Use Cases

### Development Reset
When you want to start fresh during development:
```bash
npm run db:reset
```

### Testing
Before running integration tests:
```bash
npm run db:clear
# Run your tests
npm test
```

### Production Data Import
Clear before importing production data:
```bash
npm run db:clear
# Import your production data
mongoimport --db bridgebreak --collection users --file users.json
```

### Emergency Reset
If database is corrupted or has bad data:
```bash
./scripts/reset-fresh.sh
```

---

## ⚙️ Configuration

### Database Connection
Scripts use the `MONGODB_URI` from your `.env` file:

```env
MONGODB_URI=mongodb://localhost:27017/bridgebreak
```

### Seed Data
Default seed data is defined in `backend/seed.js` and includes:
- Admin user (admin@bridgebreak.com / admin123)
- Sample chart of accounts
- Sample products
- Sample customers
- Sample vendors
- Demo data for all modules

---

## 🔒 Safety Features

### Confirmation
Scripts show what they're about to do before executing:
```
Found 25 collections:
   - users
   - companies
   - finance_transactions
   ...
```

### Error Handling
- Checks MongoDB connection before proceeding
- Handles individual collection drop failures
- Shows detailed error messages

### Environment Awareness
Scripts respect your environment:
- Development: Uses local MongoDB
- Production: Uses production MongoDB (be careful!)

---

## 📊 What Gets Cleared

All collections including:
- **Users & Auth**: users, sessions, tokens
- **Finance**: finance_transactions, invoices, payments, journals
- **HR**: employees, attendance, payroll, leaves
- **Inventory**: products, warehouses, stock_movements
- **Manufacturing**: boms, production_orders, work_centers
- **CRM**: leads, opportunities, customers
- **Procurement**: purchase_orders, vendors, grns
- **Projects**: projects, tasks, timesheets
- **Settings**: companies, currencies, tax_rates
- **System**: notifications, email_logs, audit_logs

---

## 🛡️ Production Warning

**⚠️ DANGER**: These scripts will permanently delete all data!

### Before Running in Production:
1. ✅ Create a backup:
   ```bash
   mongodump --uri="mongodb://localhost:27017/bridgebreak" --out=/backup/$(date +%Y%m%d)
   ```

2. ✅ Verify you're connected to the correct database:
   ```bash
   echo $MONGODB_URI
   ```

3. ✅ Have a rollback plan

4. ✅ Notify your team

### Production-Safe Alternative:
Instead of clearing, consider:
- Creating a new database
- Archiving old data
- Selective deletion of specific collections

---

## 🔧 Troubleshooting

### MongoDB Not Running
```
❌ MongoDB is not running or not accessible
```

**Solution**:
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Docker
docker-compose up -d mongodb
```

### Permission Denied
```
bash: ./scripts/reset-fresh.sh: Permission denied
```

**Solution**:
```bash
chmod +x scripts/reset-fresh.sh scripts/clear-only.sh
```

### Connection Timeout
```
❌ Error clearing database: connect ECONNREFUSED
```

**Solution**:
- Check MongoDB is running
- Verify MONGODB_URI in .env
- Check firewall settings

### Seed Script Not Found
```
❌ Error reseeding database: Cannot find module './seed'
```

**Solution**:
```bash
# Make sure seed.js exists
ls -la seed.js

# Run from backend directory
cd backend
npm run db:reset
```

---

## 📚 Related Commands

### View Database Stats
```bash
mongosh bridgebreak --eval "db.stats()"
```

### List All Collections
```bash
mongosh bridgebreak --eval "db.getCollectionNames()"
```

### Count Documents
```bash
mongosh bridgebreak --eval "db.users.countDocuments()"
```

### Backup Database
```bash
mongodump --uri="mongodb://localhost:27017/bridgebreak" --out=/backup
```

### Restore Database
```bash
mongorestore --uri="mongodb://localhost:27017/bridgebreak" /backup/bridgebreak
```

---

## 🎓 Examples

### Fresh Start for Development
```bash
cd backend
npm run db:reset
npm run dev
```

### Clear Before Testing
```bash
cd backend
npm run db:clear
npm test
```

### Manual Seed After Clear
```bash
cd backend
npm run db:clear
npm run seed
```

### Check What's in Database
```bash
mongosh bridgebreak --eval "
  db.getCollectionNames().forEach(function(col) {
    print(col + ': ' + db[col].countDocuments());
  })
"
```

---

## 📞 Support

If you encounter issues:
1. Check MongoDB is running
2. Verify .env configuration
3. Check logs for detailed errors
4. Ensure you're in the backend directory
5. Try running with `node` directly for more details

---

**Last Updated**: April 14, 2026  
**Version**: 1.0.0
