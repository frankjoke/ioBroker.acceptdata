//import Vue from "vue";
import packagej from "../../package.json";
import iopackage from "../../io-package.json";
//import { runInThisContext } from "vm";

// var path = location.pathname;
// var parts = path.split("/");
// parts.splice(-3);
// var instance = window.location.search;
const devMode = process.env.NODE_ENV !== "production";

//console.log(process.env);
const mylang = (navigator.language || navigator.userLanguage).slice(0, 2);
const iobroker = {
  data() {
    return {
      iobrokerConfigOrig: "",
      iobrokerHost: "",
      iobrokerHostConnection: {},
      iobrokerLang: mylang || "en",
      iobrokerInstance: window.location.search.slice(1) || "0",
      iobrokerConfig: iopackage.native,
      ioBrokerSystemConfig: null,
      iobrokerAdapter: iopackage.common.name,
      iobrokerPackage: packagej,
      iobrokerIoPackage: iopackage,
      iobrokerAdapterCommon: iopackage.common,
      ioBrokerCerts: [],
      socketConnected: false,
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
      return JSON.stringify(this.iobrokerConfig);
    },

    iobrokerConfigChanged() {
      return this.iobrokerConfigOrig != this.ioBrokerCompareConfig;
    },

    iobrokerAdapterInstance() {
      return this.iobrokerAdapter + "." + this.iobrokerInstance;
      //      return this.iobrokerInstance;
    },

    configTranslated() {
      const that = this;

      function transl(o) {
        const props = Object.getOwnPropertyNames(o);
        for (const p of props)
          if (
            ["label", "text", "html", "tooltip", "placeholder", "hint"].indexOf(
              p
            ) >= 0
          )
            o[p] = that.$t(o[p]);
        if (Array.isArray(o.items)) for (const i of o.items) transl(i);
        if (o.eval) {
          const $ = o;
          const ft = o.eval.trim();
          const fun = new Function(
            "$",
            ft.startsWith("{") ? ft : `return (${ft});`
          );
          try {
            const res = fun.apply(that, [o]);
          } catch (e) {
            console.log("eval error in translation:", o, e, that);
          }
        }
        return o;
      }

      const ict = this.iobrokerConfig && this.iobrokerConfig._configTool;
      const ipt =
        this.iopackage &&
        this.iopackage.native &&
        this.iopackage.native._configTool;
      const oldV = this.copyObject(
        ict && ict.length ? ict : ipt && ipt.length ? ipt : []
      );
      // console.log(
      //   "new config to translate:",
      //   oldV,
      //   this.iobrokerHostConnection.hostname,
      //   this.iobrokerConfig.port
      // );
      const newV = [];
      for (const i of oldV) {
        if (devMode || !i.devOnly) newV.push(transl(i));
      }
      return newV;
    },
  },

  //  watch: {},
  created() {
    this.iobrokerInstance = window.location.search.slice(1) || "0";
  },

  beforeMount() {
    this.iobrokerHostConnection = this.$socket.io.opts;
    if (this.$socket.connected && !this.ioBrokerSystemConfig)
      this.loadSystemConfig();
    console.log("beforeMount:", this.$socket);
  },

  async mounted() {
    this.iobrokerHostConnection = this.$socket.io.opts;
    console.log("Mounted:", this.$socket);
    return this.loadIoBroker();
    /*     return this.loadSystemConfig()
          .then((_) => this.wait(10))
          .then((_) => (this.iobrokerHostConnection = this.$socket.io.opts))
          .then((_) => this.loadIoBroker());
     */
  },

  methods: {
    copyObject(obj) {
      return JSON.parse(JSON.stringify(obj));
    },

    setIobrokerConfig(conf) {
      const js = JSON.stringify(conf || {});
      this.iobrokerConfig = JSON.parse(js);
      this.iobrokerConfigOrig = js;
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

    async saveAdapterConfig(common) {
      const native = this.iobrokerConfig;
      const id = "system.adapter." + this.iobrokerAdapterInstance;
      const oldObj =
        (await this.socketEmit("getObject", id).catch((e) =>
          console.log("GetAdapterConfig:", id, e)
        )) || {};
      if (!oldObj.native) oldObj.native = {};

      for (var a in native) {
        if (native.hasOwnProperty(a && a != "_configTool")) {
          oldObj.native[a] = native[a];
        }
      }

      if (common)
        for (var b in Object.getOwnPropertyNames(common))
          oldObj.common[b] = common[b];

      /* 
      if (this.configTool.length) {
        oldObj.configTool = [...this.configTool];
      }
 */
      await this.socketEmit("setObject", id, oldObj).then(
        (_) => this.$alert("config saved"),
        (e) => this.$alert("error:Save config error " + e)
      );

      this.setIobrokerConfig(native);
      await this.wait(10);
      return true;
    },

    async closeAdapterConfig() {
      const res = this.iobrokerConfigChanged
        ? await this.$confirm(
            "okColor=error darken-2|Really exit without saving?"
          )
        : true;
      if (res) this.$alert("close now " + res);
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
      console.log("Will try to load systemconfig now ...");
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
