#!/usr/bin/env node

/**
 * Email Service Test Script
 * Tests SMTP connection and sends a test email
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sendEmail, testSmtpConnection } = require('./services/emailService');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runTests() {
    log('\n╔════════════════════════════════════════════════════════╗', 'blue');
    log('║          Email Service Test Suite                     ║', 'blue');
    log('╚════════════════════════════════════════════════════════╝', 'blue');

    // Check environment variables
    log('\n=== STEP 1: Check Configuration ===', 'blue');
    const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
    let configValid = true;

    for (const varName of requiredVars) {
        if (process.env[varName]) {
            log(`✓ ${varName}: ${varName === 'SMTP_PASS' ? '***' : process.env[varName]}`, 'green');
        } else {
            log(`✗ ${varName}: Not set`, 'red');
            configValid = false;
        }
    }

    if (!configValid) {
        log('\n✗ Configuration incomplete. Please set all required SMTP variables in .env', 'red');
        process.exit(1);
    }

    // Test SMTP connection
    log('\n=== STEP 2: Test SMTP Connection ===', 'blue');
    try {
        const result = await testSmtpConnection();
        if (result.success) {
            log('✓ SMTP connection successful', 'green');
        } else {
            log(`✗ SMTP connection failed: ${result.message}`, 'red');
            process.exit(1);
        }
    } catch (err) {
        log(`✗ SMTP connection error: ${err.message}`, 'red');
        process.exit(1);
    }

    // Send test email
    log('\n=== STEP 3: Send Test Email ===', 'blue');
    
    const testEmail = process.argv[2] || process.env.SMTP_USER;
    
    if (!testEmail) {
        log('✗ No test email address provided', 'red');
        log('Usage: node test-email.js your-email@example.com', 'yellow');
        process.exit(1);
    }

    log(`Sending test email to: ${testEmail}`, 'yellow');

    try {
        const result = await sendEmail({
            to: testEmail,
            subject: 'Test Email from BridgeBreak ERP',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .container { max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 30px; border-radius: 8px; }
                        h1 { color: #1a1a2e; }
                        .success { background: #eaf3de; color: #3B6D11; padding: 15px; border-radius: 6px; margin: 20px 0; }
                        .info { background: #f0f4ff; padding: 15px; border-radius: 6px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>✅ Email Service Test</h1>
                        <div class="success">
                            <strong>Success!</strong> Your email service is working correctly.
                        </div>
                        <div class="info">
                            <strong>SMTP Server:</strong> ${process.env.SMTP_HOST}<br>
                            <strong>Port:</strong> ${process.env.SMTP_PORT}<br>
                            <strong>Sent At:</strong> ${new Date().toLocaleString()}<br>
                            <strong>From:</strong> ${process.env.SMTP_FROM || process.env.SMTP_USER}
                        </div>
                        <p>This is a test email from your BridgeBreak ERP system. If you received this, your email configuration is working properly!</p>
                        <p style="font-size: 12px; color: #888;">This is an automated test message. No action is required.</p>
                    </div>
                </body>
                </html>
            `,
            reference_type: 'test',
            tenant_id: 'default'
        });

        if (result.success) {
            log(`✓ Test email sent successfully`, 'green');
            log(`  Message ID: ${result.messageId}`, 'green');
        } else {
            log(`✗ Test email failed: ${result.error}`, 'red');
            process.exit(1);
        }
    } catch (err) {
        log(`✗ Test email error: ${err.message}`, 'red');
        process.exit(1);
    }

    // Summary
    log('\n╔════════════════════════════════════════════════════════╗', 'blue');
    log('║              All Tests Passed! ✓                       ║', 'blue');
    log('╚════════════════════════════════════════════════════════╝', 'blue');
    log('\nYour email service is configured correctly and ready to use.', 'green');
    log('Check your inbox for the test email.\n', 'yellow');

    process.exit(0);
}

// Run tests
runTests().catch(err => {
    log(`\nFatal error: ${err.message}`, 'red');
    process.exit(1);
});
