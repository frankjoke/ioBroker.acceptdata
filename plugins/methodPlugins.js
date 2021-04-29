const A = require("../fjadapter");
const fs = require("fs/promises");
const si = require("systeminformation");
const axios = require("axios");

const plugin$methods = {
  name: "plugin$methods",
  hooks: {
    async plugins$init({ plugins, adapter }, handler) {
      A.S("plugin plugin$methods runs plugins$init with %o", plugins);
      plugins.methods.push(
        {
          label: "web",
          value: "web",
          desc: "get an url from web and return received content",
          hasSchedule: true,
          iconv: true,
          cache: true,
          read: async (path, item) => {
            A.S("Run %s with path %s!", "exec.read", path);
            let res = undefined;
            try {
              res = A.getOptions(path, "url");
              res = await axios.request(res);
              res = res.data;
              A.S("executed web request on %s with result %s", path, res);
              return res;
            } catch (e) {
              return Promise.reject(A.W("Exec error on '%s': %s", path, e));
            }
          },
          //          write: async ({ path, callback }) => {},
        },
        {
          label: "exec",
          value: "exec",
          desc: "execute a statement on command line of host system and return the output.",
          hasSchedule: true,
          iconv: true,
          write: true,
          cache: true,
          read: async (path, item) => {
            A.S("Run %s with path %s!", "exec.read", path);
            let res = undefined;
            try {
              res = A.getOptions(path, "cmd");
              res = await A.exec(res);
            } catch (e) {
              return Promise.reject(A.W("Exec error on '%s': %s", path, e));
            }
            A.I("executed %s with result %s", path, res);
            return res;
          },
        },
        {
          label: "file",
          value: "file",
          hasSchedule: true,
          iconv: true,
          desc: "read a file and return th output.",
          read: async (path, item) => {
            A.S("Run %s with path %s!", "file.read", path);
            try {
              let { file, ...options } = A.getOptions(path, "file", { encoding: "utf8" });
              res = await fs.readFile(file, options);
              A.D("executed %s with result %o", path, res);
              return res;
            } catch (e) {
              A.W("File read error for %o", path);
              return Promise.reject(e);
            }
          },
          write: async (path, value, item) => {
            A.S("Run %s with path %s!", "file.read", path);
            let res = await A.writeFile(path, value.toString(), "utf8");
            A.S("executed %s with result %o", path, res);
            return res;
          },
        },
        {
          label: "systeminfo",
          value: "systeminfo",
          desc: "execute one function of systeminformation",
          hasSchedule: true,
          read: async (path, item) => {
            A.S("Run %s with path %s!", "file.read", path);
            if (typeof si[path] !== "function") {
              A.E(
                "Systeminfo error Path `%s` is not a systeminfo function (one of %s)!",
                path,
                Object.keys(si).join(", ")
              );
              return {};
            }
            let res = await Promise.resolve(si[path]());
            A.S("executed systeminfo %s with result %o", path, res);
            return res;
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

module.exports = plugin$methods;
