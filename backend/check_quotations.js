const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Quotation = mongoose.model('SalesQuotation', new mongoose.Schema({}, { strict: false }));
        const qs = await Quotation.find({}).sort({ createdAt: -1 }).limit(5);
        console.log(JSON.stringify(qs, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
