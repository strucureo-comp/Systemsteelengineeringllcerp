const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const { Account, JournalEntry } = require('../models/Finance');

describe('Finance API', () => {
    let authToken;
    let userId;
    const cashAccountCode = '9100';
    const revenueAccountCode = '9101';

    beforeAll(async () => {
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Create test user
        const user = await User.create({
            email: 'finance@test.com',
            password: 'Password123!',
            full_name: 'Finance User',
            role: 'admin'
        });
        userId = user._id;

        // Login to get token
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'finance@test.com',
                password: 'Password123!'
            });
        authToken = res.body.token;
    });

    afterAll(async () => {
        await User.deleteMany({});
        await Account.deleteMany({ code: { $in: [cashAccountCode, revenueAccountCode] } });
        await JournalEntry.deleteMany({});
        await mongoose.connection.close();
    });

    describe('GET /api/finance/accounts', () => {
        it('should return chart of accounts', async () => {
            const res = await request(app)
                .get('/api/finance/accounts')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('should reject unauthorized access', async () => {
            const res = await request(app)
                .get('/api/finance/accounts');

            expect(res.statusCode).toBe(401);
        });
    });

    describe('POST /api/finance/accounts', () => {
        it('should create a new account', async () => {
            const res = await request(app)
                .post('/api/finance/accounts')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    code: cashAccountCode,
                    name: 'Cash Test Account',
                    type: 'asset'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('code', cashAccountCode);
        });
    });

    describe('POST /api/finance/journals', () => {
        let cashAccount;
        let revenueAccount;

        beforeEach(async () => {
            await Account.deleteMany({ code: { $in: [cashAccountCode, revenueAccountCode] } });
            const accounts = await Account.create([
                { code: cashAccountCode, name: 'Cash', type: 'asset' },
                { code: revenueAccountCode, name: 'Revenue', type: 'revenue' }
            ]);
            [cashAccount, revenueAccount] = accounts;
        });

        it('should create a balanced journal entry', async () => {
            const res = await request(app)
                .post('/api/finance/journals')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    date: new Date().toISOString(),
                    description: 'Test entry',
                    lines: [
                        {
                            account_code: cashAccountCode,
                            debit: 1000,
                            credit: 0
                        },
                        {
                            account_code: revenueAccountCode,
                            debit: 0,
                            credit: 1000
                        }
                    ]
                });

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('entry_number');
        });

        it('should reject unbalanced journal entry', async () => {
            const res = await request(app)
                .post('/api/finance/journals')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    date: new Date().toISOString(),
                    description: 'Unbalanced entry',
                    lines: [
                        {
                            account_code: cashAccountCode,
                            debit: 1000,
                            credit: 0
                        },
                        {
                            account_code: revenueAccountCode,
                            debit: 0,
                            credit: 500
                        }
                    ]
                });

            expect(res.statusCode).toBe(400);
        });
    });
});
