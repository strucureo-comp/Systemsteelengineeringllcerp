// Intentionally minimal; settings are merged by jest.config.js
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  transformIgnorePatterns: ['<rootDir>/node_modules/(?!(uuid)/)']
};
