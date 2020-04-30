/* eslint-disable */
import Vue from "vue";
import vuetify from "./plugins/vuetify";
import App from "./App.vue";
//import VueChart from "@seregpie/vue-chart";
import i18n from './i18n'

import fjB from "./components/fjB";
import fjAlerts from "./components/fjAlerts";
import fjConfirm from "./components/fjConfirm"
import fjConfigElement from "./components/fjConfigElement"
import fjFileLoadButton from "./components/fjFileLoadButton"
import fjFileSaveButton from "./components/fjFileSaveButton"

Vue.component("fjB", fjB);
Vue.component("fjAlerts", fjAlerts);
Vue.component("fjConfirm", fjConfirm);
Vue.component("fjConfigElement", fjConfigElement);
Vue.component("fjFileLoadButton", fjFileLoadButton);
Vue.component("fjFileSaveButton", fjFileSaveButton);

Vue.config.productionTip = false;
//Vue.component(VueChart.name, VueChart);
/*
Vue.directive("t", {
  bind(el, binding, vnode) {
    console.log(binding, vnode.context);
    if (binding.arg == "bottom") {
      el.style.position = "fixed";
      el.style.bottom = "0px";
      el.style.width = "100%";
    } else {
      el.style.position = "sticky";
      el.style.top = "0px";
    }

    if (binding.modifiers.light) {
      el.style.background = "#CCC";
    }
 
    const tr = vnode.context.$t(binding.value);
    console.log(tr);
    el.value = tr;
  }
});
*/

import Sockets from "./plugins/sockets";

Vue.use(Sockets, {});
Vue.prototype.$alert = function (...args) {
  console.log(...args);
};

const missing = {};
Vue.prototype.$missing = missing;

i18n.missing = (lang, key, path) => {
  //  if (i18n.te(key, i18n.fallbackLocale)) {
  //    return i18n.t(key, i18n.fallbackLocale).toString();
  //  }
  //  
  if (!missing[key] || missing[key].indexOf(lang) < 0) {
//    console.log(`missing for lang (${lang}): '${key}'`);
    if (missing[key])
      missing[key].push(lang);
    else
      missing[key] = [lang];
  }
  return key; // instead of showing the key + warning
};

new Vue({
  vuetify,
  i18n,

  render: function (h) {
    return h(App);
  }
}).$mount("#app");