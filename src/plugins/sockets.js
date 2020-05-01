import Vue from "vue";
import SocketIO from "socket.io-client";
import VueSocketIO from "vue-socket.io";

const options = { path: "/socket.io" /* , autoConnect: false  */}; //Options object to pass into SocketIO
const devMode = process.env.NODE_ENV !== "production";

//const server = devMode ? "ws://" + process.env.VUE_APP_IOBROKER : "/";
const server = "ws://localhost:8181/";
//const server = "ws://buster10.fritz.box:8081/";
//const server = "/";
const socket = SocketIO(server, options);
//console.log("SocketIO:", server, options, socket);

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
                (tout = null),
                new Error(`socketEmit - timeout for ${event}: ${data}`)
              ),
            5000
          );
          //          console.log("emit:", event, ...data);
          this.$socket.emit(event, ...data, (err, result) => {
            //           console.log(`emit ${event} returned:`, err, result);
            if (tout) clearTimeout(tout);
            if (err) rej(err)
            else res(result);
          });
        });
      },
      async socketSendTo(event, ...data) {
        return new Promise((res, rej) => {
          let tout = setTimeout(
            () =>
              rej(
                (tout = null),
                new Error(`socketSendTo - timeout for ${event}: ${data}`)
              ),
            10000
          );
          //          console.log("socketSendTo:", event, ...data);
          this.$socket.emit(event, ...data, (result) => {
            if (tout) clearTimeout(tout);
            //            console.log(`socketSendTo ${event} returned:`, result);
            res(result);
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
    debug: devMode,
    connection: socket, //options object is Optional
  })
);

export default install;
