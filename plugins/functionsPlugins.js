const A = require("../fjadapter");

function toNum(v, n= -1) {
  const vn = Number(v);
  if (typeof n !== "number" || n < 0) return vn;
  return vn.toFixed(n);
}

const funs = {
  toNum,
  toEuNum: (v, n) => toNum(v.replace(/\./g,"").replace(",","."), n),
  store: async (item, name = "", value, common = {}) => {
    const r = await A.updateState(item.name + (name ? "." + name : ""), value, { ack: true, common });
    return r;
  },
  fToC: (f, p = 1) => toNum((5.0 * (Number(f) - 32)) / 9, p),
  iToMm: (i, p = 1) => toNum(25.4 * Number(i), p),
  cToF: (c, p = 1) => toNum((Number(c) * 9.0 + 160) / 5, p),
  mphToKmh: (mph, p = 2) => toNum(1.61 * Number(mph), p), // convert mph to kmh
  kmhToMph: (kmh, p = 2) => toNum(Number(kmh) / 1.61, p), // convert kmh to mph
};

const plugin$functions = {
  name: "plugin$functions",
  hooks: {
    async plugins$init({ plugins, adapter }, handler) {
      A.S("plugin plugin$functions runs plugins$init with %o", plugins);
      Object.assign(plugins.functions, funs);
      return handler;
    },
  },
};

module.exports = plugin$functions;
