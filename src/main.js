// @ts-nocheck
/* eslint-disable */
import Vue from "vue";
import vuetify from "./plugins/vuetify";
import App from "./App.vue";
//import VueChart from "@seregpie/vue-chart";
import i18n from './i18n'

import FjB from "./components/FjB";
import FjAlerts from "./components/FjAlerts";
import FjConfirm from "./components/FjConfirm"
import FjFileLoadButton from "./components/FjFileLoadButton"
import FjFileSaveButton from "./components/FjFileSaveButton"
import VueClipboard from "vue-clipboard2";

Vue.use(VueClipboard);
Vue.component("FjB", FjB);
Vue.component("FjAlerts", FjAlerts);
Vue.component("FjConfirm", FjConfirm);
Vue.component("FjFileLoadButton", FjFileLoadButton);
Vue.component("FjFileSaveButton", FjFileSaveButton);


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

new Vue({
  vuetify,
  i18n,

  render: function (h) {
    return h(App);
  }
}).$mount("#app");
