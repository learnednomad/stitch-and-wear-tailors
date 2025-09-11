/** @type {import('@jest/types').Config.ProjectConfig} */
module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/test/setup.ts"],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(jest-)?react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@unimodules|unimodules|sentry-expo|native-base|react-native-svg|react-native-appwrite|expo-.*|@shopify/flash-list)",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/app/$1",
    "^@config/(.*)$": "<rootDir>/app/config/$1",
    "^@services/(.*)$": "<rootDir>/app/services/$1",
    "^@utils/(.*)$": "<rootDir>/app/utils/$1",
    "^@models/(.*)$": "<rootDir>/app/models/$1",
    "^@components/(.*)$": "<rootDir>/app/components/$1",
  },
  testEnvironment: "node",
  collectCoverage: false,
  coverageDirectory: "coverage",
  collectCoverageFrom: ["app/**/*.{ts,tsx}", "!app/**/*.test.{ts,tsx}", "!app/**/__tests__/**"],
  globals: {
    __DEV__: true,
  },
}
