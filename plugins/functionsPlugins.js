const A = require("../fjadapter");

function $num(v, n = -1) {
  const vn = Number(v);
  if (typeof n !== "number" || n < 0) return vn;
  return vn.toFixed(n);
}

const funs = {
  $num,
  $euNum: (v, n) => $num(v.replace(/\./g, "").replace(",", "."), n),
  $store: async (item, name = "", value, common = {}) => {
    const r = await A.updateState(item.name + (name ? "." + name : ""), value, {
      ack: true,
      common,
    });
    return r;
  },
  f$c: (f, p = 1) => $num((5.0 * (Number(f) - 32)) / 9, p),
  c$f: (c, p = 1) => $num((Number(c) * 9.0 + 160) / 5, p),
  i$mm: (i, p = 1) => $num(25.4 * Number(i), p),
  feet$m: (f, p = 2) => $num(Number(f) * 0.3048),
  mph$kmh: (mph, p = 2) => $num(1.61 * Number(mph), p), // convert mph to kmh
  kmh$mph: (kmh, p = 2) => $num(Number(kmh) / 1.61, p), // convert kmh to mph
};

const plugin$functions = {
  name: "plugin$functions",
  hooks: {
    async plugins$init({ plugins, options, adapter }, handler) {
      A.S("plugin plugin$functions runs plugins$init with %o", plugins);
      Object.assign(plugins.functions, funs);
      return handler;
    },
  },
};

module.exports = plugin$functions;
