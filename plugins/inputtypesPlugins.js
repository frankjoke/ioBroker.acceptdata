const A = require("../fjadapter");
const xml2js = require("xml2js");

const plugin$converters = {
  name: "plugin$inputtypes",
  hooks: {
    async plugins$init({ plugins, adapter }, handler) {
      A.D("plugin plugin$converters runs plugins$init with %o", plugins);
      plugins.inputtypes.push({
        label: "XML",
        value: "XML",
        convert: async (value, functions, item) => {
          const xmlparser = new xml2js.Parser({
            explicitArray: false,
            explicitRoot: false,
            //			ignoreAttrs: true,
            attrkey: "_",
            charkey: "#",
            childkey: "__",
            mergeAttrs: true,
            trim: true,
            //			validator: (xpath, currentValue, newValue) => A.D(`${xpath}: ${currentValue} = ${newValue}`,newValue),
            //			validator: (xpath, currentValue, newValue) => A.T(newValue,[]) && newValue.length==1 && A.T(newValue[0],[]) ? newValue[0] : newValue,
            //			attrNameProcessors: [str => str === '$' ? '_' : str],
            tagNameProcessors: [(str) => str.replace(reStripPrefix, "")],
            //                attrNameProcessors: [tagnames],
            attrValueProcessors: [valp],
            valueProcessors: [valp],
          });
          try {
            const r = await xmlparser.parseStringPromise(value);
            return r;
          } catch (e) {
            A.W("Error %o in conversion from JSON :%o", e, value);
            return Promise.reject(e);
          }
        },
      });
      plugins.inputtypes.push({
        label: "JSON",
        value: "JSON",
        convert: async (value, functions, item) => {
          try {
            const tmp = JSON.stringify(value);
            return tmp;
          } catch (e) {
            const tmp = A.W("JSON stringify Error in JSON inputtype converter: %o", e);
            return Promise.reject(tmp);
          }
        },
      });
      plugins.inputtypes.push({
        label: "log",
        value: "log",
        convert: async (value, functions, item) => {
          A.I("InputConverter 'log' received for %s: %o", item.name, value);
          return value;
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
