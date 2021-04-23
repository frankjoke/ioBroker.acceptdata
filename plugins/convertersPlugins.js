const A = require("../fjadapter");
const { JSONPath } = require("jsonpath-plus");

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
                  r = await Promise.resolve(A.makeFunction(r, "A")(A));
                } else r = { path: r };
              }
              if (typeof r !== "object")
                return Promise.reject(A.W("Invalid JsonPath in item %s option %o", item.name, r));
              item.convert = r;
              r = Object.assign({}, r, { json: value });
              let res = JSONPath(r);
              if (!Array.isArray(res) || !res.length)
                res = null;
              A.S("JsonPath result: %o, processed %s", res, r);
              return res;
            } catch (e) {
              r = A.W("Error %o in conversion from JSON :%o", e, value);
              return Promise.reject(r);
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
                fun = A.makeFunction(item.convert, "A,F,$");
                item.convert = fun;
              }
              const res = await Promise.resolve(fun(A, functions, value));
              A.D(
                "Converter Function with Options %s converted '%o' to '%o'",
                item.config.convert,
                value,
                res
              );
              return res;
            } catch (e) {
              res = A.W("Error in converter function `%s` with value: %o", item.convert, value);
              return Promise.reject(res);
            }
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