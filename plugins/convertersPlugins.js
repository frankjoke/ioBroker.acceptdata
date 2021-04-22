const A = require("../fjadapter");

const plugin$converters = {
  name: "plugin$converters",
  hooks: {
    async plugins$init({ plugins, adapter }, handler) {
      A.D("plugin plugin$converters runs plugins$init with %o", plugins);
      plugins.converters.push({
        label: "RegExp",
        value: "RegExp",
        options: true,
        convert: async (value, functions, options) => {
          let r;
          try {
            if ((r = options.match(/^\s*\/(.*)\/([dgimsuy]*)\s*$/))) {
              r = r.slice(1);
              r = new RegExp(...r);
            } else r = A.makeFunction(options, "A")(A);
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
      });
      plugins.converters.push({
        label: "Function",
        value: "Function",
        options: true,
        convert: async (value, functions, options) => {
          try {
            const fun = A.makeFunction(options, "A,F,$");
            const res = await Promise.resolve(fun(A, functions, value));
            A.S("Converter Function with Options %o converted '%o' to '%o'", options, value, res);
            return res;
          } catch (e) {
            res = A.W("Error in converter function `%s` with value: %o", options, value);
            return Promise.reject(res);
          }
        },
      });
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
