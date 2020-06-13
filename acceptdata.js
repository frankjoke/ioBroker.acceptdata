/* eslint-disable no-unused-vars */
/* eslint-disable prefer-const */
// @ts-nocheck
"use strict";

/*
 * Created with @iobroker/create-adapter v1.25.0
 */

const express = require("express");
//const bodyParser = require('body-parser')
const { inspect } = require("util");
const app = express();

async function wait(num, arg) {
  let tout = null;
  num = (Number(num) && num > 0 && Number(num)) || 0;
  return new Promise((res) => {
    tout = setTimeout((_) => {
      if (tout) clearTimeout(tout);
      tout = null;
      res(arg);
    }, num);
  });
}

function convertObj(obj, pattern) {
  function myEval($) {
    function toNum(v, n) {
      const vn = Number(v);
      if (typeof n !== "number" || n < 0) return vn;
      return Number(vn.toFixed(n));
    }
    // eslint-disable-next-line no-unused-vars
    function FtoC(v, n) {
      const vn = Number(v);
      return toNum((5.0 * (vn - 32)) / 9, 1);
    }
    // eslint-disable-next-line no-unused-vars
    function ItoMM(v, n) {
      const vn = Number(v);
      return toNum(25.4 * vn, 1);
    }
    // eslint-disable-next-line no-unused-vars
    function CtoF(v, n) {
      const vn = Number(v);
      return toNum((vn * 9.0 + 160) / 5, 2);
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
    return wait(1);
  }

  if (typeof item !== "object") return await storeItem(item);
  for (const i of Object.keys(item)) await storeItem(item[i], i);
}

/**
 * The adapter instance
 * @type {ioBroker.Adapter}
 */
let adapter;

/**
 * Starts the adapter instance
 * @param {Partial<utils.AdapterOptions>} [options]
 */
function startAdapter(options) {
  // The adapter-core module gives you access to the core ioBroker functions
  // you need to create an adapter
  const utils = require("@iobroker/adapter-core");

  // Create the adapter and define its methods
  return adapter = utils.adapter(Object.assign({}, options, {
    name: "acceptdata",

    // The ready callback is called when databases are connected and adapter received configuration.
    // start here!
    ready: main, // Main method defined below for readability

    // is called when adapter shuts down - callback has to be called under any circumstances!
    unload: (callback) => {
      try {
        adapter.log.info("cleaned everything up...");
        callback();
      } catch (e) {
        callback();
      }
    },

    // is called if a subscribed object changes
    objectChange: (id, obj) => {
      if (obj) {
        // The object was changed
        adapter.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
      } else {
        // The object was deleted
        adapter.log.info(`object ${id} deleted`);
      }
    },

    // is called if a subscribed state changes
    stateChange: (id, state) => {
      if (state) {
        // The state was changed
        adapter.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
      } else {
        // The state was deleted
        adapter.log.info(`state ${id} deleted`);
      }
    },

    // Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
    // requires "common.message" property to be set to true in io-package.json
    // message: (obj) => {
    // 	if (typeof obj === 'object' && obj.message) {
    // 		if (obj.command === 'send') {
    // 			// e.g. send email or pushover or whatever
    // 			adapter.log.info('send command');

    // 			// Send response in callback if required
    // 			if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
    // 		}
    // 	}
    // },
  }));
}

function main() {
  // Initialize your adapter here
  // Reset the connection indicator during startup
  this.setState("info.connection", false, true);
  //		console.log(this);
  // The adapters config (in the instance object everything under the attribute "native") is accessible via
  // this.config:
  this.log.info("config port: " + this.config.port);
  /*
  For every state in the system there has to be also an object of type state
  Here a simple template for a boolean variable named "testVariable"
  Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		
  await this.setObjectAsync("testVariable", {
  type: "state",
  common: {
    name: "testVariable",
    type: "boolean",
    role: "indicator",
    read: true,
    write: true,
  },

  native: {},
  });
  */
  // in this template all states changes inside the adapters namespace are subscribed
  this.subscribeStates("*");
  /*
  setState examples
  you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
		
  // the variable testVariable is set to true as command (ack=false)
  await this.setStateAsync("testVariable", true);

  // same thing, but the value is flagged "ack"
  // ack should be always set to true if the value is received from or acknowledged from the target system
  await this.setStateAsync("testVariable", {
  val: true,
  ack: true
  });

  // same thing, but the state is deleted after 30s (getState will return null afterwards)
  await this.setStateAsync("testVariable", {
  val: true,
  ack: true,
  expire: 30
  });
  // examples for the checkPassword/checkGroup functions
  let result = await this.checkPasswordAsync("admin", "iobroker");
  this.log.info("check user admin pw iobroker: " + result);

  result = await this.checkGroupAsync("admin", "admin");
  this.log.info("check group user admin group admin: " + result);
  */

  const port = Number(this.config.port) || 3000;

  const stData = storeData.bind(this);

  app.use(
  express.json({
    type: ["*.json", "*/json"],
  })
  );

  if (this.config.pathtable)
  this.config.pathtable.map((i) => {
    let { path, method, convert, enabled } = i;
    if (enabled) {
    convert = convert || "$";
    if (path.startsWith("/")) path = path.slice(1);
    this.log.info(
      `Installed path '${path}' with ${method}-method and convert: ${convert}`
    );
    switch (method) {
      case "GET": // get
      default:
      app.get("/" + path, (request, response) => {
        this.log.debug(
        "GET data received: " +
          inspect(request.query, {
          depth: 2,
          color: true,
          })
        );
        const res = convertObj(request.query, convert);
        this.log.debug(
        "Converted Data: " +
          inspect(res, {
          depth: 2,
          color: true,
          })
        );
        response.send("success: " + JSON.stringify(res, null));
        wait(1).then((_) => stData(res, path));
        //      response.send("Hello from Express!");
      });
      break;
      case "POST": // post
      app.post("/" + path, (request, response) => {
        this.log.debug(
        "POST data received: " +
          inspect(request.body, {
          depth: 2,
          color: true,
          })
        );
        const res = convertObj(request.body, convert);
        this.log.debug(
        "Converted Data: " +
          inspect(res, {
          depth: 2,
          color: true,
          })
        );
        response.send("success");
        wait(1).then((_) => stData(res, path));
        //      response.send("Hello from Express!");
      });
      break;
    }
    }
  });

  app.get("/*", (request, response) => {
  this.log.debug(
    "get unknown data received for '" +
    request._parsedUrl.pathname +
    "' with " +
    inspect(request.query, {
      depth: 2,
      color: true,
    })
  );
  response.send("success");
  //      response.send("Hello from Express!");
  });

  app.listen(port, (err) => {
  if (err) {
    return this.log.error("something bad happened" + inspect(err));
  }
  this.setState("info.connection", {
    val: true,
    ack: true,
  });
  this.log.info(`server is listening on ${port}`);
  });
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
  // Export startAdapter in compact mode
  module.exports = startAdapter;
} else {
  // otherwise start the instance directly
  startAdapter();
}