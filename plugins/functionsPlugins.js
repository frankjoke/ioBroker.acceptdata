const A = require("../fjadapter");


const funs = {
  toNum(v, n) {
    const vn = Number(v);
    if (typeof n !== "number" || n < 0) return vn;
    return Number(vn.toFixed(n));
  },
  fToC: (f) => funs.toNum((5.0 * (Number(f) - 32)) / 9, 1),
  iToMm: (i) => funs.toNum(25.4 * Number(i), 1),
  cToF: (c) => funs.toNum((Number(c) * 9.0 + 160) / 5, 1),
  mphToKmh: (mph) => funs.toNum(1.61 * Number(mph), 2),  // convert mph to kmh
  kmhToMph: (kmh) => funs.toNum(Number(kmh) / 1.61, 2),  // convert kmh to mph
};

const plugin$functions = {
  name: "plugin$functions",
  hooks: {
    async plugins$init({ plugins, adapter }, handler) {
      A.D("plugin plugin$functions runs plugins$init with %o", plugins);
      Object.assign(plugins.functions, funs);      
      return handler;
    },
  },
};

module.exports = plugin$functions;
