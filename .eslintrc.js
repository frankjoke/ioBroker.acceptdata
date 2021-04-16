module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
  },
  extends: [],
  rules: {
    endOfLine: "off",
    "arrow-parens": "off",
    "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
  },
  parserOptions: {
    parser: "babel-eslint",
  },
};
