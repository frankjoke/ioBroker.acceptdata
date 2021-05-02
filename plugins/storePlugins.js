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
            A.D("Run store as is on %s with value %o", item.name, value);
            return A.updateState(item.name, value);
          },
        },
        {
          label: "just log",
          value: "log",
          desc: "just log data and do not save them",
          hasOptions: false,
          store: async (value, functions, item) => {
            A.I("log store for %s with (type %s) value %s", item.name, A.T(value), value);
            return undefined;
          },
        },
        {
          label: "Function",
          value: "function",
          desc: "store the value via a specific function",
          hasOptions: true,
          store: async (value, functions, item) => {
            A.S(
              "Run store-Function on %s with option %o and value %o",
              item.name,
              item.config.storeOptions,
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
        },
        {
          label: "Fields",
          value: "fields",
          desc: "store the value to different fields",
          hasOptions: true,
          store: async (value, functions, item) => {
            function getName(typ) {
              let name = "",
                unit = "",
                fun,
                rfun,
                desc = "",
                role = "";
              let arg2;
              if (typ) {
                [name, unit, fun, role, desc] = A.trim(typ.split("|"));
                const comm = {};
                if (unit) comm.unit = unit;
                if (fun) {
                  const farg = fun.match(/^(\S+?)(-?\d+)$/);
                  fun = farg ? farg[1] : fun;
                  const arg2 = farg ? Number(farg[2]) : undefined;
                  rfun = (v, a) => {
                    try {
                      return A.$F[fun](v, a);
                    } catch (e) {
                      A.W("store fields has invalid function %s in %s: %s", fun, item.name, e);
                      return (v) => v;
                    }
                  };
                }
                if (role) comm.role = role;
                if (desc) comm.desc = desc;
                typ = { common: comm };
              } else typ = undefined;
              return [name, typ, rfun, arg2];
            }

            async function idc(pre = "", mid = "", post = "", val = value, typ) {
              let [name, type, fun, arg] = getName(typ);
              name = item.name + pre + mid + name + post;
//                            A.D("idc: %s(%o)(%O):%s", name, type, fun, val);
              if (fun) val = await fun(val, arg);
              return A.updateState(name, val, type);
            }

            async function mapStore(how, basename, value) {
              return await A.mapSeries(Object.entries(how), async ([key, entry]) => {
//                A.D("MapStore %s: %s = %s, %o", item.name, basename, key, entry);
                if (key === "$_name") return null;
                if (typeof entry === "string") {
                  entry = entry.trim();
                  if (entry) return await idc("", basename, "", value[key], entry.startsWith("|") ? key+entry : entry);
                } else if (typeof entry === "object") {
                  return await mapStore(entry, basename + (entry.$_name || key) + ".", value[key]);
                }
                return A.updateState(item.name + basename + key, value);
              });
            }

            A.S(
              "Run store-Function on %s with option %o and value %o",
              item.name,
              item.config.storeOptions,
              value
            );
            let str = item.storeOptions;
            if (typeof str === "string") {
              //            let str = ".[ConsumableStation+ConsumableLabelCode+ConsumableSelectibilityNumber/ConsumablePercentageLevelRemaining]";
              str = str && str.trim();
              if (!str) return val !== undefined ? A.updateState(item.name, value) : undefined;
              else if (str.startsWith("return ") || (str.startsWith("{") && str.endsWith("}"))) {
                A.D("store %s convert %s to object", item.name, str);
                try {
                  let fun = A.MA.asyncWrap(A.makeFunction(str, "A,F,$"));
                  str = await fun(A, A.$F, value);
                } catch (e) {
                  return A.W(
                    "store error %o in %s converting %s to an object!",
                    e,
                    item.name,
                    item.storeOptions
                  );
                }
                if (typeof str === "object") item.storeOptions = str;
              } else {
                const reIsMultiName = /^([^\s,\[]*)\s*(\[(\(\s*-?\d+\s*(?:,\s*-?\d+\s*)?\))?\s*(\S+\/\S*|[^\s,\]]+(\s*\,\s*[^\s,\]]+)+|\*)\s*\]\s*)?(\S*)$/;
                const reIsObjName = /^\s*(\S+?)\s*\/\s*(\S*)\s*$/;

                const mnm = str.match(reIsMultiName);
                if (mnm) {
                  let [, pre, , slice, mid, , post] = A.trim(mnm);
                  A.D(
                    "store match was pre:'%s', mid:'%o', post:'%s', slice:%s",
                    pre,
                    mid,
                    post,
                    slice
                  );
                  slice =
                    slice && slice !== "undefined" && slice.match(/\S+/)
                      ? slice
                          .slice(1, -1)
                          .split(",")
                          .map((i) => Number(i))
                      : null;

                  if (Array.isArray(value) && Array.isArray(slice)) value = value.slice(...slice);

                  if (mid != "*") {
                    const on = mid.match(reIsObjName);
                    const name = on && on[1] !== "undefined" ? A.trim(on[1].split("+")) : on[1];
                    if (on) mid = { name, value: on[2] && on[2] != "*" ? on[2] : null };
                    else mid = A.trim(mid.split(","));
                    await A.mapSeries(value, async (i) => {
                      const name = mid.name.map((n) => i[n]).join("_");
                      //                A.D("!=* %s: %o = %s %s", item.name, mid, i, post);
                      if (!mid.value)
                        return A.mapSeries(Object.entries(i), async ([key, val]) =>
                          mid.name.indexOf(key) < 0 ? idc(pre, "", "." + key, val, post) : null
                        );
                      const [nam, ...rest] = mid.value.split("|");
                      rest.unshift("");
// A.D("!=* %s: %s = %s %s", nam, name, i[nam], rest);
                      return idc(pre, name, "", i[nam], post || rest.join("|"));
                    });
                    return undefined;
                  } else if (Array.isArray(value)) {
                    return A.mapSeries(value, (i, index) => idc("", "", "", value[index], i));
                  } else return idc(pre, "", "", value, post);
                }
              }
            }
            if (typeof str != "object")
              return A.W(
                "Invalid field option in %s (type %s): '%s' coming from %s",
                item.name,
                typeof str,
                str,
                item.config.storeOptions
              );

            await mapStore(str, ".", value);
            return null;
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
