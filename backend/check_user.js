const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const User = mongoose.model('User', new mongoose.Schema({ email: String, role: String }));
        const users = await User.find({ email: 'sales@systemsteel.com' });
        console.log(JSON.stringify(users, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
