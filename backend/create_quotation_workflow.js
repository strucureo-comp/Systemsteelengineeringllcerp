const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

async function createWorkflow() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const ApprovalWorkflow = mongoose.model('ApprovalWorkflow', new mongoose.Schema({
            tenant_id: String,
            name: String,
            module: String,
            document_type: String,
            is_active: Boolean,
            steps: Array,
            created_by: mongoose.Schema.Types.ObjectId,
            updated_by: mongoose.Schema.Types.ObjectId
        }, { strict: false }));
        
        const User = mongoose.model('User', new mongoose.Schema({ email: String, role: String }));
        const admin = await User.findOne({ email: 'admin@systemsteel.com' });

        await ApprovalWorkflow.deleteMany({ document_type: 'quotation' });

        const workflow = new ApprovalWorkflow({
            tenant_id: 'default',
            name: 'Quotation Approval Workflow',
            module: 'sales',
            document_type: 'quotation',
            is_active: true,
            steps: [
                {
                    step_number: 1,
                    name: 'Manager Approval',
                    approver_type: 'role',
                    approver_role: 'Sales Manager', // Use exact role string from seed
                    can_reject: true
                }
            ],
            created_by: admin._id,
            updated_by: admin._id
        });

        await workflow.save();
        console.log('Quotation workflow created successfully!');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

createWorkflow();
