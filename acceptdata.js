/* eslint-disable no-unused-vars */
/* eslint-disable prefer-const */
// @ts-nocheck
"use strict";

/*
 * Created with @iobroker/create-adapter v1.23.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");
const A = require("./fjadapter.js");

// Load your modules here, e.g.:
// const fs = require("fs");

A.addHooks({
  adapter$init: async ({ adapter }, handler) => {
    A.D(`adapter$init for ${adapter.name} started.`);
    const plugin$express = require("./expressPlugin.js");
    A.plugins.register(plugin$express);
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
        A.Sf("finished plugins$init created $plugins: %s", A.O(plugins));
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
        const me = A.$plugins.methods.find((i) => i.label.endsWith("." + method));
        if (me) {
          me.init({
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

class Acceptdata extends utils.Adapter {
  /**
   * @param {Partial<ioBroker.AdapterOptions>} [options={}]
   */
  constructor(options) {
    super({
      ...options,
      name: "acceptdata",
    });
    this.on("ready", this.onReady.bind(this));
    this.on("objectChange", this.onObjectChange.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    // this.on("message", this.onMessage.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }

  /**
   * Is called when databases are connected and adapter received configuration.
   */
  async onReady() {
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

    // app.use(
    //   express.json({
    //     type: ["*.json", "*/json"],
    //   })
    // );

    app.use(express.urlencoded({ extended: false }));
    app.use(express.json());
    app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
      );
      // if (req.method === 'OPTIONS') {
      //   res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
      //   return res.status(200).json({});
      // }
      next();
    });
    if (this.config.pathtable)
      for (const i of this.config.pathtable) {
        let { name, path, method, convert, enabled } = i;
        if (!name) name = path;
        if (enabled) {
          convert = convert || "$";
          if (typeof path == "string" && path.startsWith("/")) path = path.slice(1);
          this.log.info(
            `Installed ${name} path: '${path}' with ${method}-method and convert: ${convert}`
          );
          switch (method) {
            case "GET": // get
            default:
              app.get("/" + path, async (request, response) => {
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
                await A.wait(1);
                stData(res, name);
                //      response.send("Hello from Express!");
              });
              break;
            case "PUT": // get
              app.put("/" + path, async (request, response) => {
                this.log.debug(
                  "PUT data received: " +
                    typeof request.body +
                    ", " +
                    inspect(request.body, {
                      depth: 2,
                      color: true,
                    }) +
                    inspect(request.query, {
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
                await A.wait(1);
                stData(res, name);
                //      response.send("Hello from Express!");
              });
              break;
            case "POST": // post
              app.post("/" + path, async (request, response) => {
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
                await A.wait(1);
                stData(res, name);
                //      response.send("Hello from Express!");
              });
              break;
          }
        }
      }

    app.get("/*", (request, response) => {
      const str =
        "get unknown path '" +
        request._parsedUrl.pathname +
        "' with " +
        inspect(request.query, {
          depth: 2,
          color: true,
        });

      this.log.debug(str);
      response.send(str);
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

  /**
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   * @param {() => void} callback
   */
  onUnload(callback) {
    try {
      this.log.info("cleaned everything up...");
      callback();
    } catch (e) {
      callback();
    }
  }

  /**
   * Is called if a subscribed object changes
   * @param {string} id
   * @param {ioBroker.Object | null | undefined} obj
   */
  onObjectChange(id, obj) {
    if (obj) {
      // The object was changed
      this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
    } else {
      // The object was deleted
      this.log.info(`object ${id} deleted`);
    }
  }

  /**
   * Is called if a subscribed state changes
   * @param {string} id
   * @param {ioBroker.State | null | undefined} state
   */
  onStateChange(id, state) {
    if (state) {
      if (!state.from.endsWith(this.namespace))
        // The state was changed from somebody else!
        this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack}, from=${state.from})`);
    } else {
      // The state was deleted
      this.log.info(`state ${id} deleted`);
    }
  }

  // /**
  //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
  //  * Using this method requires "common.message" property to be set to true in io-package.json
  //  * @param {ioBroker.Message} obj
  //  */
  // onMessage(obj) {
  // 	if (typeof obj === "object" && obj.message) {
  // 		if (obj.command === "send") {
  // 			// e.g. send email or pushover or whatever
  // 			this.log.info("send command");

  // 			// Send response in callback if required
  // 			if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
  // 		}
  // 	}
  // }
}

/* // @ts-ignore parent is a valid property on module
if (module.parent) {
  // Export the constructor in compact mode
  module.exports = (options) => new Acceptdata(options);
} else {
  // otherwise start the instance directly
  new Acceptdata();
}
 */
