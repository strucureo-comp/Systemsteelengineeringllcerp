const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Workflow = mongoose.model('ApprovalWorkflow', new mongoose.Schema({ name: String, module: String, steps: Array }, { strict: false }));
        const ws = await Workflow.find({});
        console.log(JSON.stringify(ws, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
