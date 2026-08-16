module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  collectCoverage: true,
  collectCoverageFrom: ["lib/**/*.ts", "!lib/**/*.d.ts"],
  coveragePathIgnorePatterns: ["/node_modules/", "/android/", "/ios/"],
};
