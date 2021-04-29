const A = require("../fjadapter");
const { JSONPath } = require("jsonpath-plus");
const parse = require("csv-parse/lib/sync");
const jsonframe = require("jsonframe-cheerio");
const cheerio = require("cheerio");

const plugin$converters = {
  name: "plugin$converters",
  hooks: {
    async plugins$init({ plugins, adapter }, handler) {
      A.S("plugin plugin$converters runs plugins$init with RegExp");
      plugins.converters.push(
        {
          label: "RegExp",
          value: "RegExp",
          desc: "use a RegExp with an array of found items",
          options: true,
          convert: async (value, functions, item) => {
            let r = item.convert;
            try {
              if (!(r instanceof RegExp)) {
                if ((r = item.convert.match(/^\s*\/(.*)\/([dgimsuy]*)\s*$/))) {
                  r = r.slice(1);
                  r = new RegExp(...r);
                } else r = A.makeFunction(convert, "A")(A);
                if (r instanceof RegExp) {
                  item.convert = r;
                } else {
                  return A.W(
                    "RegExp converter for %s did not get a valid regexp expression: %s",
                    item.name,
                    item.convert
                  );
                }
              }
              //            let res = ((r.flags.indexOf("m")>=0)  ? value.replace(/\n/g," ") : value).match(r);
              let res = value.match(r);
              if (Array.isArray(res) && res.input) res = res.slice(1);
              A.D("RegExp result: %o, processed %s with %s", res, value, r.toString());
              return res;
            } catch (e) {
              r = A.W("Error %o in conversion from JSON :%o", e, value);
              return Promise.reject(r);
            }
          },
        },
        {
          label: "JsonPath",
          value: "JsonPath",
          desc: "use JsonPath to create an array of selected items",
          options: true,
          convert: async (value, functions, item) => {
            let r = item.convert;
            try {
              if (typeof r === "string") {
                r = r.trim();
                if (r.startsWith("return ") || (r.startsWith("{") && r.endsWith("}"))) {
                  r = A.makeFunction(r, "A,F")(A, A.$F);
                } else r = { path: r };
              }
              if (typeof r !== "object")
                return Promise.reject(A.W("Invalid JsonPath in item %s option %o", item.name, r));
              item.convert = r;
              r = Object.assign({}, r, { json: value });
              let res = JSONPath(r);
              if (!Array.isArray(res) || !res.length) res = null;
              else if (Array.isArray(res) && res.length == 1) res = res[0];
              A.S("JsonPath result: %o, processed %s", res, r);
              return res;
            } catch (e) {
              r = A.W("Error %o in conversion from JSON :%o", e, value);
              return Promise.reject(r);
            }
          },
        },
        {
          label: "JsonCheerio",
          value: "JsonCheerio",
          desc: "use jsonframe to parse cheerio to json objects",
          options: true,
          convert: async (value, functions, item) => {
            let r = item.convert;
//            A.D("JsonCheerio %s: (type %s): %s", item.name, A.T(value), value);
            try {
              if (typeof r === "string") {
                r = r.trim();
                if (r.startsWith("return ") || (r.startsWith("{") && r.endsWith("}"))) {
                  r = A.makeFunction(r, "A,F")(A, A.$F);
                } else r = { path: r };
              }
              if (typeof r !== "object")
                return Promise.reject(A.W("Invalid JsonPath in item %s option %o", item.name, r));
              item.convert = r;
              const $ = typeof value === "string" ? cheerio.load(value) : value;
              if (typeof $ != "function") return Promise.reject("JsonCheerio error in %s cannot load %s", item.name, value);
              let res = jsonframe($);
              res = $.scrape(r, { string: true });
              A.D("JsonCheerio result: %o, processed %s", res, r);
              return res;
            } catch (e) {
              return Promise.reject(A.W("Error %o in conversion from JSON :%o", e, value));
            }
          },
        },
        {
          label: "CSV",
          value: "CSV",
          desc: "convert CSV data to array of records",
          options: true,
          convert: async (value, functions, item) => {
            let r = item.convert;
            try {
              if (typeof r === "string") {
                r = r.trim();
                if (!r.startsWith("return ") /* && !(r.startsWith("{") && r.endsWith("}")) */)
                  r = `return ${r}`;
                r = A.makeFunction(r, "A,F")(A, A.$F);
              }
              if (typeof r !== "object")
                return Promise.reject(
                  A.W("Invalid CSV-option in item %s option %o", item.name, item.convert)
                );
              item.convert = r;
              let res = parse(value, r) || [];
              A.D("CSV result: %o, processed %s", res, item.name);
              return res;
            } catch (e) {
              return Promise.reject(A.W("Error %o in conversion from CSV :%o", e, item.convert));
            }
          },
        },
        {
          label: "Function",
          value: "Function",
          desc: "use a function transform the incoming item to an array or object",
          options: true,
          convert: async (value, functions, item) => {
            let fun = item.convert;
            try {
              if (typeof fun !== "function") {
                fun = A.makeFunction(item.convert, "A,F,$,item");
                item.convert = fun;
              }
              const res = await Promise.resolve(fun(A, functions, value, item));
              A.D(
                "Converter Function with Options %s converted '%o' to '%o'",
                item.config.convert,
                value,
                res
              );
              return res;
            } catch (e) {
              res = A.W(
                "Error %o in converter function `%s` with value: %o",
                e,
                item.convert,
                value
              );
              return Promise.reject(res);
            }
          },
        },
        {
          label: "just log",
          value: "log",
          desc: "kust log incoming object and return it",
          convert: async (value, functions, item) => {
            A.I("%s converter (type %s) log: %O", item.name, A.T(value), value);
            return value;
          },
        }
      );
      return handler;
    },

    /*     async plugins$run({ plugins, adapter }, handler) {
      A.Sf("plugin plugin$exec runs plugins$run with %s", A.O(plugins));
      return handler;
    },
    async plugins$stop({ plugins, adapter }, handler) {
      A.Sf("plugin plugin$exec runs plugins$stop and closes express.");
      return handler;
    },
 */
  },
};

module.exports = plugin$converters;
