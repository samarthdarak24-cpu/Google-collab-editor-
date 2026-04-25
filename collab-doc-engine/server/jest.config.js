module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  coveragePathIgnorePatterns: ['/node_modules/'],
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)'
  ],
  transform: {
    '^.+\\.js$': ['babel-jest', { configFile: './babel.config.js' }]
  }
};
