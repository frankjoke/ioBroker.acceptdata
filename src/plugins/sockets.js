import Vue from "vue";
import SocketIO from "socket.io-client";
import VueSocketIO from "vue-socket.io";

const options = { path: "/socket.io" }; //Options object to pass into SocketIO
const devmode = process.env.NODE_ENV == "development";
const server = devmode ? "ws://" + process.env.VUE_APP_IOBROKER : "/";
//console.log(server, options);
const socket = SocketIO(server, options);

//console.log(process.env);
const mylang = (navigator.language || navigator.userLanguage).slice(0, 2);

const install = function (Vue, _options) {
  Vue.mixin({
    methods: {
      async socketEmit(event, ...data) {
        return new Promise((res, rej) => {
          let tout = setTimeout(
            () =>
              rej(
                new Error(
                  "Timeout SocketIo Response to " + event + ": " + data
                ),
                (tout = null)
              ),
            5000
          );
          //          console.log("emit:", event, ...data);
          this.$socket.emit(event, ...data, (err, result) => {
            //            console.log(err, result);
            if (tout) clearTimeout(tout);
            else return rej("Timeout");
            if (err || !result)
              rej(
                err ? err : new Error("No result for: " + event + ": " + data)
              );
            else res(result);
          });
        });
      },
    },
  });
  /* 
    // 1. add global method or property
  Vue.myGlobalMethod = function () {
    // some logic ...
  };

  // 2. add a global asset
  Vue.directive("my-directive", {
    bind(_el, _binding, _vnode, _oldVnode) {
      // some logic ...
    },
  });

  // 3. inject some component options
  Vue.mixin({
    created: function () {
      // some logic ...
    },
  });

  // 4. add an instance method
  Vue.prototype.$myMethod = function (_methodOptions) {
    // some logic ...
  };
 */
};

Vue.use(
  new VueSocketIO({
    debug: devmode,
    connection: socket, //options object is Optional
  })
);

export default install;
