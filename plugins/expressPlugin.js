const A = require("../fjadapter");
const express = require("express");
var favicon = require("serve-favicon");
var path = require("path");
const getRawBody = require("raw-body");
const app = express();

function makePath(path) {
  path = path.trim();
  return path.startsWith("/") ? path :  "/" + path;
}

const plugin$express = {
  name: "plugin$express",
  hooks: {
    async plugins$init({ plugins, adapter }, handler) {
      A.S("plugin plugin$express runs plugins$init with %s", A.O(plugins));
      plugins.methods.push(
        {
          label: "server.GET",
          value: "express.get",
          desc: "wait for a GET on provided path",
          init: async ({ path, callback }) => {
            A.S("Install %s with path %s!", "server.GET", path);
            app.get(makePath(path), async (request, response) => {
              const s = A.S("GET data received: " + A.O(request.query));
              response.send("success: " + s);
              await A.wait(1);
              callback && callback(request.query);
              //      response.send("Hello from Express!");
            });
            return null;
          },
        },
        {
          label: "server.POST",
          value: "express.post",
          desc: "wait for a POST on provided path",
          init: async ({ path, callback }) => {
            A.S("Install %s with path %s!", "server.POST", path);
            app.post(makePath(path), async (request, response) => {
              const s = A.S("GET data received: " + A.O(request.query));
              response.send("success: " + s);
              await A.wait(1);
              callback && callback(request.query);
              //      response.send("Hello from Express!");
            });
          },
        },
        {
          label: "server.PUT",
          value: "express.put",
          desc: "wait for a PUT on provided path",
          init: async ({ path, callback }) => {
            A.S("Install %s with path %s!", "server.PUT", path);
            app.put(makePath(path), async (request, response) => {
              const s = A.S(
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
      A.S("plugin plugin$express runs plugins$run with %s", A.O(plugins));
//      console.log(A.AI);
      app.use(favicon(path.join(__dirname, "../admin", A.AI.adapterConfig.common.icon)));
//      app.get("/favicon.ico", (req, res) => res.status(200));
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
      A.D("plugin plugin$express runs plugins$stop and closes express.");
      app.close();
      return handler;
    },
  },
};

module.exports = plugin$express;
