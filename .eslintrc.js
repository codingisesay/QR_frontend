/* eslint-disable */
module.exports = {
  env: { browser: true, es2021: true, node: true },
  extends: [
    "react-app",
    "react-app/jest",
    "plugin:react-hooks/recommended",
    "plugin:prettier/recommended", // turns on prettier rule
  ],
  plugins: ["react-hooks"],
  rules: {
    // Make Prettier a WARNING, not an ERROR → won’t block compile
    "prettier/prettier": ["warn", { endOfLine: "auto" }],
  },
};
