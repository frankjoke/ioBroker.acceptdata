import "typeface-roboto";
//import "material-design-icons-iconfont/dist/material-design-icons.css";
import "@mdi/font/css/materialdesignicons.min.css";

import Vue from "vue";
import Vuetify from "vuetify/lib";
import { Ripple } from "vuetify/lib/directives";
Vue.use(Vuetify, {
  directives: {
    Ripple,
  },
});

export default new Vuetify({
  icons: {
    iconfont: "mdi",
  },
});
