<template>
  <v-app>
    <v-app-bar
      app
      color="primary"
      dark
      dense
      elevate-on-scroll
      scroll-target="#MyAppContent"
    >
      <div class="d-flex align-center">
        <v-img
          :alt="iobrokerAdapter"
          class="shrink mr-2"
          contain
          src="../public/icon.png"
          width="35"
        />
        <fjB
          :href="adapterReadme"
          target="_blank"
          text
          img="mdi-help-circle-outline"
          :tooltip="'Goto readme for ' + iobrokerAdapter"
          :label="iobrokerAdapter + ' v(' + iobrokerPackage.version + ')'"
        />
      </div>
      <v-tabs centered v-model="page">
        <v-tab v-for="item in configTranslated" v-bind:key="item.label">
          <v-icon v-if="item.icon" left small>{{ item.icon }}</v-icon>
          <span v-t="item.label" />
        </v-tab>
      </v-tabs>
      <v-spacer></v-spacer>
      <fjFileSaveButton
        :content="iobrokerConfig"
        :opts="{ type: 'JSON', basename: iobrokerAdapter + '-config' }"
        icon
        small
        text
        tooltip="Download Config JSON or shift-click to copy to clipboard"
        img="mdi-briefcase-download"
      />
      <fjFileLoadButton
        @onchange="iobrokerConfig = arguments[0]"
        text
        icon
        small
        tooltip="Upload Config JSON or drop config file here"
        img="mdi-briefcase-upload"
        message="Loaded config!"
      />
      <fjB
        text
        :disabled="!iobrokerConfigChanged"
        small
        @click.stop="saveAdapterConfig(null)"
        label="Save"
        img="mdi-content-save"
        tooltip="Save current config"
      />
      <fjAlerts :offsetX="0" :offsetY="20" />
      <fjB
        text
        small
        @click.stop="saveAdapterConfig(null).then(() => closeAdapterConfig())"
        :disabled="!iobrokerConfigChanged"
        dense
        tooltip="Save settings and close config"
        label="Save&Close"
        img="mdi-content-save-move"
      />
      <fjB
        text
        small
        dense
        tooltip="cancel and close config"
        label="Cancel"
        img="mdi-close"
        @click.stop="closeAdapterConfig"
      />
    </v-app-bar>

    <v-content id="MyAppContent" class="flex-wrap">
      <div v-if="devMode">
        <fjB
          class="ma-1"
          label="getEnums"
          @click="getEnums('').then((res) => setTmp(res))"
        />
        <fjB
          class="ma-1"
          label="getGroups"
          @click="getGroups().then((res) => setTmp(res))"
        />
        <fjB
          class="ma-1"
          label="getUsers"
          @click="getUsers().then((res) => setTmp(res))"
        />
        <fjB class="ma-1" label="config" @click="setTmp(iobrokerConfig)" />
        <fjB
          class="ma-1"
          label="configTranslated"
          @click="setTmp(configTranslated)"
        />
        <fjB
          class="ma-1"
          label="getExtendableInstances"
          @click="getExtendableInstances().then((res) => setTmp(res))"
        />
        <fjB
          class="ma-1"
          label="getAdapterInstances"
          @click="getAdapterInstances().then((res) => setTmp(res))"
        />
        <fjB
          class="ma-1"
          label="getState"
          @click="
            getState('acceptdata.0.Test.speed').then((res) => setTmp(res))
          "
        />
        <fjB
          class="ma-1"
          label="getObject"
          @click="
            getObject('acceptdata.0.Test.temp').then((res) => setTmp(res))
          "
        />
        <fjB
          class="ma-1"
          label="getHost"
          @click="
            getHost(iobrokerAdapterCommon.host).then((res) => setTmp(res))
          "
        />
        <fjB
          class="ma-1"
          :label="$tc('getMissing', 2)"
          @click="setTmp($missing)"
        />
        <fjB
          class="ma-1"
          :label="$tc('getEnv', 2)"
          @click="setTmp(process.env)"
        />
        <fjB
          class="ma-1"
          :label="$tc('getInterfaces', 2)"
          @click="getInterfaces().then((res) => setTmp(res))"
        />
        <fjB
          class="ma-1"
          :label="$tc('loadSystemConfig', 2)"
          @click="loadSystemConfig().then((res) => setTmp(res))"
        />
        <fjB
          class="ma-1"
          label="alerttest"
          @click="$alert('0|error:Forever')"
        />
      </div>
      <code
        v-if="devMode"
        class="error--text text--darken-4"
        v-text="tmptext"
      />
      <fjConfigContainer :cItem="iobrokerConfig" :configPage="configPage" />
    </v-content>
    <fjConfirm />
  </v-app>
</template>

<script>
//import axios from "axios";

import helper from "./plugins/helper";
import ioBroker from "./plugins/iobroker";
import iobroker from "./plugins/iobroker";

const myCache = {};

let what = null;
// console.log(process.env);
/*
function fix(number, digits, min, max) {
  min = min || Number.NEGATIVE_INFINITY;
  max = max || Number.POSITIVE_INFINITY;
  number = number < min ? min : number;
  number = number > max ? max : number;
  return Number(number.toFixed(digits === undefined ? 3 : digits));
}
*/

export default {
  name: "App",
  mixins: [helper, ioBroker],

  data: () => {
    return {
      page: -1,
      configPage: { items: [] },
      adapterReadme: "",
      tmptext: "",
    };
  },

  //  created() {},
  async beforeMount() {
    this.page = 0;
    return await this.makeConfigPage(0);
  },
  async mounted() {
    //    console.log(this.$i18n);
    this.setAdapterReadme(this.iobrokerLang);
  },
  //  filters: {},

  methods: {
    setTmp(res, add) {
      const newT =
        typeof res == "number" || typeof res == "string"
          ? res
          : JSON.stringify(res, null, 2);
      if (add) this.tmptext += "\n" + newT;
      else this.tmptext = "" + newT;
    },

    async setAdapterReadme(lang) {
      const rm = this.iobrokerAdapterCommon.readme;
      const lrm = rm.replace(
        "README.md",
        "README_" + lang.toLowerCase() + ".md"
      );
      let errr = false;
      const url =
        (lrm.startsWith("https")
          ? "https://cors-anywhere.herokuapp.com/"
          : "http://cors-anywhere.herokuapp.com/") + lrm;

      try {
        errr = await fetch(url, { method: "HEAD" }).then(
          (res) => (errr = !res.ok),
          () => (errr = true)
        );
      } catch (e) {
        errr = true;
      }
      this.adapterReadme = errr ? rm : lrm;
      return this.adapterReadme;
    },

    async makeConfigPage(page) {
      const cp = Object.assign(
        {},
        this.copyObject(this.configTranslated[page] || {})
      );
      // console.log(
      //   "MakeConfigPage:",
      //   page,
      //   this.configTranslated,
      //   this.configTranslated[page]
      // );
      this.configPage = cp;
      const items = cp.items;
      this.$set(this.configPage, "items", []);
      this.$set(this.configPage, "page", page);
      for (const i in items) this.configPage.items.splice(i, 1, items[i]);
      //      return this.wait(10).then(() => this.$forceUpdate());
      //      console.log("MakeConfigPage:", this.configPage);
      return this.configPage;
    },
  },

  //  computed: {},

  watch: {
    page(newV) {
      this.wait(10).then(() => this.makeConfigPage(Number(newV)));
    },
    configTranslated: {
      handler: function () {
        this.wait(10).then(() => this.makeConfigPage(Number(this.page)));
      },
      deep: true,
    },
    async iobrokerLang(newv) {
      const readme = await this.setAdapterReadme(newv);
      this.AdapterReadme = readme;
    },
  },
};
</script>
<style scoped.vue>
html {
  overflow-y: auto !important;
}
</style>
