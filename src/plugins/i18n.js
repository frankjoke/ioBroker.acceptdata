import Vue from "vue";
import VueI18n from "vue-i18n";
import words from "./words";

Vue.use(VueI18n);

function loadLocaleMessages(words, messages) {
  messages = messages || {};
  /*   const locales = require.context(
      "./locales",
      true,
      /[A-Za-z0-9-_,\s]+\.json$/i
    );
    const messages = {};
    locales.keys().forEach((key) => {
      debugger;
      const matched = key.match(/([A-Za-z0-9-_]+)\./i);
      if (matched && matched.length > 1) {
        const locale = matched[1];
        messages[locale] = locales(key);
      }
    });
   */

  for (const keys of Object.keys(words))
    for (const langs of Object.keys(words[keys]))
      if (messages[langs]) messages[langs][keys] = words[keys][langs];
      else
        messages[langs] = {
          [keys]: words[keys][langs],
        };

  return messages;
}

const i18nOptions = {
  locale: process.env.VUE_APP_I18N_LOCALE || "en",
  fallbackLocale: process.env.VUE_APP_I18N_FALLBACK_LOCALE || "en",
  messages: loadLocaleMessages(words),
  silentTranslationWarn: true,
};
const i18n = new VueI18n(i18nOptions);

const missing = {};
Vue.prototype.$missing = missing;
i18n.loadLocaleMessages = loadLocaleMessages;
i18n.missing = (lang, key, path) => {
  //  if (i18n.te(key, i18n.fallbackLocale)) {
  //    return i18n.t(key, i18n.fallbackLocale).toString();
  //  }
  //
  if (words[key] && words[key][lang]) return words[key][lang];
  if (!missing[key] || !missing[key][lang]) {
    //    console.log(`missing for lang (${lang}): '${key}'`);
    if (missing[key]) missing[key][lang] = null;
    else
      missing[key] = {
        [lang]: null,
      };
  }
  if (words[key] && words[key][i18nOptions.fallbackLocale])
    return words[key][i18nOptions.fallbackLocale];
  else if (!missing[key] || !missing[key][i18nOptions.fallbackLocale]) {
    //    console.log(`missing for lang (${lang}): '${key}'`);
    if (missing[key]) missing[key][i18nOptions.fallbackLocale] = key;
    else
      missing[key] = {
        [i18nOptions.fallbackLocale]: key,
      };
  }
  return key; // instead of showing the key + warning
};

export default i18n;
