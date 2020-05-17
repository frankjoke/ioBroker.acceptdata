//import Vue from "vue";
// import packagej from "../../package.json";
// import iopackage from "../../io-package.json";
//import { runInThisContext } from "vm";

// var path = location.pathname;
// var parts = path.split("/");
// parts.splice(-3);
// var instance = window.location.search;
const devMode = process.env.NODE_ENV !== "production";
const inst = window.location.search.slice(1) || "0";
var aname = window.location.pathname.split("/");
aname = aname[aname.length - 2];
if (aname === "" && process.env.VUE_APP_ADAPTERNAME)
  aname = process.env.VUE_APP_ADAPTERNAME;

//console.log(process.env, inst, aname);

//console.log(process.env);
const mylang = (navigator.language || navigator.userLanguage).slice(0, 2);
const myCache = {};

const iobroker = {
  data() {
    return {
      iobrokerConfigOrig: "",
      iobrokerHost: "",
      iobrokerHostConnection: {},
      iobrokerLang: mylang || "en",
      iobrokerInstance: inst,
      iobrokerConfigFile: {},
      iobrokerConfig: {}, //iopackage.native,
      ioBrokerSystemConfig: null,
      iobrokerAdapter: aname, // iopackage.common.name,
      iobrokerPackage: {}, // packagej,
      iobrokerIoPackage: {}, //iopackage,
      iobrokerAdapterCommon: {}, // iopackage.common,
      ioBrokerCerts: [],
      configTranslated: [],
      socketConnected: false,
      iobrokerReadme: "",
      adapterIcon: "",
      devMode,
    };
  },
  sockets: {
    connect() {
      this.socketConnected = true;
      this.iobrokerHostConnection = this.$socket.io.opts;
      if (!this.ioBrokerSystemConfig) this.loadSystemConfig();
      this.$alert("socket connected...");
    },

    disconnected() {
      this.socketConnected = true;
      this.$alert("Socket disconnected. try to reconnect...");
      this.$socket.open();
    },
  },

  computed: {
    ioBrokerCompareConfig() {
      return this.myStringify(this.iobrokerConfig);
    },

    iobrokerConfigChanged() {
      return this.iobrokerConfigOrig != this.ioBrokerCompareConfig;
    },

    iobrokerAdapterInstance() {
      return this.iobrokerAdapter + "." + this.iobrokerInstance;
      //      return this.iobrokerInstance;
    },
  },

  watch: {
    iobrokerConfigFile: {
      handler: function () {
        this.translateConfig(this.iobrokerConfigFile);
      },
      deep: true,
    },
    async iobrokerLang(newv) {
      const readme = await this.setAdapterReadme(
        newv,
        this.iobrokerAdapterCommon
      );
      this.iobrokerReadme = readme;
    },
    async iobrokerAdapterCommon(newv) {
      const readme = await this.setAdapterReadme(this.iobrokerLang, newv);
      this.iobrokerReadme = readme;
    },
  },
  async created() {
    this.iobrokerInstance = window.location.search.slice(1) || "0";
    this.iobrokerLang = this.$i18n.locale = (
      navigator.language || navigator.userLanguage
    ).slice(0, 2);
    await this.loadConfigFile();
  },

  beforeMount() {
    this.iobrokerHostConnection = this.$socket.io.opts;
    if (this.$socket.connected && !this.ioBrokerSystemConfig)
      this.loadSystemConfig();
    //    console.log("beforeMount:", this.$socket);
  },

  async mounted() {
    //    console.log("Mounted:", this.$socket);
    await this.loadIoBroker();
    await this.wait(5);
    this.setAdapterReadme(this.iobrokerLang, this.iobrokerAdapterCommon);

    /*     return this.loadSystemConfig()
          .then(() => this.wait(10))
          .then(() => (this.iobrokerHostConnection = this.$socket.io.opts))
          .then(() => this.loadIoBroker());
     */
  },

  methods: {
    async loadConfigFile() {
      let config = null;
      try {
        config = await fetch("./config.json")
          .then((res) => {
            // console.log("fetcher config.json", res);
            return res.json();
          })
          .catch((err) => (console.log("config.json fetch err", err), null));
      } catch (e) {
        console.log("config.json fetch err", e);
      }
      if (config) {
        this.iobrokerConfigFile = config;
        this.adapterIcon = config.icon;
      }
    },

    setAdapterReadme(lang, common) {
      let rm = common.readme;
      if (!rm) return "";
      const crm = this.iobrokerConfigFile.readme;
      if (crm && crm[lang]) rm = rm.replace("README.md", crm[lang]);
      this.iobrokerReadme = rm;
      return rm;
    },

    translateConfig(conf) {
      const that = this;

      function transl(o) {
        const props = Object.getOwnPropertyNames(o);
        const n = {};
        for (const p of props)
          n[p] =
            ["label", "text", "html", "tooltip", "placeholder", "hint"].indexOf(
              p
            ) >= 0
              ? that.$t(o[p])
              : o[p];
        if (Array.isArray(n.items))
          for (const i in n.items) n.items.slice(i, 1, transl(o.items[i]));
        if (n.eval) {
          const $ = n;
          const ft = n.eval.trim();
          const fun = new Function(
            "$",
            ft.startsWith("{") ? ft : `return (${ft});`
          );
          try {
            const res = fun.apply(that, [n]);
          } catch (e) {
            console.log("eval error in translation:", n, e, that);
          }
        }
        return n;
      }

      const ict = conf && conf.configTool;
      if (!ict) return [];
      const iopackage = this.iobrokerAdapterCommon;
      const trans = conf && conf.translation;
      const oldV = this.copyObject(ict && ict.length ? ict : []);

      // this.adapterIcon = iopackage && iopackage.icon;
      // this.copyObject(
      //      );
      // console.log(
      //   "new config to translate:",
      //   oldV,
      //   this.iobrokerHostConnection.hostname,
      //   this.iobrokerConfig.port
      // );
      //      console.log(this.$i18n);
      if (trans) {
        const om = this.copyObject(this.$i18n.messages);
        const nm = this.$i18n.loadLocaleMessages(trans, om);
        for (const lang of Object.keys(nm))
          this.$i18n.setLocaleMessage(lang, nm[lang]);
      }
      //      console.log("Port", this.$t("Port"));
      this.$set(this, "configTranslated", []);
      for (const i of oldV) {
        if (devMode || !i.devOnly) this.configTranslated.push(transl(i));
      }
      //      console.log("TRanslatedConfig:", this.configTranslated);
      return this.configTranslated;
    },

    setIobrokerConfig(conf) {
      const js = this.myStringify(conf || {});
      this.$set(this, "iobrokerConfig", JSON.parse(js));
      this.$set(this, "iobrokerConfigOrig", js);
    },

    async loadIoBroker() {
      const id = "system.adapter." + this.iobrokerAdapterInstance;
      const res = await this.socketEmit("getObject", id);
      if (!res)
        return console.log(`No Adapterconfig received for ${id}!`), null;
      this.setIobrokerConfig(res.native);
      if (res.common) this.iobrokerAdapterCommon = res.common;
      //      this.$alert("new config received");
      await this.wait(10);
      this.$forceUpdate();
      return res;
    },

    async sendTo(_adapter_instance, command, message) {
      return this.socketSendTo(
        "sendTo",
        _adapter_instance || this.iobrokerAdapterInstance,
        command,
        message
      );
    },

    async sendToHost(host, command, message) {
      return this.socketSendTo(
        "sendToHost",
        host || this.iobrokerAdapterCommon.host,
        command,
        message
      );
    },

    async getInterfaces(onlyNames) {
      const result = await this.sendToHost(null, "getInterfaces", null);
      if (result && result.result) {
        if (onlyNames) return Object.keys(result.result);
        else return Object.entries(result.result);
      } else return [];
    },

    async getHost(ahost) {
      ahost = ahost || this.iobrokerAdapterCommon.host;
      const host = await this.socketEmit("getHostByIp", ahost).then(
        (res) => (this.iobrokerHost = res),
        (e) => null
      );
      return host;
    },

    getLocalTime(time) {
      const d = new Date(time || Date.now());
      const diff = d.getTimezoneOffset();
      return new Date(d.getTime() - diff * 60 * 1000).toISOString();
    },

    iobrokerConfigD() {
      const conf = this.copyObject(this.iobrokerConfig);
      conf._adapter_info_ = {
        time: this.getLocalTime(),
        instance: this.iobrokerAdapterInstance,
        version: this.iobrokerAdapterCommon.version,
        host: this.iobrokerAdapterCommon.host,
      };
      return conf;
    },

    async saveAdapterConfig(common) {
      const native = this.copyObject(this.iobrokerConfig);
      const id = "system.adapter." + this.iobrokerAdapterInstance;
      const oldObj =
        (await this.socketEmit("getObject", id).catch((e) => null)) || {};
      if (!oldObj.native) return false;
      for (var a of Object.getOwnPropertyNames(native))
        if (a && a != "_adapter_info_") oldObj.native[a] = native[a];

      if (common)
        for (var b in Object.getOwnPropertyNames(common))
          oldObj.common[b] = common[b];

      /* 
      if (this.configTool.length) {
        oldObj.configTool = [...this.configTool];
      }
 */

      //      console.log("Save ", id, oldObj);
      await this.socketEmit("setObject", id, oldObj).then(
        () => this.$alert("config saved"),
        (e) => this.$alert("error:Save config error " + e)
      );

      this.setIobrokerConfig(native);
      await this.wait(10);
      return true;
    },

    async closeAdapterConfig(event) {
      function close() {
        if (typeof parent !== "undefined" && parent) {
          try {
            if (
              parent.$iframeDialog &&
              typeof parent.$iframeDialog.close === "function"
            ) {
              parent.$iframeDialog.close();
            } else {
              parent.postMessage("close", "*");
            }
          } catch (e) {
            parent.postMessage("close", "*");
          }
        }
      }
      if (event.altKey && event.shiftKey) {
        this.$copyText(JSON.stringify(this.$missing, null, 2));
        return this.$alert("Missing words saved to clipboard!");
      }
      const res = this.iobrokerConfigChanged
        ? await this.$confirm(
            "okColor=error darken-2|Really exit without saving?"
          )
        : true;
      if (res)
        if (this.devMode) this.$alert("would close now " + res);
        else close();
      return res;
    },

    async getObject(id) {
      return await this.socketEmit("getObject", id).then(
        (res) => res,
        (e) => (console.log("getObject err:", id, e), null)
      );
    },

    async getState(id) {
      return this.socketEmit("getState", id).then(
        (res) => res,
        (e) => (console.log(e), null)
      );
    },

    async getEnums(_enum) {
      return this.socketEmit("getObjectView", "system", "enum", {
        startkey: "enum." + _enum,
        endkey: "enum." + _enum + ".\u9999",
      }).then(
        (res) => {
          var _res = {};
          for (var i = 0; i < res.rows.length; i++) {
            if (res.rows[i].id === "enum." + _enum) continue;
            _res[res.rows[i].id] = res.rows[i].value;
          }
          return _res;
        },
        (e) => (console.log(e), [])
      );
    },

    async getGroups() {
      return this.socketEmit("getObjectView", "system", "group", {
        startkey: "system.group.",
        endkey: "system.group.\u9999",
      }).then(
        (res) => {
          var _res = {};
          for (var i = 0; i < res.rows.length; i++) {
            _res[res.rows[i].id] = res.rows[i].value;
          }
          return _res;
        },
        (e) => (console.log(e), [])
      );
    },

    async getUsers() {
      return this.socketEmit("getObjectView", "system", "user", {
        startkey: "system.user.",
        endkey: "system.user.\u9999",
      }).then(
        (res) => {
          var _res = {};
          for (var i = 0; i < res.rows.length; i++) {
            _res[res.rows[i].id] = res.rows[i].value;
          }
          return _res;
        },
        (e) => (console.log(e), [])
      );
    },

    async getAdapterInstances(adapter) {
      adapter = adapter || this.iobrokerAdapter;

      return this.socketEmit("getObjectView", "system", "instance", {
        startkey: "system.adapter." + adapter,
        endkey: "system.adapter." + adapter + ".\u9999",
      }).then(
        (doc) => {
          var res = [];
          for (var i = 0; i < doc.rows.length; i++) res.push(doc.rows[i].value);
          return res;
        },
        (e) => (console.log(e), [])
      );
    },

    async getExtendableInstances(adapter) {
      adapter = adapter || this.iobrokerAdapter;

      return this.socketEmit("getObjectView", "system", "instance", null).then(
        (doc) => {
          var res = [];
          for (var i = 0; i < doc.rows.length; i++)
            if (doc.rows[i].value.common.webExtendable) {
              res.push(doc.rows[i].value);
            }
          return res;
        },
        (e) => (console.log(e), [])
      );
    },

    async loadSystemConfig() {
      let counter = 10;
      // console.log("Will try to load systemconfig now ...");
      while (counter)
        try {
          counter -= 1;
          const res = await this.loadSystemConfigInner();
          return res;
        } catch (e) {
          //          console.log("Retry load SystemConfig ", counter, e);
        }
      console.log("Could not load System config after 10 trials!");
      return null;
    },
    
    async loadSystemConfigInner() {
      let res = await this.socketEmit({
        event: "system.config",
        timeout: 1000,
      }).then(
        (x) => x,
        (e) => null
      );
      if (res && res.common) {
        this.ioBrokerSystemConfig = res;
        this.iobrokerLang = res.common.language || this.iobrokerLang;
        this.$i18n.locale = this.iobrokerLang;
      } else return Promise.reject(null);

      res = await this.socketEmit({
        event: "system.certificates",
        timeout: 1000,
      }).then(
        (x) => x,
        (e) => null
      );
      if (res && res.native && res.native.certificates) {
        this.ioBrokerCerts = [];
        for (var c in res.native.certificates) {
          if (
            !res.native.certificates.hasOwnProperty(c) ||
            !res.native.certificates[c]
          )
            continue;

          // If it is filename, it could be everything
          if (
            res.native.certificates[c].length < 700 &&
            (res.native.certificates[c].indexOf("/") !== -1 ||
              res.native.certificates[c].indexOf("\\") !== -1)
          ) {
            var __cert = {
              name: c,
              type: "",
            };
            if (c.toLowerCase().indexOf("private") !== -1) {
              __cert.type = "private";
            } else if (
              res.native.certificates[c].toLowerCase().indexOf("private") !== -1
            ) {
              __cert.type = "private";
            } else if (c.toLowerCase().indexOf("public") !== -1) {
              __cert.type = "public";
            } else if (
              res.native.certificates[c].toLowerCase().indexOf("public") !== -1
            ) {
              __cert.type = "public";
            }
            this.ioBrokerCerts.push(__cert);
            continue;
          }

          var _cert = {
            name: c,
            type:
              res.native.certificates[c].substring(
                0,
                "-----BEGIN RSA PRIVATE KEY".length
              ) === "-----BEGIN RSA PRIVATE KEY" ||
              res.native.certificates[c].substring(
                0,
                "-----BEGIN PRIVATE KEY".length
              ) === "-----BEGIN PRIVATE KEY"
                ? "private"
                : "public",
          };
          if (_cert.type === "public") {
            var m = res.native.certificates[c].split(
              "-----END CERTIFICATE-----"
            );
            var count = 0;
            for (var _m = 0; _m < m.length; _m++) {
              if (m[_m].replace(/\r\n|\r|\n/, "").trim()) count++;
            }
            if (count > 1) _cert.type = "chained";
          }

          this.ioBrokerCerts.push(_cert);
        }
      }
      return this.ioBrokerSystemConfig;
    },
  },
};

export default iobroker;
