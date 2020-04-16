<template>
  <v-app>
    <v-app-bar app color="primary" dark dense elevate-on-scroll scroll-target="#MyAppContent">
      <div class="d-flex align-center">
        <v-img
          :alt="iobrokerAdapter"
          class="shrink mr-2"
          contain
          src="../public/acceptdata.png"
          width="35"
        />
        <FjB
          :href="iobrokerAdapterCommon.readme"
          target="_blank"
          text
          img="mdi-help-circle"
          :tooltip="'Goto readme for ' + iobrokerAdapter"
          :label="iobrokerAdapter + ' v(' + iobrokerPackage.version + ')'"
        />
      </div>
      <v-tabs centered v-model="page">
        <v-tab>
          Tab 1
          <v-icon right small>mdi-cog</v-icon>
        </v-tab>
        <v-tab>
          Tab 2
          <v-icon right small>mdi-phone</v-icon>
        </v-tab>
        <v-tab>
          Tab 3
          <v-icon right small>mdi-briefcase-upload</v-icon>
        </v-tab>
      </v-tabs>
      <v-spacer></v-spacer>
      <FjFileSaveButton
        :content="iobrokerConfig"
        :opts="{ type: 'JSON', basename: iobrokerAdapter + '-config' }"
        icon
        small
        text
        tooltip="Download Config JSON or shift-click to copy to clipboard"
        img="mdi-briefcase-download"
      />
      <FjFileLoadButton
        @onchange="iobrokerConfig = arguments[0]"
        text
        icon
        small
        tooltip="Upload Config JSON or drop config file here"
        img="mdi-briefcase-upload"
        message="Loaded config!"
      />
      <FjB
        text
        :disabled="!iobrokerConfigChanged"
        small
        @click.stop="saveAdapterConfig"
        label="Save"
        img="mdi-content-save"
        tooltip="Save current config"
      />
      <FjAlerts :offsetX="0" :offsetY="20" />
      <FjB
        text
        small
        @click.stop="saveAdapterConfig().then(_ => closeAdapterConfig())"
        :disabled="!iobrokerConfigChanged"
        dense
        tooltip="Save settings and close config"
        label="Save&Close"
        img="mdi-content-save-move"
      />
      <FjB
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
      <FjB
        class="ma-1"
        label="getEnums"
        @click="getEnums('').then(res => tmptext = JSON.stringify(res))"
      />
      <FjB
        class="ma-1"
        label="getGroups"
        @click="getGroups().then(res => tmptext = JSON.stringify(res))"
      />
      <FjB
        class="ma-1"
        label="getUsers"
        @click="getUsers().then(res => tmptext = JSON.stringify(res))"
      />
      <FjB
        class="ma-1"
        label="getUsers"
        @click="getUsers().then(res => tmptext = JSON.stringify(res))"
      />
      <FjB
        class="ma-1"
        label="getExtendableInstances"
        @click="getExtendableInstances().then(res => tmptext = JSON.stringify(res))"
      />
      <FjB
        class="ma-1"
        label="getAdapterInstances"
        @click="getAdapterInstances().then(res => tmptext = JSON.stringify(res))"
      />
      <FjB
        class="ma-1"
        label="getState"
        @click="getState('acceptdata.0.easyweather.outdoorTemp').then(res => tmptext = JSON.stringify(res))"
      />
      <FjB
        class="ma-1"
        label="getObject"
        @click="getObject('acceptdata.0.easyweather.outdoorTemp').then(res => tmptext = JSON.stringify(res))"
      />
      <v-textarea class="ma-2" v-model="tmptext" auto-grow style="font-family: monospace !important; font-size: 0.9em;"/>
    </v-content>
    <FjConfirm />
  </v-app>
</template>

<script>
//import axios from "axios";

import helper from "./plugins/helper";
import ioBroker from "./plugins/iobroker";

const myCache = {};
/*
function fix(number, digits, min, max) {
  min = min || Number.NEGATIVE_INFINITY;
  max = max || Number.POSITIVE_INFINITY;
  number = number < min ? min : number;
  number = number > max ? max : number;
  return Number(number.toFixed(digits === undefined ? 3 : digits));
}
*/
// import Hello from './components/Hello';
export default {
  name: "App",
  mixins: [helper, ioBroker],
  
  data: () => {
    return {
      path,
      parts,
      page: 0,
      tmptext: "",
    };
  },

  sockets: {
    async connect() {

      this.$alert("socket connected...");
      this.wait(10).then(_ => this.loadIoBroker());
    },

    async disconnected() {
      this.$alert("socket disconnected...");
    },
  },

//  beforeMount() {},

//  filters: {},

  methods: {
    async loadIoBroker() {
      await this.loadSystemConfig();

      this.$i18n.locale = this.iobrokerLang;

      var instance = window.location.search.slice(1);
      if (!instance) {
        this.iobrokerInstance = this.iobrokerAdapter + ".0";
//        console.log("beforeMount!", `instance="${this.iobrokerInstance}"`);
      }
      await this.getAdapterConfig();
    },
    /*
    remove(item) {
      this.selected.splice(this.selected.indexOf(item), 1);
      this.selected = [...this.selected];
    },

    consoleLog(...args) {
      let s = "";
      args.map((l) => (s += l + " "));
      this.message += s + "<br>";
    },

    proxyAxios(url, always) {
      return axios({
        method: "get",
        url:
          process.env.IS_ELECTRON && !always
            ? url
            : "http://cors-anywhere.herokuapp.com/" + url,
        headers: { "Access-Control-Allow-Origin": true },
      });
    },
*/
  },

//  watch: {},

//  mounted() {},

//  created() {},
};
</script>
<style scoped.vue>
html {
  overflow-y: auto !important;
}

tr.alternate:nth-child(odd) {
  background: #e3f2fd;
}

td,
th,
th[role="columnheader"] {
  padding: 0 1px;
  border-left: 1px dotted #dddddd;
}
</style>
