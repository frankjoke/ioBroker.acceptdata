const A = require("../fjadapter");

function installPlugins(options={}) {
    A.plugins.register(require("./expressPlugin.js"));
    A.plugins.register(require("./execPlugin.js"));
}

module.exports = installPlugins;