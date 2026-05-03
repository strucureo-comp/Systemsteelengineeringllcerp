module.exports = Object.assign(require('./jest.config.cjs'), {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'routes/**/*.js',
        'services/**/*.js',
        'middleware/**/*.js',
        '!**/node_modules/**'
    ],
    testMatch: [
        '**/__tests__/**/*.js',
        '**/*.test.js',
        '**/*.spec.js'
    ],
    verbose: true,
    testTimeout: 10000,
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
});
