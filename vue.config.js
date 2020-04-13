process.env.VUE_APP_VERSION = require("./package.json").version;

module.exports = {
  transpileDependencies: ["vuetify", "vue-echarts", "resize-detector"],
  lintOnSave: process.env.NODE_ENV !== "production",

  pluginOptions: {
    i18n: {
      locale: "en",
      fallbackLocale: "en",
      localeDir: "locales",
      enableInSFC: true,
    },
  },
  productionSourceMap: false,
  publicPath: ".",
  outputDir: "docs",
  css: {
    extract: false,
  },
};
