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
      label: "none",
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
    A.setLogLevel("debug");
    A.D(`adapter$start for ${adapter.namespace} version ${adapter.version}`);
    await A.plugins.call({
      name: "plugins$init",
      args: { plugins: A.$plugins, adapter },
      handler: async ({ plugins, adapter }, handler) => {
        await A.AI.setStateAsync("info.plugins.$methods", {
          val: plugins.methods.map(({ label, value, hasSchedule, read, write, iconv, desc }) => {
            plugins.methodReads[value] = read;
            plugins.methodWrites[value] = write;
            return { label, value, hasSchedule, write: !!write, iconv, desc };
          }),
          ack: true,
        });
        await A.AI.setStateAsync("info.plugins.$converters", {
          val: plugins.converters.map(({ label, value, options, convert, desc }) => {
            plugins.converterConverts[value] = convert;
            return { label, value, options, desc };
          }),
          ack: true,
        });
        await A.updateState(
          "info.plugins.$store",
          plugins.store.map(({ label, value, hasOptions, store, desc }) => {
            plugins.storeStore[value] = store;
            return { label, value, hasOptions, desc };
          }),
          {common: {desc: "plugin$store functions list"}}
        );
        await A.AI.setStateAsync("info.plugins.$inputtypes", {
          val: plugins.inputtypes.map(({ label, value, convert, desc }) => {
            plugins.inputConverts[value] = convert;
            return { label, value, desc };
          }),
          ack: true,
        });
        await A.AI.setStateAsync("info.plugins.$functions", {
          val: Object.keys(plugins.functions).join(", "),
          ack: true,
        });
        A.S("finished plugins$init created $plugins: %o", plugins);
        return handler;
      },
    });
    return handler;
  },

  adapter$run: async ({ adapter }, handler) => {
    A.D(`adapter$run for ${adapter.namespace}`);
    await A.wait(1000);
    if (adapter.config.pathtable)
      for (const i of adapter.config.pathtable) {
        let { name, path, method, convert, enabled, schedule = "*:1" } = i;
        //        if (!name) name = path;
        if (!enabled) continue;
        const nitem = Object.assign({}, { config: i }, i);
        runItems.push(nitem);
        convert = convert || "$";
        const me = A.$plugins.methods.find((i) => i.value == method);
        nitem.hasSchedule = me && me.hasSchedule;
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
      }
    //    await A.cleanup("*");
    await A.plugins.call({
      name: "plugins$run",
      args: { plugins: A.$plugins, adapter },
      handler: async ({ plugins, adapter }, handler) => {
        A.S("finished plugins$run created $plugins: %s", A.O(plugins));
        for (let sh in schedList) {
          const scheduler = schedule.scheduleJob(sh, () =>
            schedList[sh].map(async (x) => {
              const res = x.read ? await x.read(x.path, x) : null;
              //              A.D("Schedule now %s with path '%s': %o", x.name, x.path, res);
              runItem(x, res);
            })
          );
          schedList[sh].scheduler = scheduler;
          A.D(
            `Will poll every '${sh}': ${schedList[sh].map((x) => x.name)}. %s`,
            scheduler.nextInvocation()
          );
        }

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

const runItems = [];
const schedList = {};

async function runItem(item, arg) {
  const $pi = A.$plugins;
  A.D("runItem %s: %s with data %s", item.name, item, typeof arg);
  try {
    let fun = $pi.inputConverts[item.iconv];
    if (item.iconv && typeof fun === "function") arg = await fun(arg, $pi.functions, item);
    fun = $pi.converterConverts[item.converter];
    if (typeof fun === "function") arg = await fun(arg, $pi.functions, item);
    A.D("Finished item %s with %o", item.name, arg);
    fun = $pi.storeStore[item.store];
    if (typeof fun === "function") arg = await fun(arg, $pi.functions, item);
    return arg;
  } catch (e) {
    const ret = A.W("Error when processing %s with Data %o: %o", item.name, arg, e);
    return Promise.reject(ret);
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
