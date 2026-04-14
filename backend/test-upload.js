/**
 * Test Script for File Upload System
 * Run: node backend/test-upload.js
 */

const fs = require('fs');
const path = require('path');
const { ensureDir, UPLOAD_ROOT } = require('./services/storageService');

console.log('\n═══════════════════════════════════════');
console.log('FILE UPLOAD SYSTEM TEST');
console.log('═══════════════════════════════════════\n');

// Test 1: Check if uploads directory exists
console.log('Test 1: Checking uploads directory...');
if (fs.existsSync(UPLOAD_ROOT)) {
    console.log('✅ Uploads directory exists:', UPLOAD_ROOT);
} else {
    console.log('❌ Uploads directory does not exist. Creating...');
    ensureDir(UPLOAD_ROOT);
    console.log('✅ Created uploads directory:', UPLOAD_ROOT);
}

// Test 2: Check write permissions
console.log('\nTest 2: Checking write permissions...');
const testFile = path.join(UPLOAD_ROOT, 'test-write.txt');
try {
    fs.writeFileSync(testFile, 'Test write');
    fs.unlinkSync(testFile);
    console.log('✅ Write permissions OK');
} catch (err) {
    console.log('❌ Write permissions FAILED:', err.message);
}

// Test 3: Create test tenant directory structure
console.log('\nTest 3: Creating test tenant directory structure...');
const testTenantId = 'test-tenant-123';
const testDirs = [
    `${testTenantId}/hr/employees/emp-001/documents`,
    `${testTenantId}/hr/employees/emp-001/avatar`,
    `${testTenantId}/finance/invoices/inv-001`,
    `${testTenantId}/finance/expenses/exp-001`,
    `${testTenantId}/procurement/purchase-orders/po-001`,
    `${testTenantId}/procurement/grn/grn-001`,
    `${testTenantId}/settings/branding`
];

testDirs.forEach(dir => {
    const fullPath = path.join(UPLOAD_ROOT, dir);
    ensureDir(fullPath);
    if (fs.existsSync(fullPath)) {
        console.log(`✅ Created: ${dir}`);
    } else {
        console.log(`❌ Failed to create: ${dir}`);
    }
});

// Test 4: Check Multer dependencies
console.log('\nTest 4: Checking dependencies...');
try {
    require('multer');
    console.log('✅ Multer installed');
} catch (err) {
    console.log('❌ Multer NOT installed. Run: npm install multer');
}

try {
    require('sharp');
    console.log('✅ Sharp installed');
} catch (err) {
    console.log('❌ Sharp NOT installed. Run: npm install sharp');
}

try {
    require('uuid');
    console.log('✅ UUID installed');
} catch (err) {
    console.log('❌ UUID NOT installed. Run: npm install uuid');
}

// Test 5: Check Attachment model
console.log('\nTest 5: Checking Attachment model...');
try {
    const Attachment = require('./models/Attachment');
    console.log('✅ Attachment model loaded');
} catch (err) {
    console.log('❌ Attachment model FAILED:', err.message);
}

// Test 6: List directory structure
console.log('\nTest 6: Directory structure:');
function listDir(dirPath, indent = '') {
    if (!fs.existsSync(dirPath)) return;
    
    const items = fs.readdirSync(dirPath);
    items.forEach(item => {
        const fullPath = path.join(dirPath, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
            console.log(`${indent}📁 ${item}/`);
            listDir(fullPath, indent + '  ');
        } else {
            console.log(`${indent}📄 ${item}`);
        }
    });
}

listDir(UPLOAD_ROOT);

console.log('\n═══════════════════════════════════════');
console.log('TEST COMPLETE');
console.log('═══════════════════════════════════════\n');

console.log('Next steps:');
console.log('1. Start the backend server: npm run dev (in backend directory)');
console.log('2. Test file upload via API or frontend');
console.log('3. Check uploaded files in:', UPLOAD_ROOT);
console.log('4. Run maintenance job: node backend/jobs/storageMaintenance.js\n');
