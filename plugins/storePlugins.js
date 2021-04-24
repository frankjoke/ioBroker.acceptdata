const { makeFunction } = require("../fjadapter");
const A = require("../fjadapter");

const plugin$store = {
  name: "plugin$store",
  hooks: {
    async plugins$init({ plugins, adapter }, handler) {
      A.S("plugin plugin$store runs plugins$init with %o", plugins);
      plugins.store.push(
        {
          label: "as is",
          value: "asis",
          desc: "store the value as is with item name",
          hasOptions: false,
          store: async (value, functions, item) => {
            A.S("Run store as is on %s with value %o", item.name, value);
            return A.updateState(item.name, value);
          },
        },
        {
          label: "Function",
          value: "function",
          desc: "store the value via a specific function",
          hasOptions: true,
          store: async (value, functions, item) => {
            A.D(
              "Run store-Function on %s with option %o and value %o",
              item.name,
              item.storeOptions,
              value
            );
            let fun = item.storeOptions;
            if (typeof fun === "string") {
              fun = A.makeFunction(fun, "$,A,F,item,store");
              item.storeOptions = fun;
            }
            if (typeof fun === "function") {
              value = await fun(
                value,
                A,
                A.$F,
                item,
                async (name = "", val, common = {}) =>
                  await A.updateState(item.name + (name ? "." + name : ""), val, {
                    ack: true,
                    common,
                  })
              );
            } else return Promise.reject(A.W("Invalid function ion %s: %s", item.name, fun));
            return value !== undefined ? A.updateState(item.name, value) : value;
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

module.exports = plugin$store;
