const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const ApprovalRequest = mongoose.model('ApprovalRequest', new mongoose.Schema({}, { strict: false }));
        const reqs = await ApprovalRequest.find({}).sort({ createdAt: -1 }).limit(5);
        console.log(JSON.stringify(reqs, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
