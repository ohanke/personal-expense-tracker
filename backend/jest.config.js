module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: ['src/**/*.js', '!src/**/*.test.js'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  testTimeout: 10000,
  collectCoverage: true,
  coverageReporters: ['text', 'text-summary', 'lcov'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 30,
      lines: 40,
      statements: 40,
    },
  },
};
