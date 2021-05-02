/* eslint-disable no-unused-vars */
/* eslint-disable prefer-const */
// @ts-nocheck
"use strict";

const A = require("./fjadapter.js"),
  schedule = require("node-schedule");

// Load your modules here, e.g.:
// const fs = require("fs");

A.addHooks({
  adapter$init: async ({ adapter }, handler) => {
    A.D(`adapter$init for ${adapter.name} started.`);
    const installPlugins = require("./plugins/index.js");
    installPlugins();
    const noConv = {
      label: "as is/auto",
      value: "none",
      convert: async (val, functions, options) => val,
    };
    Object.assign(A.$plugins, {
      config: {
        port: (Number(adapter.config.port) !== NaN && Number(adapter.config.port)) || 3000,
      },
      functions: {},
      methods: [],
      store: [],
      storeStore: {},
      methodReads: {},
      methodWrites: {},
      converters: [noConv],
      converterConverts: {},
      inputtypes: [noConv],
      inputConverts: {},
    });
    await A.setConnected(false);
    return handler;
  },

  adapter$start: async ({ adapter }, handler) => {
    A.setLogLevel("debug"); // test only
    A.D(`adapter$start for ${adapter.namespace} version ${adapter.version}`);
    await A.plugins.call({
      name: "plugins$init",
      args: { plugins: A.$plugins, options: A.$options, adapter },
      handler: async ({ plugins, options, adapter }, handler) => {
        options.methods = plugins.methods.map(
          ({ label, value, hasSchedule, read, write, iconv, desc }) => {
            plugins.methodReads[value] = read;
            plugins.methodWrites[value] = write;
            return { label, value, hasSchedule, write: !!write, iconv, desc };
          }
        );
        options.converters = plugins.converters.map(({ label, value, options, convert, desc }) => {
          plugins.converterConverts[value] = convert;
          return { label, value, options, desc };
        });
        options.store = plugins.store.map(({ label, value, hasOptions, store, desc }) => {
          plugins.storeStore[value] = store;
          return { label, value, hasOptions, desc };
        });
        options.inputtypes = plugins.inputtypes.map(({ label, value, convert, desc }) => {
          plugins.inputConverts[value] = convert;
          return { label, value, desc };
        });
        options.functions = Object.keys(plugins.functions).join(", ");

        A.S("finished plugins$init created $plugins: %o", plugins);
        return handler;
      },
    });
    await A.updateState("info.$options", A.$options, {
      ack: true,
      common: { desc: "plugin options collected", type: "object" },
    });
    if (adapter.config.maxCacheTime !== undefined)
      A.I(
        "Set cache maxAge to %ds",
        cache.setMaxAge(Number(adapter.config.maxCacheTime) * 1000) / 1000
      );
    return handler;
  },

  adapter$run: async ({ adapter }, handler) => {
    A.D(`adapter$run for ${adapter.namespace}`);
    await A.wait(1000);
    if (Array.isArray(adapter.config.pathtable))
      await A.mapSeries(adapter.config.pathtable, async (i) => {
        //      for (const i of adapter.config.pathtable) {
        let { name, path, method, convert, enabled, schedule = "*:1" } = i;
        //        if (!name) name = path;
        if (!enabled) return false;
        const nitem = Object.assign({}, { config: i }, i);
        runItems.push(nitem);
        convert = convert || "$";
        const me = A.$plugins.methods.find((i) => i.value == method);
        nitem.hasSchedule = me && me.hasSchedule;
        nitem.getItem = method + i.path;
        if (nitem.hasSchedule) {
          const reIsTime = /^([\d\-\*\,\/]+)\s*:\s*([\d\-\*\,\/]+)\s*(?::\s*([\d\-\*\,\/]+))?$/,
            reIsSchedule = /^[\d\-\/\*\,]+(\s+[\d\/\-\*,]+){4,5}$/;

          let sch = schedule.trim(),
            scht = sch.match(reIsTime);
          if (scht) {
            if (scht[3] === undefined) scht[3] = (Object.keys(schedList).length % 58) + 1;
            sch = `${scht[3]} ${scht[2]} ${scht[1]} * * *`;
          } else if (sch.match(/^\d+[smh]$/))
            switch (sch.slice(-1)) {
              case "s":
                sch = `*/${sch.slice(0, -1)} * * * * *`;
                break;
              case "m":
                sch = `*/${sch.slice(0, -1)} * * * *`;
                break;
              case "h":
                sch = `0 */${sch.slice(0, -1)} * * *`;
                break;
            }
          if (sch && sch.match(reIsSchedule)) {
            nitem.hasSchedule = sch;
            nitem.read = A.$plugins.methodReads[method];
            if (schedList[sch]) schedList[sch].push(nitem);
            else {
              schedList[sch] = [nitem];
              schedList[sch].scheduler = null;
              //              scheds[sch] = null;
            }
            A.D("Scheduled %o", nitem);
          } else A.W(`Invalid schedule ${sch} from '${schedule}' in item ${name}`);
        }
        if (me && me.init) {
          await me.init({
            path,
            callback: async (res) => {
              A.I("received to process from %s: %o", path, res);
              await runItem(nitem, res);
            },
          });
          A.D(`Installed ${name} path: '${path}' with ${method}-method`);
        }
      });
    //    await A.cleanup("*");
    await A.plugins.call({
      name: "plugins$run",
      args: { plugins: A.$plugins, adapter },
      handler: async ({ plugins, adapter }, handler) => {
        A.S("finished plugins$run created $plugins: %s", A.O(plugins));
        for (let sh in schedList) {
          const scheduler = schedule.scheduleJob(sh, () =>
            A.map(schedList[sh], (x) => startItem(x))
          );
          schedList[sh].scheduler = scheduler;
          //          await A.map(schedList[sh], startItem);
          A.D(`Will poll every '${sh}': ${schedList[sh].map((x) => x.name)}.`);
        }
        for (let sh in schedList) await A.mapSeries(schedList[sh], startItem, 5);

        return handler;
      },
    });
    await A.setConnected(true);
    return handler;
  },

  adapter$stop: async ({ adapter, dostop = 0, stopcall = false }, handler) => {
    A.S("adapter$stop plugin for %s %s/%s", adapter.namespace, dostop, stopcall);
    for (const [key, sh] of Object.entries(schedList)) {
      //      sh = schedList[sh];
      A.D("Cancel schedule %s %s", key, sh.map((x) => x.name).join(", "));
      sh.scheduler.cancel();
    }
    await A.setConnected(false);
    return handler;
  },

  /*
  adapter$message: async ({ message }, handler) => {
      console.log("adapter$message received: " + A.O(message));
      return null;
    },
 */
  adapter$stateChange: async ({ adapter, id, state }, handler) => {
    A.S("adapter$stateChange for %s %s", id, A.O(state));
    return handler;
  },

  adapter$objectChange: async ({ adapter, id, obj }, handler) => {
    A.S("adapter$objectChange for %s %s", id, A.O(obj));
    return handler;
  },
});

A.init(module, "acceptdata");
A.setMaxDelay(60 * 20); // if last data store with same value was more than 20 min ago then store another old one before

const runItems = [];
const schedList = {};
const cache = new A.CacheP({
  maxage: 1000 * 60,
  delay: 1,
  fun: async (x) => {
    let res = null;
    //    A.D("Will call now read on %s", x);
    try {
      if (typeof x.read === "function") res = await x.read(x.path, x);
      //      A.D("CacheP Will return %s", res);
    } catch (e) {
      //      A.W("Cache funtion error %o on %o", e, x);
    }
    return res;
  },
});

async function startItem(x) {
  //              A.D("Schedule now %s with path '%s': %o", x.name, x.path, res);
  return await runItem(x, await cache.cacheItem(x));
}

async function runItem(item, arg) {
  const $pi = A.$plugins;
  A.S("runItem %s: %s with data %s", item.name, item, typeof arg);
  try {
    let fun = $pi.inputConverts[item.iconv];
    if (item.iconv && typeof fun === "function") arg = await fun(arg, $pi.functions, item);
    fun = $pi.converterConverts[item.converter];
    if (typeof fun === "function") arg = await fun(arg, $pi.functions, item);
    fun = $pi.storeStore[item.store];
    if (typeof fun === "function") arg = await fun(arg, $pi.functions, item);
    if (arg !== undefined) A.D("Finished item %s with %o", item.name, arg);
    return arg;
  } catch (e) {
    Promise.reject(A.W("Error when processing %s with Data %o: %o", item.name, arg, e));
  }
}

function convertObj(obj, pattern) {
  function myEval($) {
    function toNum(v, n) {
      const vn = Number(v);
      if (typeof n !== "number" || n < 0) return vn;
      return Number(vn.toFixed(n));
    }
    function FtoC(v, n = 1) {
      const vn = Number(v);
      return toNum((5.0 * (vn - 32)) / 9, n);
    }
    function ItoMM(v, n = 1) {
      const vn = Number(v);
      return toNum(25.4 * vn, n);
    }
    function CtoF(v, n = 1) {
      const vn = Number(v);
      return toNum((vn * 9.0 + 160) / 5, n);
    }

    let res = null;
    try {
      res = eval("(" + pattern + ")");
    } catch (e) {
      return {
        evalError: inspect(e),
      };
    }
    return res;
  }
  obj = obj || {};
  if (typeof obj === "string") obj = JSON.parse(obj);
  if (!pattern) return obj;
  return myEval(obj);
}

const lastData = {};
async function storeData(item, path) {
  const that = this;

  async function storeItem(item, name) {
    const types = {
      Hum: {
        role: "value.humidity",
        type: "number",
        unit: "%",
      },
      Kmh: {
        role: "value.speed",
        type: "number",
        unit: "km/h",
      },
      Deg: {
        role: "walue.direction",
        type: "number",
        unit: "°",
      },
      Date: {
        role: "date.start",
        type: "string",
      },
      Hpa: {
        role: "value.pressure",
        type: "number",
        unit: "hPA",
      },
      Mm: {
        role: "value.distance",
        type: "number",
        unit: "mm",
      },
      Wm2: {
        role: "value",
        type: "number",
        unit: "W/m²",
      },
      Txt: {
        role: "text",
        type: "string",
      },
      C: {
        role: "value.temperature",
        type: "number",
        unit: "°C",
      },
      V: {
        role: "value",
        type: "number",
      },
    };
    let common = {
      role: "value",
      read: true,
      write: false,
    };
    let iname = path + (name ? "." + name : "");
    const sliced = iname.split("_");
    const typs = sliced.length > 1 ? sliced.pop() : "Txt";
    iname = sliced.join("_");
    if (types[typs]) common = Object.assign(common, types[typs]);
    else {
      common.role = "value";
      if (typs[0] == "$") {
        (common.type = "number"), (common.unit = typs.slice(1));
      } else common.type = typs;
    }

    common.name = iname;
    if (lastData[iname] === undefined) {
      that.log.debug("create '" + iname + "' with " + inspect(common));
      await that.setObjectAsync(iname, {
        type: "state",
        common,
        native: {},
      });
      lastData[iname] = null;
    }

    if (item != lastData[iname]) {
      lastData[iname] = item;
      that.log.debug("update '" + iname + "' with " + inspect(item));
      await that.setStateAsync(iname, {
        val: item,
      });
    }
    return A.wait(1);
  }

  if (typeof item !== "object") return await storeItem(item);
  for (const i of Object.keys(item)) await storeItem(item[i], i);
  return true;
}
