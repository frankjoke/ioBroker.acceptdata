const A = require("../fjadapter");

function installPlugins(options = {}) {
  A.plugins.register(require("./expressPlugin.js"));
  A.plugins.register(require("./execfilePlugin.js"));
  A.plugins.register(require("./convertersPlugins.js"));
  A.plugins.register(require("./functionsPlugins.js"));
  A.plugins.register(require("./inputtypesPlugins.js"));
  A.AI.getStatesAsync("info.plugins.$plugins.*").then((r) =>
    Object.entries(r).map(([id, state]) => {
      try {
        let fun = state.val;
        fun = A.makeFunction("return " + fun, "A");
        const pli = fun(A);
        A.D("pluginState %s, %s=%o", id, state.val, pli);
        A.plugins.register(pli);
      } catch (e) {
        A.W("Plugin registration error from state %s with %s!", id, state.val);
      }
    })
  );
}

module.exports = installPlugins;
