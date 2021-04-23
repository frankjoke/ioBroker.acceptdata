/* eslint-disable no-await-in-loop */
/* eslint-disable valid-jsdoc */
/* eslint-disable no-prototype-builtins */
/**
 *      iobroker MyAdapter II class
 *      (c) 2020- <frankjoke@hotmail.com>
 *      MIT License
 *
 *  V 1.0.1 July 2020
 */
"use strict";

//@ts-disable TS80006
//@js-disable TS80006

class CacheP {
  constructor(fun, delay) {
    // neue EintrÃ¤ge werden mit dieser Funktion kreiert
    if (typeof fun != "function")
      throw "CacheP needs an async function returning a Promise as first argument!";
    this._cache = {};
    this._fun = fun;
    this._delay = delay || 0;
    return this;
  }

  async cacheItem(item, prefereCache = true, fun) {
    fun = fun || this._fun;
    if (this._delay) await this.wait(this._delay);
    if (prefereCache && this._cache[item] !== undefined) return this._cache[item];
    // assert(MyAdapter.T(fun) === 'function', `checkItem needs a function to fill cache!`);
    const res = await fun(item);
    this._cache[item] = res;
    return res;
  }

  isCached(x) {
    return this._cache[x] !== undefined;
  }
  clearCache() {
    this._cache = {};
  }
  get cache() {
    return this._cache;
  }
  cacheSync(item, prefereCache = true, fun) {
    const cached = this.isCached(item);
    if (cached && prefereCache) return this._cache[item];
    fun = fun || this._fun;
    if (typeof fun == "function")
      try {
        const res = fun(item);
        if (res) {
          this._cache[item] = res;
          return res;
        }
      } finally {
        // empty
      }

    return null;
  }
}

class HrTime {
  constructor(time) {
    this.time = time;
  }

  get diff() {
    return process.hrtime(this._stime);
  }

  get text() {
    const t = this.diff;
    const ns = t[1].toString(10);
    return t[0].toString(10) + "." + ("0".repeat(9 - ns.length) + ns).slice(0, 6);
  }

  toString() {
    return this.text;
  }

  get time() {
    return Number(this.text);
  }

  set time(t) {
    this._stime = t || process.hrtime();
  }
}

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.template.0
const util = require("util"),
  cp = require("child_process"),
  os = require("os"),
  fs = require("fs"),
  masync = require("modern-async"),
  plugandplay = require("plug-and-play"),
  assert = require("assert"),
  axios = require("axios");

const objects = {},
  states = {},
  createdStates = {},
  sstate = {},
  plugins = plugandplay(),
  mstate = {};

plugins.$plugins = {};

let adapter,
  aoptions,
  aname,
  schedulers = [],
  _objChange,
  _stateChange,
  stopping = false,
  // allStates = null,
  // stateChange = null,
  systemconf = null;

function startAdapter(options) {
  if (!options) options = aoptions;
  options = options || {};
  if (typeof options === "string")
    options = {
      name: options,
    };
  else options.name = aname;
  options = Object.assign(options, {
    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async ready() {
      // Initialize your adapter here
      MyAdapter.extendObject = adapter.extendObjectAsync.bind(adapter);
      await plugins.call({
        name: "adapter$init",
        args: {
          adapter,
        },
        handler: ({ adapter }) => {
          //          console.log("Default adapter$init handler is starting", adapter.name);
          //          return amain && amain(adapter);
        },
      });
      await MyAdapter.initAdapter();
      await plugins.call({
        name: "adapter$start",
        args: {
          adapter,
        },
        handler: async ({ adapter }, handler) => {
          //          MyAdapter.D("Default adapter$start for %s is starting", adapter.namespace);
          return handler;
        },
      });
      await plugins.call({
        name: "adapter$run",
        args: {
          adapter,
        },
        handler: async ({ adapter }, handler) => {
          //          MyAdapter.D("Default adapter$run handler for %s is starting.", adapter.namespace);
          return handler;
        },
      });
    },
    /* Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    async unload(callback) {
      try {
        await MyAdapter.stop(0, false);
        callback();
      } catch (e) {
        callback();
      }
    },

    /**
     * Is called if a subscribed object changes
     * @param {string} id
     * @param {ioBroker.Object | null | undefined} obj
     */
    async objectChange(id, obj) {
      //		MyAdapter.D("Object %s was changed top %o", id, obj);
      setImmediate(() =>
        plugins
          .call({
            name: "adapter$objectChange",
            args: {
              adapter,
              id,
              obj,
            },
            handler: async ({ adapter, id, obj }, handler) => {
              //                MyAdapter.S("Default adapter$stateChange handler for %s: %s.", id, MyAdapter.O(state));
              return handler;
            },
          })
          .catch((err) => MyAdapter.W(`Error in ObjChange for ${id} = ${MyAdapter.O(err)}`))
      );

      if (obj) {
        // The object was changed
        objects[id] = obj;
        //			this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
      } else if (id) {
        // The object was deleted
        if (states[id]) delete states[id];
        if (sstate[id]) delete sstate[id];
        if (objects[id]) delete objects[id];
        //			this.log.info(`object ${id} deleted`);
      }
    },

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    async stateChange(id, state) {
      //		MyAdapter.D("State %s was changed top %o", id, state);
      //      if (!state || state.from !== "system.adapter." + MyAdapter.ains)
      setImmediate(() =>
        plugins
          .call({
            name: "adapter$stateChange",
            args: {
              adapter,
              id,
              state,
            },
            handler: async ({ adapter, id, state }, handler) => {
              //                MyAdapter.S("Default adapter$stateChange handler for %s: %s.", id, MyAdapter.O(state));
              return handler;
            },
          })
          .catch((err) => MyAdapter.W(`Error in StateChange for ${id} = ${MyAdapter.O(err)}`))
      );
      // if (allStates)
      // 	allStates(id, state).catch(e => this.W(`Error in AllStates for ${id} = ${this.O(e)}`)));
      if (state) {
        states[id] = state;
        // The state was changed
        //			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
      } else if (id) {
        // The state was deleted
        delete states[id];
        delete sstate[id];
        //			this.log.info(`state ${id} deleted`);
      }
    },

    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.message" property to be set to true in io-package.json
    //  * @param {ioBroker.Message} obj
    //  */
    /*     message(obj) {
      if (typeof obj === "object" && obj.command)
        MyAdapter.processMessage(
          obj
          // MyAdapter.D(`received Message ${MyAdapter.O(obj)}`, obj)
        );
      // 	if (obj.command === "send") {
      // 		// e.g. send email or pushover or whatever
      // 		this.log.info("send command");

      // 		// Send response in callback if required
      // 		if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
      // 	}
      // }
    },
 */
  });
  if (plugins.get({ name: "adapter$message" }).length) {
    options.message = (obj) => {
      if (typeof obj === "object" && obj.command) {
        plugins.call({
          name: "adapter$message",
          args: { message: obj },
          handler: async ({ message }) => Array.D(`Message received: ${MyAdapter.O(message)}`),
        });
        if (obj.callback) adapter.sendTo(obj.from, obj.command, "Message received", obj.callback);
      }
    };
  }
  try {
    const utils = require("@iobroker/adapter-core");
    adapter = new utils.Adapter(options);
    // MyAdapter.If("got following adapter: %o", options);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("cannot find ioBroker...");
  }
  if (adapter) MyAdapter.init2(adapter);
  return adapter;
}

function slog(log, text, val) {
  adapter && adapter.log && typeof adapter.log[log] === "function"
    ? // eslint-disable-next-line no-console
      adapter.log[log](text)
    : console.log(log + ":", text);
  return val !== undefined ? val : text;
}

function addSState(n, id) {
  if (!mstate[n]) {
    if (sstate[n] && sstate[n] !== id) {
      sstate[id] = id;
      mstate[n] = [id];
      delete sstate[n];
    } else sstate[n] = id;
  } else {
    mstate[n].push(id);
    sstate[id] = id;
  }
}

class MyAdapter {
  static get sleep() {
    return masync.sleep;
  }

  static get map() {
    return masync.map;
  }

  static setLogLevel(level = "info") {
    return adapter.setForeignStateAsync("system.adapter." + adapter.namespace + ".logLevel", level);
  }

  static get asyncRoot() {
    return masync.asyncRoot;
  }

  static get inspect() {
    return util.inspect;
  }

  static get plugins() {
    return plugins;
  }

  static get $plugins() {
    return plugins.$plugins;
  }

  static get $F() {
    return plugins.$plugins.functions;
  }

  static addHooks(hooks, options = {}) {
    if (typeof hooks === "function") hooks = { [hooks.name]: hooks };
    return plugins.register(Object.assign({}, options, { hooks }));
  }

  static get config() {
    return adapter.config;
  }

  static set stateChange(val) {
    _stateChange = val;
  }

  static get stateChange() {
    return _stateChange;
  }

  static set objChange(val) {
    _objChange = val;
  }
  static get objChange() {
    return _objChange;
  }

  static scheduler(fn, timer) {
    const sch = new masync.Scheduler(fn, timer);
    schedulers.push(sch);
    sch.start();
    return sch;
  }

  static getObjects(name) {
    name = !name ? "" : name;
    const opt = {
      include_docs: true,
    };
    if (name) {
      name = name === "*" ? "" : name;
      opt.startkey = (name.startsWith("system.") ? "" : this.ain) + name;
      opt.endkey = (name.startsWith("system.") ? "" : this.ain) + name + "\u9999";
    }
    return adapter.getObjectListAsync(opt).then(
      (res) => (res && res.rows ? res.rows : []),
      () => []
    );
  }

  // eslint-disable-next-line complexity
  static async initAdapter() {
    try {
      this.D("Adapter %s starting.", this.ains);
      this.getObjectList = adapter.getObjectListAsync
        ? adapter.getObjectListAsync.bind(adapter)
        : this.c2p(adapter.objects.getObjectList).bind(adapter.objects);
      this.getForeignState = adapter.getForeignStateAsync.bind(adapter);
      this.setForeignState = adapter.setForeignStateAsync.bind(adapter);
      this.getState = adapter.getStateAsync.bind(adapter);
      this.setState = adapter.setStateAsync.bind(adapter);
      this.getStates = adapter.getStatesAsync.bind(adapter);
      this.removeState = async (id, opt) => {
        await adapter.delStateAsync(id, opt).catch(this.nop);
        await adapter.delObjectAsync((delete states[id], id), opt).catch(this.nop);
      };
      const ms = await adapter.getStatesAsync("*").catch((err) => this.W(err));
      for (const s of Object.keys(ms)) states[s] = ms[s];
      //			console.log(states);
      let res = await this.getObjects("*");
      const len = res.length;
      for (const i of res) {
        const o = i.doc;
        objects[o._id] = o;
        if (o.type === "state" && o.common && o.common.name) {
          if (adapter.config.forceinit && o._id.startsWith(this.ain))
            await this.removeState(o.common.name);
          //                    if (!o._id.startsWith('system.adapter.'))
          addSState(o.common.name, o._id);
        }
      }
      res = await adapter.getForeignObjectAsync("system.config").catch(() => null);
      if (res) {
        systemconf = res.common;
        //                    this.If('systemconf: %o', systemconf);
        if (systemconf && systemconf.language) adapter.config.lang = systemconf.language;
        if (systemconf && systemconf.latitude) {
          adapter.config.latitude = parseFloat(systemconf.latitude);
          adapter.config.longitude = parseFloat(systemconf.longitude);
        }
        //                if (adapter.config.forceinit)
        //                    this.seriesOf(res, (i) => this.removeState(i.doc.common.name), 2)
        //                this.If('loaded adapter config: %o', adapter.config);
      }
      res = await adapter.getForeignObjectAsync("system.adapter." + this.ains).catch(() => null);
      if (res) {
        adapter.config.adapterConf = res.common;
        //                    this.If('adapterconf = %s: %o', 'system.adapter.' + this.ains, adapterconf);
        //                    this.If('adapter: %o', adapter);
        if (adapter.config.adapterConf && adapter.config.adapterConf.loglevel)
          adapter.config.loglevel = adapter.config.adapterConf.loglevel;
        //                    this.If('loglevel: %s, debug: %s', adapter.config.loglevel, MyAdapter.debug);
        //                if (adapter.config.forceinit)
        //                    this.seriesOf(res, (i) => this.removeState(i.doc.common.name), 2)
        //                this.If('loaded adapter config: %o', adapter.config);
      }
      this.D(
        `${adapter.name} received ${len} objects and ${this.ownKeys(states).length} states`
        //        } states, with config ${this.ownKeys(adapter.config)}`
      );
      adapter.subscribeStates("*");
      if (adapter._objChange) adapter.subscribeObjects("*");
      //                .then(() => objChange ? MyAdapter.c2p(adapter.subscribeObjects)('*').then(a => MyAdapter.I('eso '+a),a => MyAdapter.I('eso '+a)) : MyAdapter.resolve())
      //      this.I(aname + " initialization started...");
    } catch (e) {
      this.stop(this.E(aname + " Initialization Error:" + this.F(e)));
    }
  }

  static init(amodule, options) {
    //        assert(!adapter, `myAdapter:(${ori_adapter.name}) defined already!`);
    //    amain = ori_main;
    if (typeof options === "string")
      options = {
        name: options,
      };
    aoptions = Object.assign({}, options);
    aname = aoptions.name;
    if (amodule && amodule.parent) {
      amodule.exports = (options) => (adapter = startAdapter(options));
    } else {
      adapter = startAdapter(aoptions);
    }
  }

  static get AI() {
    return adapter;
  }

  static setConnected(value) {
    createdStates[this.ain + "info.connection"] = "info.connection";
    return adapter.setStateAsync("info.connection", { val: value, ack: true });
  }

  static init2() {
    //            if (adapter) this.If('adpter: %o',adapter);
    assert(adapter && adapter.name, "myAdapter:(adapter) no adapter here!");
    aname = adapter.name;

    //    inDebug =
    stopping = false;
    //    curDebug = 1;
    systemconf = null;

    this.writeFile = this.c2p(fs.writeFile);
    this.readFile = this.c2p(fs.readFile);
    this.getForeignObject = adapter.getForeignObjectAsync.bind(adapter);
    this.setForeignObject = adapter.setForeignObjectAsync.bind(adapter);
    this.getForeignObjects = adapter.getForeignObjectsAsync.bind(adapter);
    this.getObject = adapter.getObjectAsync.bind(adapter);
    this.deleteState = (id) =>
      adapter
        .deleteStateAsync(id)
        .catch((res) => (res === "Not exists" ? this.resolve() : this.reject(res)));
    this.delObject = (id, opt) =>
      adapter
        .delObjectAsync(id, opt)
        .catch((res) => (res === "Not exists" ? this.resolve() : this.reject(res)));
    this.delState = (id, opt) =>
      adapter
        .delStateAsync(id, opt)
        .catch((res) => (res === "Not exists" ? this.resolve() : this.reject(res)));
    this.removeState = (id, opt) =>
      adapter.delStateAsync(id, opt).then(() => this.delObject((delete states[id], id), opt));
    this.setObject = adapter.setObjectAsync.bind(adapter);
    this.createState = adapter.createStateAsync.bind(adapter);
    this.extendObject = adapter.extendObjectAsync.bind(adapter);
    this.extendForeignObject = adapter.extendForeignObjectAsync.bind(adapter);

    //        adapter.removeAllListeners();
    process.on("rejectionHandled", (reason, promise) =>
      this.W("Promise problem rejectionHandled of Promise %s with reason %s", promise, reason)
    );
    process.on("unhandledRejection", (reason, promise) =>
      this.W("Promise problem unhandledRejection of Promise %o with reason %o", promise, reason)
    );

    return adapter;
  }

  static idName(id) {
    if (objects[id] && objects[id].common) return objects[id].common.name; // + '(' + id + ')';
    if (sstate[id] && sstate[id] !== id) return id; // + '(' + sstate[id] + ')';
    return id; // +'(?)';
  }

  static J(/** string */ str, /** function */ reviewer) {
    let res;
    if (!str) return str;
    if (typeof str !== "string") str = str.toString();
    try {
      res = JSON.parse(str, reviewer);
    } catch (e) {
      res = {
        error: e,
        error_description: `${e} on string ${str}`,
      };
    }
    return res;
  }

  static pE(x, y) {
    y = y ? y : MyAdapter.pE;

    function get() {
      const oldLimit = Error.stackTraceLimit;
      Error.stackTraceLimit = Infinity;
      const orig = Error.prepareStackTrace;
      Error.prepareStackTrace = function (_, stack) {
        return stack;
      };
      const err = new Error("Test");
      Error.captureStackTrace(err, y);
      const stack = err.stack;
      Error.prepareStackTrace = orig;
      Error.stackTraceLimit = oldLimit;
      return stack.map((site) =>
        site.getFileName()
          ? (site.getFunctionName() || "anonymous") +
            " in " +
            site.getFileName() +
            " @" +
            site.getLineNumber() +
            ":" +
            site.getColumnNumber()
          : ""
      );
    }

    MyAdapter.W("Promise failed @ %o error: %o", get().join("; "), x);
    return x;
  }

  static nop(obj) {
    return obj;
  }

  static split(x, s) {
    return this.trim((typeof x === "string" ? x : `${x}`).split(s));
  }

  static trim(x) {
    return Array.isArray(x) ? x.map(this.trim) : typeof x === "string" ? x.trim() : `${x}`.trim();
  }

  /* 	static A(arg) {
			if (!arg)
				this.E(this.f.apply(null, Array.prototype.slice.call(arguments, 1)));
			assert.apply(null, arguments);
		}
	 */
  static D(...str) {
    return slog("debug", this.f(...str));
  }

  static S(...str) {
    return slog("silly", this.f(...str));
  }

  static F(...args) {
    return util.format(...args);
  }
  static f(...args) {
    return this.F(...args).replace(/\n\s+/g, " ");
  }
  static I(...args) {
    return slog("info", this.f(...args));
  }

  static W(...args) {
    return slog("warn", this.f(...args));
  }
  static E(...args) {
    return slog("error", this.f(...args));
  }

  static toNumber(v) {
    return isNaN(Number(v)) ? 0 : Number(v);
  }

  static toInteger(v) {
    return parseInt(this.toNumber(v));
  }

  static set addq(promise) {
    stq.p = promise;
    return stq;
  }

  static get name() {
    return aname;
  }
  static get states() {
    return states;
  }
  static get adapter() {
    return adapter;
  }
  static get aObjects() {
    return adapter.objects;
  }
  static get objects() {
    return objects;
  }

  static get ains() {
    return adapter.namespace;
  }
  static get ain() {
    return this.ains + ".";
  }
  static get C() {
    return adapter.config;
  }

  static fullName(id) {
    return this.ain + id;
  }

  static parseLogic(obj) {
    return this.includes(
      ["0", "off", "aus", "false", "inactive", ""],
      obj.toString().trim().toLowerCase()
    )
      ? false
      : this.includes(
          ["1", "-1", "on", "ein", "true", "active"],
          obj.toString().trim().toLowerCase()
        );
  }
  static clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  static P(pv, res, rej) {
    if (pv instanceof Promise) return pv;
    if (pv && typeof pv.then === "function") return new Promise((rs, rj) => pv.then(rs, rj));
    if (pv) return this.resolve(res || pv);
    return this.reject(rej || pv);
  }

  static nothing() {
    return null;
  }

  static nextTick(x) {
    return new Promise((res) => process.nextTick(() => res(x)));
  }

  static resolve(x) {
    return this.nextTick(x);
  }

  static reject(x) {
    return this.nextTick().then((_) => x);
  }

  static wait(time, arg) {
    time = parseInt(this.toNumber(time));

    if (time <= 0) return this.nextTick(arg);
    return new Promise((resolve) => setTimeout(() => resolve(arg), time));
  }

  static async retry(nretry, fn, wait, ...args) {
    //change args!!!
    // assert(typeof fn === 'function', 'retry (,fn,) error: fn is not a function!');
    nretry = this.toInteger(nretry);
    nretry = nretry || 2;
    while (nretry > 0)
      try {
        const res = await fn(...args);
        return res;
      } catch (err) {
        nretry--;
        if (!nretry) return Promise.reject(err);
        await this.wait(wait || 0);
      }
    return null;
  }

  static async pSequence(arr, promise, wait) {
    wait = wait || 0;
    if (!Array.isArray(arr) && typeof arr === "object")
      arr = Object.entries(arr).filter((o) => arr.hasOwnProperty(o[0]));
    const res = [];
    for (const i of arr) {
      if (res.length) await this.wait(wait);
      try {
        const r = await promise(i);
        res.push(r);
      } catch (e) {
        res.push(e);
      }
    }
    return res;
  }

  static pTimeout(pr, time, callback) {
    const t = this.toNumber(time);
    let st = null;
    return new Promise((resolve, reject) => {
      const rs = (res) => {
          if (st) clearTimeout(st);
          st = null;
          return resolve(res);
        },
        rj = (err) => {
          if (st) clearTimeout(st);
          st = null;
          return reject(err);
        };
      st = setTimeout(() => {
        st = null;
        reject(`timer ${t} run out`);
      }, t);
      if (callback) callback(rs, rj);
      this.P(pr).then(rs, rj);
    });
  }

  static async Ptime(promise, arg) {
    const start = Date.now();
    if (typeof promise === "function") promise = promise(arg);
    await Promise.resolve(promise).catch(() => null);

    const end = Date.now();
    return end - start;
  }

  static O(obj, level) {
    return util
      .inspect(obj, {
        depth: level || 2,
        colors: false,
      })
      .replace(/\n\s*/g, "");
  }

  static removeEmpty(obj) {
    if (this.T(obj) !== "object") return obj;
    const a = this.clone(obj);
    for (const n of Object.getOwnPropertyNames(a))
      if (!a[n] && typeof a[n] !== "boolean") delete a[n];
    return a;
  }

  static String(obj, level = 2) {
    return typeof obj === "string" ? obj : this.O(obj, level);
  }

  static N(fun, ...args) {
    return setImmediate(fun, ...args);
  } // move fun to next schedule keeping arguments

  static T(i, j) {
    let t = typeof i;
    if (t === "object") {
      if (Array.isArray(i)) t = "array";
      else if (i instanceof RegExp) t = "regexp";
      else if (i === null) t = "null";
    } else if (t === "number" && isNaN(i)) t = "NaN";
    return j === undefined ? t : this.T(j) === t;
  }
  static locDate(date) {
    return date instanceof Date
      ? new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      : typeof date === "string"
      ? new Date(Date.parse(date) - new Date().getTimezoneOffset() * 60000)
      : !isNaN(+date)
      ? new Date(+date - new Date().getTimezoneOffset() * 60000)
      : new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  }
  static dateTime(date) {
    return this.locDate(date).toISOString().slice(0, -5).replace("T", "@");
  }
  static obToArray(obj) {
    return Object.keys(obj)
      .filter((x) => obj.hasOwnProperty(x))
      .map((i) => obj[i]);
  }
  static includes(obj, value) {
    return this.T(obj) === "object"
      ? obj[value] !== undefined
      : Array.isArray(obj)
      ? obj.find((x) => x === value) !== undefined
      : obj === value;
  }

  static ownKeys(obj) {
    return this.T(obj) === "object" ? Object.getOwnPropertyNames(obj) : [];
    //        return this.T(obj) === 'object' ? Object.keys(obj).filter(k => obj.hasOwnProperty(k)) : [];
  }

  static ownKeysSorted(obj) {
    return this.ownKeys(obj).sort(function (a, b) {
      a = a.toLowerCase();
      b = b.toLowerCase();
      if (a > b) return 1;
      if (a < b) return -1;
      return 0;
    });
  }

  static async stop(dostop = 0, stopcall = false) {
    if (stopping) return;
    schedulers.forEach((sch) => sch.stop());

    try {
      await plugins.call({
        name: "adapter$stop",
        args: {
          dostop,
          stopcall,
          adapter,
        },
        handler: async ({ dostop }, handler) => {
          MyAdapter.I(`adapter$stop called with ${dostop}/${stopcall}!`);
          await MyAdapter.plugins.call({
            name: "plugins$stop",
            args: { plugins: MyAdapter.$plugins, adapter },
            handler: async ({ plugins }, handler) => {
              MyAdapter.D("plugins$stop executed for %o", plugins);
              return handler;
            },
          });
          return null;
        },
      });
    } finally {
      stopping = true;
    }
    if (stopcall) {
      const x = dostop < 0 ? 0 : dostop || 0;
      MyAdapter.D(
        "Adapter will exit now with code %s and method %s!",
        x,
        adapter && adapter.terminate ? "adapter.terminate" : "process.exit"
      );
      if (adapter && adapter.terminate) adapter.terminate(x);
      else process.exit(x);
    }
  }

  static seriesOf(obj, promfn, delay) {
    // fun gets(item) and returns a promise
    assert(
      typeof promfn === "function",
      "series(obj,promfn,delay) error: promfn is not a function!"
    );
    delay = parseInt(delay) || 0;
    let p = Promise.resolve();
    const nv = [],
      f =
        delay > 0
          ? (k) => (p = p.then(() => promfn(k).then((res) => this.wait(delay, nv.push(res)))))
          : (k) => (p = p.then(() => promfn(k)));
    for (const item of obj) f(item);
    return p.then(() => nv);
  }

  static seriesInOI(obj, promfn, delay) {
    // fun gets(item) and returns a promise
    assert(
      typeof promfn === "function",
      "series(obj,promfn,delay) error: promfn is not a function!"
    );
    delay = parseInt(delay) || 0;
    let p = Promise.resolve();
    const nv = [],
      f =
        delay > 0
          ? (k) => (p = p.then(() => promfn(k).then((res) => this.wait(delay, nv.push(res)))))
          : (k) => (p = p.then(() => promfn(k)));
    for (const item in obj) f(obj[item]);
    return p.then(() => nv);
  }

  static seriesIn(obj, promfn, delay) {
    // fun gets(item,object) and returns a promise
    assert(
      typeof promfn === "function",
      "series(obj,promfn,delay) error: promfn is not a function!"
    );
    delay = parseInt(delay) || 0;
    let p = Promise.resolve();
    const nv = [],
      f =
        delay > 0
          ? (k) => (p = p.then(() => promfn(k).then((res) => this.wait(delay, nv.push(res)))))
          : (k) => (p = p.then(() => promfn(k)));
    for (const item in obj) f(item, obj);
    return p.then(() => nv);
  }

  static c2p(f, b) {
    const p = util.promisify(f);
    return b ? p.bind(b) : p;
  }

  static async repeat(nretry, fn, wait, ...args) {
    nretry = nretry <= 0 ? 2 : nretry || 2;
    while (nretry--) {
      await fn(...args);
      await this.wait(parseInt(wait) || 10);
    }
    return true;
  }

  static getOptions(src, cmd, options) {
    if (typeof src === "string") src = src.trim();
    if (typeof cmd === "object" && !options) {
      const { srcCommand, ...other } = cmd;
      options = other;
      if (srcCommand) cmd = srcCommand;
    }
    if (!options || typeof options !== "object") options = {};
    if (typeof cmd === "string") {
      options[cmd] = src;
      src = options;
    }
    //     console.log("getOptions src:%o cmd:%o options:%o", src, cmd, options);
    //     debugger;
    if (src && typeof src === "object") return Object.assign({}, options, src);
    if (src && typeof src === "string") {
      if (src.startsWith("{") && src.endsWith("}")) src = "return " + src;
      if (str.startsWith("return ")) {
        const fun = MyAdapter.makeFunction(str, "A,options");
        if (typeof fun === "function") return fun(A, options);
      }
      return str;
    }
    MyAdapter.W("Invalid getOptions (%o, %o, %o)", src, cmd, options);
    return src;
  }

  static exec(command) {
    //		assert(typeof command === "string", "exec (fn) error: fn is not a string!");
    if (typeof command === "string") {
      const str = command.trim();
      const isTest = str.startsWith("!");
      command = {
        isTest,
        cmd: isTest ? str.slice(1) : str,
      };
    } else if (typeof command !== "object")
      return Promise.reject(A.W("Invalid exec argument %o!", command));
    return new Promise((resolve, reject) => {
      const { isTest, cmd } = command;
      try {
        cp.exec(cmd, (error, stdout, stderr) => {
          if (isTest && error) {
            error["stderr"] = stderr;
            error["stdout"] = stdout;
            return reject(error);
          }
          resolve(stdout);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  static async get(url, retry) {
    // get a web page either with http or https and return a promise for the data, could be done also with request but request is now an external package and http/https are part of nodejs.
    const options = {};
    if (typeof retry === "object") {
      Object.assign(options, retry);
      retry = options.retry || 1;
    }
    retry = this.toInteger(retry);
    let res;
    while (retry >= 0)
      try {
        res = await axios(url, options);
        return res && res.data;
      } catch (e) {
        if (retry <= 0) return Promise.reject(e);
      } finally {
        --retry;
      }
    return null;
  }

  static equal(a, b) {
    if (a == b) return true;
    const ta = this.T(a),
      tb = this.T(b);
    if (ta === tb) {
      if (ta === "array" || ta === "function" || ta === "object")
        return JSON.stringify(a) === JSON.stringify(b);
    } else if (
      ta === "string" &&
      (tb === "array" || tb === "function" || tb === "object") &&
      a === this.O(b)
    )
      return true;
    return false;
  }

  static get getMyStates() {
    return states;
  }

  static getClass(obj) {
    if (typeof obj === "undefined") return "undefined";
    if (obj === null) return "null";
    const ret = Object.prototype.toString.call(obj).match(/^\[object\s(.*)\]$/)[1];
    //            this.I(this.F('get class of ',obj, ' = ', ret));
    return ret;
  }

  static async myGetState(id) {
    if (states[id]) return states[id];
    if (!id.startsWith(this.ain) && states[this.ain + id]) return states[this.ain + id];
    let nid = sstate[id];
    if (nid && states[nid]) return states[nid];
    if (!nid) nid = id;
    const s = await adapter.getForeignStateAsync(nid);
    if (s) states[nid] = s;
    return s;
  }

  static makeFunction(fundef, args = "", that = null) {
    if (typeof fundef === "function" && that) return fundef.bind(that);
    else if (typeof fundef === "string") {
      fundef = fundef.trim();
      args = args.trim();
      const argList = [fundef];
      if (args) argList.unshift(args);
      let fun;
      try {
        //        MyAdapter.D("Create function %o", argList, fundef, args);
        fun = new Function(...argList);
        return that ? fun.bind(that) : fun;
      } catch (e) {
        MyAdapter.W("Function compilation error in %s(%s): %o", fundef, args, e);
        return () => undefined;
      }
    } else {
      this.W("Invalid function definition with `%o`", fundef);
    }
  }

  static async changeState(id, value, options) {
    //        this.If('ChangeState got called on %s with ack:%s = %o', id,ack,value)
    options = options || {};
    const { always = false, ts = Date.now(), ack = true } = options;
    if (value === undefined) {
      this.W("You tried to set state '%s' to 'undefined' with %j!", id, options);
      return null;
    }
    const stn = {
      val: value,
      ack: !!ack,
      ts,
    };
    let st = states[id]
      ? states[id]
      : (states[id] = await adapter.getStateAsync(id).catch(() => undefined));
    if (st && !always && this.equal(st.val, value) && st.ack === ack) return st;
    await adapter
      .setStateAsync(id, stn)
      .catch((e) => (this.W("Error %j is setState for %s with %j", e, id, stn), stn));
    if (states[id]) {
      st = states[id];
      st.val = value;
      st.ack = ack;
    } else states[id] = st = await adapter.getStateAsync(id);
    this.D("ChangeState ack:%s of %s = %s", !!ack, id, value);
    return st;
  }

  static async updateState(id, value, ack = true, always = false, define = false) {
    let options = {};
    if (typeof id === "object" && typeof id.id === "string") {
      options = id;
      id = id.id;
      if (id.value !== undefined && value === undefined) value = id.value;
    }
    const poptions = { always, define };
    Object.assign(poptions, typeof ack == "object" ? ack : { ack });
    options = Object.assign({}, poptions, options);
    const idl = id.startsWith(this.ain) ? id : this.ain + id;

    console.log("updateState(%s(%s), %o, options:%o)", id, idl, value, options);
    if (!options.define && createdStates[idl]) return this.changeState(id, value, options);
    const st = {
      common: {
        name: id, // You can add here some description
        read: true,
        write: false,
        role: value instanceof Date ? "value.time" : "value",
        type: typeof value,
      },
      type: "state",
      _id: idl,
    };
    if (options.common) Object.assign(st.common, options.common);
//    if (st.common.type === "object") st.common.type = "mixed";
    if (options.native) st.native = Object.assign({}, options.native);
    if (st.common.write) st.common.role = st.common.role.replace(/^value/, "level");
    addSState(id, idl);
    createdStates[idl] = id;
    await adapter
      .extendObjectAsync(idl, st, null)
      .catch((e) => (this.W("error %j extend object %s", e, idl), null));
    this.D("created State %s", idl); // REM
    if (!objects[idl]) objects[idl] = st;
    return this.changeState(idl, value, options);
  }
  static async makeState(ido, value, ack, always, define) {
    //        ack = ack === undefined || !!ack;
    //                this.D(`Make State %s and set value to:%o ack:%s`,typeof ido === 'string' ? ido : ido.id,value,ack); ///TC
    const options =
      typeof ack == "object"
        ? ack
        : {
            ack,
          };
    if (always) options.always = always;
    if (define) options.define = define;

    let id = ido;
    if (typeof id === "string")
      ido = id.endsWith("Percent")
        ? {
            unit: "%",
          }
        : {};
    else if (typeof id.id === "string") {
      id = id.id;
    } else throw new Error(this.W(`Invalid makeState id: ${this.O(id)}`));

    const idl = id.startsWith(this.ain) ? id : this.ain + id;

    if ((!options.define || typeof ido !== "object") && createdStates[idl])
      return this.changeState(id, value, options);
    //        this.D(`Make State ack:%s %s = %s`, ack, id, value); ///TC
    const st = {
      common: {
        name: id, // You can add here some description
        read: true,
        write: false,
        state: "state",
        role: "value",
        type: this.T(value),
      },
      type: "state",
      _id: idl,
    };
    if (options.common) Object.assign(st.common, options.common);
    if (st.common.type === "object") st.common.type = "mixed";
    for (const i in ido) {
      if (i === "native") {
        st.native = st.native || {};
        for (const j in ido[i]) st.native[j] = ido[i][j];
      } else if (i !== "id" && i !== "val") st.common[i] = ido[i];
    }
    if (st.common.write) st.common.role = st.common.role.replace(/^value/, "level");
    //    this.I(`will create state:${id} with ${this.O(st)}`);
    addSState(id, idl);
    createdStates[idl] = id;
    await adapter
      .extendObjectAsync(idl, st, null)
      .catch((e) => (this.W("error %j extend object %s", e, idl), null));
    this.D("created State %s", idl); // REM
    if (st.common.state === "state" && !objects[this.ain + id]) {
      objects[idl] = st;
    }
    return this.changeState(idl, value, options);
  }

  static async cleanup(name) {
    //        .then(() => MyAdapter.I(MyAdapter.F(MyAdapter.sstate)))
    //        .then(() => MyAdapter.I(MyAdapter.F(MyAdapter.ownKeysSorted(MyAdapter.states))))
    const res = await this.getObjects(name);
    for (const item of res) {
      // clean all states which are not part of the list
      //            this.I(`Check ${this.O(item)}`);
      const id = item.id;
      if (!id || !id.startsWith(this.ain) || createdStates[id])
        // eslint-disable-next-line no-continue
        continue;
      //            this.I(`check state ${item.id} and ${id}: ${states[item.id]} , ${states[id]}`);
      if (states[id]) {
        this.D("Cleanup delete state %s", id);
        await adapter.deleteStateAsync(id).catch(MyAdapter.nop);
      }
      //				.catch(err => this.D(`Del State err: ${this.O(err)}`));
      let found = false;
      for (const cs of Object.keys(createdStates))
        if (cs.startsWith(id + ".")) {
          found = true;
          break;
        }
      if (!found) {
        this.D("Cleanup delete object %s", id);
        await adapter.delObjectAsync(id).catch(MyAdapter.nop);
      }
      //				.catch(err => this.D(`Del Object err: ${this.O(err)}`)); ///TC
      await this.wait(10);
    }
  }

  static isLinuxApp(name) {
    if (os.platform() !== "linux") return false;
    return this.exec("!which " + name)
      .then((x) => x.length >= name.length)
      .catch(() => false);
  }
}
/* 
process.on('SIGTERM', function onSigterm () {
  console.info('Got SIGTERM. Graceful shutdown start', new Date().toISOString())
  // start graceul shutdown here
  MyAdapter.stop(0);
});
 */
MyAdapter.CacheP = CacheP;
MyAdapter.HrTime = HrTime;
module.exports = MyAdapter;
