const A = require("../fjadapter");
const express = require("express");
const getRawBody = require("raw-body");
const app = express();

const plugin$express = {
  name: "plugin$express",
  hooks: {
    async plugins$init({ plugins, adapter }, handler) {
      A.Sf("plugin plugin$express runs plugins$init with %s", A.O(plugins));
      plugins.methods.push(
        {
          name: "GET",
          label: "server.GET",
          value: "express.get",
          init: async ({ path, callback }) => {
            A.Sf("Install %s with path %s!", "server.GET", path);
            app.get(path, async (request, response) => {
              const s = A.Silly("GET data received: " + A.O(request.query));
              response.send("success: " + s);
              await A.wait(1);
              callback && callback(request.query);
              //      response.send("Hello from Express!");
            });
          },
        },
        {
          name: "POST",
          label: "server.POST",
          value: "express.post",
          init: async ({ path, callback }) => {
            A.Sf("Install %s with path %s!", "server.POST", path);
            app.post(path, async (request, response) => {
              const s = A.Silly("GET data received: " + A.O(request.query));
              response.send("success: " + s);
              await A.wait(1);
              callback && callback(request.query);
              //      response.send("Hello from Express!");
            });
          },
        },
        {
          name: "PUT",
          label: "server.PUT",
          value: "express.put",
          init: async ({ path, callback }) => {
            A.Sf("Install %s with path %s!", "server.PUT", path);
            app.put(path, async (request, response) => {
              const s = A.Sf(
                "PUT data received: %s, %s, %s",
                typeof request.body,
                A.O(request.body),
                A.O(request.query)
              );
              response.send("success\n" + s);
              await A.wait(1);
              callback && callback(request.query);
            });
          },
        }
      );
      app.use(express.urlencoded({ extended: false }));
      app.use(express.json());
      app.use("/favicon.ico", express.static(__dirname + "/admin/icon.png"));
      app.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header(
          "Access-Control-Allow-Headers",
          "Origin, X-Requested-With, Content-Type, Accept, Authorization"
        );
        // if (req.method === 'OPTIONS') {
        //   res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
        //   return res.status(200).json({});
        // }
        next();
      });
      return handler;
    },
    async plugins$run({ plugins, adapter }, handler) {
      A.Sf("plugin plugin$express runs plugins$run with %s", A.O(plugins));
      app.get("/*", (request, response) => {
        const str =
          "get unknown path '" + request._parsedUrl.pathname + "' with " + A.O(request.query);
        A.W(str);
        response.send(str);
      });

      app.listen(plugins.config.port, (err) => {
        if (err) {
          return A.E("something bad happened" + A.O(err));
        }
        adapter.setState("info.connection", {
          val: true,
          ack: true,
        });
        A.I(`express server is listening on ${plugins.config.port}`);
      });
      return handler;
    },
    async plugins$stop({ plugins, adapter }, handler) {
      A.Sf("plugin plugin$express runs plugins$stop and closes express.");
      app.close();
      return handler;
    },
  },
};

module.exports = plugin$express;
