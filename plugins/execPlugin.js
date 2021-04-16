const A = require("../fjadapter");

const plugin$exec = {
  name: "plugin$exec",
  hooks: {
    async plugins$init({ plugins, adapter }, handler) {
      A.Sf("plugin plugin$exec runs plugins$init with %s", A.O(plugins));
      plugins.methods.push(
        {
          name: "exec",
          label: "exec",
          value: "exec",
          schedule: true,
          cache: true,
          read: async ({ path, callback }) => {
            A.Sf("Run %s with path %s!", "exec", path);
            let res = undefined;
            try {
              res = await A.exec(path);
            } catch (e) {
              A.Wf("Exec error on '%s': %s", path, A.O(e));
            }
            A.If("executed %s with result %s", path, A.O(res));
            callback && callback(res);
          },
//          write: async ({ path, callback }) => {},
        },
        {
          name: "exece",
          label: "exece",
          value: "exece",
          schedule: true,
          cache: true,
          read: async ({ path, callback }) => {
            A.Sf("Run %s with path %s!", "exec", path);
            let res = undefined;
            try {
              res = await A.exec("!" + path);
            } catch (e) {
              A.Wf("Exec error on '%s': %s", path, A.O(e));
            }
            A.If("executed %s with result %s", path, A.O(res));
            callback && callback(res);
          },
//          write: async ({ path, callback }) => {},
          init: async ({ path, callback }) => {
            A.Sf("Install %s with path %s!", "exece", path);
            /*             app.post(path, async (request, response) => {
              const s = A.Silly("GET data received: " + A.O(request.query));
              response.send("success: " + s);
              await A.wait(1);
              callback && callback(request.query);
              //      response.send("Hello from Express!");
            });
 */
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

module.exports = plugin$exec;
