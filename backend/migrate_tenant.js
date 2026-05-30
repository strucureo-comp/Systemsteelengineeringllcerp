const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        const Workflow = mongoose.model('ApprovalWorkflow', new mongoose.Schema({}, { strict: false }));
        
        await User.updateMany({ email: /@systemsteel.com/ }, { tenant_id: 'tenant_1' });
        await Workflow.updateMany({}, { tenant_id: 'tenant_1' });
        
        console.log('Migrated test users and workflows to tenant_1');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

migrate();
