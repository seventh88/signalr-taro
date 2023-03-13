module.exports = {
  extends: [
    '.eslintrc.json',
  ],
  ignorePatterns: ["dist"],
  parserOptions: {
    project: ["tsconfig.json"],
    tsconfigRootDir: __dirname
  }
};
