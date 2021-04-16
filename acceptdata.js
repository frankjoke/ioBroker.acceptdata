/* eslint-disable no-unused-vars */
/* eslint-disable prefer-const */
// @ts-nocheck
"use strict";

/*
 * Created with @iobroker/create-adapter v1.23.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
//const utils = require("@iobroker/adapter-core");
const A = require("./fjadapter.js");

// Load your modules here, e.g.:
// const fs = require("fs");

A.addHooks({
  adapter$init: async ({ adapter }, handler) => {
    A.D(`adapter$init for ${adapter.name} started.`);
    const installPlugins = require("./plugins/index.js");
    installPlugins();
    return handler;
  },

  adapter$start: async ({ adapter }, handler) => {
    A.setLogLevel("debug");
    A.D(`adapter$start for ${adapter.namespace} version ${adapter.version}`);
    await A.setConnected(false);
    A.$plugins.config = { port: Number(adapter.config.port) || 3000 };
    A.$plugins.methods = [];
    await A.plugins.call({
      name: "plugins$init",
      args: { plugins: A.$plugins, adapter },
      handler: async ({ plugins, adapter }, handler) => {
        A.Df("finished plugins$init created $plugins: %s", A.O(plugins));
        await A.AI.setStateAsync(
          "info.plugins.$methods",
          { val: plugins.methods.map(({label,value}) => ({label, value})), ack: true }
        );
        return handler;
      },
    });
    return handler;
  },

  adapter$run: async ({ adapter }, handler) => {
    A.D(`adapter$run for ${adapter.namespace}`);
    await A.wait(1000);
    if (adapter.config.pathtable)
      for (let { name, path, method, convert, enabled } of adapter.config.pathtable) {
        if (!name) name = path;
        if (!enabled) continue;
        convert = convert || "$";
        if (typeof path == "string" && !path.startsWith("/")) path = "/" + path;
        const me = A.$plugins.methods.find((i) => i.value == method);
        if (me && me.init) {
          await me.init({
            path,
            callback: async (res) => {
              A.If("received to process from %s: %s", path, A.O(res));
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
        A.Sf("finished plugins$run created $plugins: %s", A.O(plugins));
        return handler;
      },
    });
    await A.setConnected(true);
    return handler;
  },

  adapter$stop: async ({ adapter, dostop = 0, stopcall = false }, handler) => {
    A.Sf("adapter$stop plugin for %s %s/%s", adapter.namespace, dostop, stopcall);
    return handler;
  },
  /*
  adapter$message: async ({ message }, handler) => {
      console.log("adapter$message received: " + A.O(message));
      return null;
    },
 */
  adapter$stateChange: async ({ adapter, id, state }, handler) => {
    A.Sf("adapter$stateChange for %s %s", id, A.O(state));
    return handler;
  },

  adapter$objectChange: async ({ adapter, id, obj }, handler) => {
    A.Sf("adapter$objectChange for %s %s", id, A.O(obj));
    return handler;
  },
});

A.init(module, "acceptdata");

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
