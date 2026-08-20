module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  collectCoverage: true,
  collectCoverageFrom: ["lib/**/*.ts", "!lib/**/*.d.ts"],
  coveragePathIgnorePatterns: ["/node_modules/", "/android/", "/ios/"],
  moduleNameMapper: {
    "^expo-file-system/next$":
      "<rootDir>/__tests__/mocks/expo-file-system-next.ts",
  },
};
