const A = require("../fjadapter");
const xml2js = require("xml2js");
const cheerio = require('cheerio');

const reStripPrefix = /(?!xmlns)^.*:/;

function valp(str /* , name */) {
  return !isNaN(str)
    ? Number(str)
    : /^(?:true|false)$/i.test(str)
    ? str.toLowerCase() === "true"
    : str;
}

const plugin$converters = {
  name: "plugin$inputtypes",
  hooks: {
    async plugins$init({ plugins, adapter }, handler) {
      A.S("plugin plugin$converters runs plugins$init with %o", plugins);
      plugins.inputtypes.push(
        {
          label: "XML",
          value: "XML",
          desc: "Convert a string containing XML to a javascript object like from JSON",
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
            let r = {error: "No data"};
            try {
              if (typeof value==="string") r = await xmlparser.parseStringPromise(value);
              A.S("XML processed %d with result %o", item.name, r);
              return r;
            } catch (e) {
              return Promise.reject(A.W("Error %o in conversion from JSON :%o", e, value));
            }
          },
        },
        {
          label: "JSON",
          value: "JSON",
          desc: "Convert a string containing JSON to a javascript object",
          convert: async (value, functions, item) => {
            try {
              const tmp = JSON.stringify(value);
              A.D("JSON converted in %s `%s` to %O", item.name, value, tmp);
              return tmp;
            } catch (e) {
              return Promise.reject(A.W("JSON stringify Error in JSON inputtype converter: %o", e));
            }
          },
        },
        {
          label: "cheerio/jquery",
          value: "cheerio",
          desc: "Convert a web page to a cheerio $ object",
          convert: async (value, functions, item) => {
            try {
              const tmp = cheerio.load(value);
//              A.D("cheerio converted in %s `%s` to %O", item.name, value, tmp);
              return tmp;
            } catch (e) {
              return Promise.reject(A.W("cheerio Error in load: %o", e));
            }
          },
        },
        {
          label: "log",
          value: "log",
          desc: "Just log the received data to see it's content",
          convert: async (value, functions, item) => {
            A.I("InputConverter 'log' received for %s (type %s): %s", item.name, A.T(value), value);
            return value;
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
