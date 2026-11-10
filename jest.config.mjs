export default {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/jest/**/*.test.js'],
  transform: {},
  clearMocks: true,
  restoreMocks: true,
  coverageProvider: 'v8',
  collectCoverageFrom: ['src/viewport.js', 'src/touch.js'],
  coverageDirectory: 'coverage',
};
