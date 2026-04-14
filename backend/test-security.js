#!/usr/bin/env node

/**
 * Security Implementation Test Script
 * Tests rate limiting, input sanitization, and validation
 */

const http = require('http');

const BASE_URL = 'http://localhost:4000';
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

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: body ? JSON.parse(body) : null
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                }
            });
        });

        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

async function testRateLimiting() {
    log('\n=== TEST 1: Rate Limiting ===', 'blue');
    log('Sending 12 login requests (limit is 10 per 15 minutes)...');
    
    let blocked = false;
    for (let i = 1; i <= 12; i++) {
        try {
            const res = await makeRequest('POST', '/api/auth/login', {
                email: 'test@test.com',
                password: 'wrongpassword'
            });
            
            if (res.status === 429) {
                log(`✓ Request ${i}: Rate limited (429)`, 'green');
                blocked = true;
                break;
            } else {
                log(`  Request ${i}: ${res.status}`);
            }
        } catch (err) {
            log(`✗ Request ${i} failed: ${err.message}`, 'red');
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (blocked) {
        log('✓ Rate limiting is working correctly', 'green');
    } else {
        log('✗ Rate limiting may not be working', 'red');
    }
}

async function testNoSQLInjection() {
    log('\n=== TEST 2: NoSQL Injection Prevention ===', 'blue');
    log('Attempting NoSQL injection attack...');
    
    try {
        const res = await makeRequest('POST', '/api/auth/login', {
            email: { $gt: "" },
            password: { $gt: "" }
        });
        
        if (res.status === 400 || res.status === 401) {
            log('✓ NoSQL injection prevented (sanitized)', 'green');
            log(`  Response: ${JSON.stringify(res.body)}`);
        } else {
            log('✗ NoSQL injection may not be prevented', 'red');
        }
    } catch (err) {
        log(`✗ Test failed: ${err.message}`, 'red');
    }
}

async function testXSSPrevention() {
    log('\n=== TEST 3: XSS Prevention ===', 'blue');
    log('Attempting XSS attack via signup...');
    
    try {
        const res = await makeRequest('POST', '/api/auth/signup', {
            email: 'xss@test.com',
            password: 'Test123!@#',
            full_name: '<script>alert("XSS")</script>'
        });
        
        log(`  Response status: ${res.status}`);
        log(`  Response body: ${JSON.stringify(res.body)}`);
        
        if (res.body?.user?.full_name && !res.body.user.full_name.includes('<script>')) {
            log('✓ XSS attack prevented (HTML stripped)', 'green');
        } else if (res.status === 400) {
            log('✓ Request blocked by validation', 'green');
        } else {
            log('⚠ XSS prevention unclear - manual verification needed', 'yellow');
        }
    } catch (err) {
        log(`✗ Test failed: ${err.message}`, 'red');
    }
}

async function testInputValidation() {
    log('\n=== TEST 4: Input Validation ===', 'blue');
    log('Testing validation with invalid data...');
    
    const testCases = [
        {
            name: 'Invalid email',
            data: { email: 'notanemail', password: 'Test123!', full_name: 'Test User' },
            expectedError: 'email'
        },
        {
            name: 'Weak password',
            data: { email: 'test@test.com', password: 'weak', full_name: 'Test User' },
            expectedError: 'password'
        },
        {
            name: 'Short name',
            data: { email: 'test@test.com', password: 'Test123!', full_name: 'A' },
            expectedError: 'full_name'
        }
    ];
    
    for (const testCase of testCases) {
        try {
            const res = await makeRequest('POST', '/api/auth/signup', testCase.data);
            
            if (res.status === 400 && res.body?.error === 'Validation failed') {
                log(`✓ ${testCase.name}: Validation working`, 'green');
                log(`  Errors: ${JSON.stringify(res.body.errors)}`);
            } else {
                log(`✗ ${testCase.name}: Validation may not be working`, 'red');
            }
        } catch (err) {
            log(`✗ ${testCase.name} failed: ${err.message}`, 'red');
        }
    }
}

async function testSecurityHeaders() {
    log('\n=== TEST 5: Security Headers ===', 'blue');
    log('Checking security headers...');
    
    try {
        const res = await makeRequest('GET', '/api/health');
        
        const securityHeaders = [
            'x-dns-prefetch-control',
            'x-frame-options',
            'x-content-type-options',
            'x-xss-protection'
        ];
        
        let headersFound = 0;
        for (const header of securityHeaders) {
            if (res.headers[header]) {
                log(`✓ ${header}: ${res.headers[header]}`, 'green');
                headersFound++;
            } else {
                log(`✗ ${header}: Not found`, 'red');
            }
        }
        
        if (headersFound === securityHeaders.length) {
            log('✓ All security headers present', 'green');
        } else {
            log(`⚠ ${headersFound}/${securityHeaders.length} security headers found`, 'yellow');
        }
    } catch (err) {
        log(`✗ Test failed: ${err.message}`, 'red');
    }
}

async function testRequestSizeLimit() {
    log('\n=== TEST 6: Request Size Limit ===', 'blue');
    log('Testing request size limit (2MB)...');
    
    try {
        // Create a large payload (3MB)
        const largeString = 'x'.repeat(3 * 1024 * 1024);
        const res = await makeRequest('POST', '/api/auth/signup', {
            email: 'test@test.com',
            password: 'Test123!',
            full_name: largeString
        });
        
        if (res.status === 413 || res.status === 400) {
            log('✓ Request size limit working', 'green');
        } else {
            log('⚠ Request size limit unclear', 'yellow');
        }
    } catch (err) {
        if (err.code === 'ECONNRESET') {
            log('✓ Request size limit working (connection reset)', 'green');
        } else {
            log(`✗ Test failed: ${err.message}`, 'red');
        }
    }
}

async function runAllTests() {
    log('╔════════════════════════════════════════════════════════╗', 'blue');
    log('║     BridgeBreak ERP - Security Implementation Test    ║', 'blue');
    log('╚════════════════════════════════════════════════════════╝', 'blue');
    
    log('\nMake sure the backend server is running on port 4000', 'yellow');
    log('Run: cd backend && npm run dev\n', 'yellow');
    
    // Check if server is running
    try {
        await makeRequest('GET', '/api/health');
        log('✓ Server is running\n', 'green');
    } catch (err) {
        log('✗ Server is not running. Please start it first.', 'red');
        process.exit(1);
    }
    
    try {
        await testRateLimiting();
        await testNoSQLInjection();
        await testXSSPrevention();
        await testInputValidation();
        await testSecurityHeaders();
        await testRequestSizeLimit();
        
        log('\n╔════════════════════════════════════════════════════════╗', 'blue');
        log('║              All Security Tests Complete              ║', 'blue');
        log('╚════════════════════════════════════════════════════════╝', 'blue');
        log('\nNote: Some tests may show warnings. Manual verification recommended.', 'yellow');
        log('Review SECURITY.md for detailed security documentation.\n', 'yellow');
    } catch (err) {
        log(`\n✗ Test suite failed: ${err.message}`, 'red');
        process.exit(1);
    }
}

// Run tests
runAllTests().catch(err => {
    log(`Fatal error: ${err.message}`, 'red');
    process.exit(1);
});
