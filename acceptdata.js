// @ts-nocheck
"use strict";

/*
 * Created with @iobroker/create-adapter v1.23.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");
const express = require("express");
//const bodyParser = require('body-parser')
const {
	inspect
} = require("util");
const app = express();

// Load your modules here, e.g.:
// const fs = require("fs");

async function wait(num, arg) {
	let tout = null;
	return new Promise(res => {
		num = num || 0;
		tout = setTimeout(_ => {
			if (tout) clearTimeout(tout);
			tout = null;
			res(arg);
		});
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
				evalError: inspect(e)
			};
		}
		return res;
	}
	obj = obj || {};
	if (typeof obj === "string")
		obj = JSON.parse(obj);
	if (!pattern)
		return obj;
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
				unit: "%"
			},
			Kmh: {
				role: "value.speed",
				type: "number",
				unit: "km/h"
			},
			Deg: {
				role: "walue.direction",
				type: "number",
				unit: "°"
			},
			Date: {
				role: "date.start",
				type: "string"
			},
			Hpa: {
				role: "value.pressure",
				type: "number",
				unit: "hPA"
			},
			Mm: {
				role: "value.distance",
				type: "number",
				unit: "mm"
			},
			Wm2: {
				role: "value",
				type: "number",
				unit: "W/m²"
			},
			Txt: {
				role: "text",
				type: "string"
			},
			C: {
				role: "value.temperature",
				type: "number",
				unit: "°C"
			},
			V: {
				role: "value",
				type: "number"
			},
		};
		let common = {
			role: "value",
			read: true,
			write: true,
		};
		let iname = path + (name ? "." + name : "");
		for (const t of Object.keys(types))
			if (iname.endsWith(t)) {
				iname = iname.slice(0, iname.length - t.length);
				common = Object.assign(common, types[t]);
				break;
			}
		common.name = iname;
		if (lastData[iname] === undefined) {
			that.log.info("create '" + iname + "'.");
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
				val: item
			});
		}
		return wait(1);
	}

	if (typeof item !== "object")
		return await storeItem(item);
	for (const i of Object.keys(item))
		await storeItem(item[i], i);
	return Promise.resolve();
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

		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:
		this.log.info("config port: " + this.config.port);
		this.log.info("config path: " + this.config.path);
		this.log.info("config convert: '" + this.config.convert + "'");
		/*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean variable named "testVariable"
		Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		*/
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

		// in this template all states changes inside the adapters namespace are subscribed
		this.subscribeStates("*");

		/*
		setState examples
		you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
		*/
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

		const port = Number(this.config.port) || 3000;

		const stData = storeData.bind(this);

		//app.use(bodyParser.urlencoded({ extended: true }));
		/*
		app.all("/*", function (req, res, next) {
		        if (req.originalUrl == "/favicon.ico")
		                return;
		    console.log("all:", req._parsedUrl.pathname, inspect(req.query,{depth:2, color:true}));
		  next() // pass control to the next handler
		})
		*/

		if (this.config.pathtable)
			this.config.pathtable.map(i => {
				let {
					path,
					method,
					convert,
					enabled
				} = i;
				if (enabled) {
					convert = convert || "$";
					if (path.startsWith("/")) path = path.slice(1);
					switch (method) {
						case "1": // get
						default:
							app.get("/" + path, (request, response) => {
								this.log.debug("get data received: " + inspect(request.query, {
									depth: 2,
									color: true
								}));
								const res = convertObj(request.query, convert);
								this.log.debug("Converted Data: " + inspect(res, {
									depth: 2,
									color: true
								}));
								stData(res, path);
								response.send("success");
								//      response.send("Hello from Express!");
							});
							break;
						case "2": // post
							break;
					}
				}
			});

		app.get("/*", (request, response) => {
			this.log.debug("get unknown data received for '" + request._parsedUrl.pathname + "' with " +
				inspect(request.query, {
					depth: 2,
					color: true
				}));
			response.send("success");
			//      response.send("Hello from Express!");
		});


		app.listen(port, (err) => {
			if (err) {
				return this.log.error("something bad happened" + inspect(err));
			}
			this.setState("info.connection", {val: true, ack: true});
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
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
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

// @ts-ignore parent is a valid property on module
if (module.parent) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Acceptdata(options);
} else {
	// otherwise start the instance directly
	new Acceptdata();
}