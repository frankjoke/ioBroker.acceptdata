<template>
  <v-app>
    <v-app-bar
      app
      color="primary"
      dark
      dense
      elevate-on-scroll
      scroll-target="#MyAppContent"
    >
      <div class="d-flex align-center">
        <v-img
          :alt="ioPackage.common.name"
          class="shrink mr-2"
          contain
          src="../public/acceptdata.png"
          width="35"
        />
        <v-btn :href="ioPackage.common.readme" target="_blank" text>
          <span class="mr-2"
            >{{ ioPackage.common.name }} (v{{ packagej.version }})</span
          >
          <v-icon>mdi-help-circle</v-icon>
        </v-btn>
      </div>
      <v-tabs centered>
        <v-tab>Tab 1<v-icon right>mdi-settings</v-icon></v-tab>
        <v-tab>Tab 2<v-icon right>mdi-phone</v-icon></v-tab>
        <v-tab>Tab 3</v-tab>
      </v-tabs>
      <v-spacer></v-spacer>
      <v-btn flat text
        >Save Config<v-icon>mdi-arrow-down-bold-circle</v-icon></v-btn
      >
      <v-btn flat text
        >Upload Config<v-icon>mdi-arrow-up-bold-circle</v-icon></v-btn
      >
    </v-app-bar>

    <v-content id="MyAppContent" class="flex-wrap"> </v-content>
  </v-app>
</template>

<script>
//import axios from "axios";
import packagej from "../package.json";
import iopackage from "../io-package.json";

const mylang = (navigator.language || navigator.userLanguage).slice(0, 2);
const myCache = {};
/*
function fix(number, digits, min, max) {
  min = min || Number.NEGATIVE_INFINITY;
  max = max || Number.POSITIVE_INFINITY;
  number = number < min ? min : number;
  number = number > max ? max : number;
  return Number(number.toFixed(digits === undefined ? 3 : digits));
}
*/
// import Hello from './components/Hello';
export default {
  name: "App",
  data: () => {
    return {
      test: "myTest",
      packagej,
      ioPackage: iopackage,
    };
  },
  filters: {
    nformat: (val, places, options) => {
      if (
        options === undefined &&
        (typeof places === "object" || typeof places === "string")
      ) {
        options = places;
        places = undefined;
      } else if (!options) options = {};
      else if (typeof options === "string" && places !== undefined)
        options = { postfix: options };
      if (typeof options === "string") {
        const match = options.match(/^([.,?]?)(\d+)?(\;?)(\-[^\+]+)?\+?(.*)$/);
        options = {};
        if (match) {
          if (match[2] === undefined && places === undefined) places = 0;
          else places = Number(match[2]);
          if (match[1]) options.decimalPoint = match[1];
          options.sepThousands = !!match[3];
          if (match[4] && match[4].startsWith("-"))
            options.prefix = match[4].slice(1);
          else options.prefix = "";
          options.postfix = match[5];
        }
      }
      if (places !== undefined) {
        if (!isNaN(Number(places))) places = Number(places);
      } else places = Number(options.digits);
      if (places === undefined || isNaN(places)) places = 0;
      if (options.digits && !isNaN(Number(options.digits)))
        places = Number(options.digits);
      if (options.decimalPoint === "?") {
        options.decimalPoint = mylang == "en" ? "." : ",";
      }
      val = Number(val);
      val = isNaN(val) ? "" : val.toFixed(places).toString();
      if (options.decimalPoint) val = val.replace(".", options.decimalPoint);
      if (options.sepThousands) {
        const del = options.decimalPoint === "," ? "." : ",";
        const dec = del === "," ? "." : ",";
        const spl = val.split(dec);
        val = spl[0].replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1" + del);
        if (spl[1]) val += dec + spl[1].replace(/(\d{3})(?=\d)/g, "$1" + del);
      }
      if (options.prefix) val = options.prefix + " " + val;
      if (options.postfix) val += " " + options.postfix;
      return val;
    },
  },
  methods: {
    remove(item) {
      this.selected.splice(this.selected.indexOf(item), 1);
      this.selected = [...this.selected];
    },
    numberFormat(val, ...args) {
      if (
        this.$options &&
        this.$options.filters &&
        this.$options.filters["nformat"]
      )
        return this.$options.filters["nformat"](val, ...args);
      else return val;
    },

    consoleLog(...args) {
      let s = "";
      args.map((l) => (s += l + " "));
      this.message += s + "<br>";
    },
    /*
    convCsv(data, options) {
      function splitCSV(str, delimiter, quotes) {
        //split the str first
        //then merge the elments between two double quotes
        delimiter = delimiter || ",";
        quotes = quotes || '"';
        var elements = str.split(delimiter);
        var newElements = [];
        for (var i = 0; i < elements.length; ++i) {
          if (elements[i].indexOf(quotes) >= 0) {
            //the left double quotes is found
            var indexOfRightQuotes = -1;
            var tmp = elements[i];
            //find the right double quotes
            for (var j = i + 1; j < elements.length; ++j) {
              if (elements[j].indexOf(quotes) >= 0) {
                indexOfRightQuotes = j;
                break;
              }
            }
            //found the right double quotes
            //merge all the elements between double quotes
            if (-1 != indexOfRightQuotes) {
              for (var j = i + 1; j <= indexOfRightQuotes; ++j) {
                tmp = tmp + delimiter + elements[j];
              }
              newElements.push(tmp);
              i = indexOfRightQuotes;
            } else {
              //right double quotes is not found
              newElements.push(elements[i]);
            }
          } else {
            //no left double quotes is found
            newElements.push(elements[i]);
          }
        }

        return newElements;
      }
      const { sep, lineSep, noHeader, quotes } = Object.assign(
        { sep: ",", lineSep: "\n", quotes: '"' },
        options || {}
      );
      data = data || "";
      const list = data.split(lineSep).map((i) => i.trim());
      const titles = splitCSV(list[0], sep, quotes).map((i, index) =>
        noHeader ? index : i.trim()
      );
      const res = {};
      for (let i = noHeader ? 0 : 1; i < list.length; i++) {
        const values = splitCSV(list[i], sep, quotes).map((i) => i.trim());
        for (let j = 0; j < titles.length; j++) {
          const name = titles[j];
          if (name) {
            if (!res[name]) res[name] = [];
            const item = res[name];
            const val = values[j];
            item[noHeader ? i : i - 1] =
              val === "0" || Number(val) ? Number(val) : val;
          }
        }
      }
      return res;
    },

    proxyAxios(url, always) {
      return axios({
        method: "get",
        url:
          process.env.IS_ELECTRON && !always
            ? url
            : "http://cors-anywhere.herokuapp.com/" + url,
        headers: { "Access-Control-Allow-Origin": true },
      });
    },
*/

    wait(time) {
      var timer;
      const that = this;
      return new Promise((res) => {
        if (!time || time < 0 || typeof time !== "number")
          return that.$nextTick(res);
        timer = setTimeout((_) => {
          timer = null;
          return res();
        }, time);
      });
    },

    pSequence(arr, promise, wait) {
      wait = wait || 0;
      if (!Array.isArray(arr) && typeof arr === "object")
        arr = Object.entries(arr);
      const res = [];
      const myPromise = (key) =>
        this.wait(wait).then((_) =>
          promise(key).then((r) => res[res.push(r) - 1])
        );
      return arr
        .reduce((p, x) => p.then((_) => myPromise(x)), Promise.resolve())
        .then((_) => res);
    },
  },

  computed: {},
  watch: {},

  mounted() {
    this.$i18n.locale = this.myLang;
    //   this.activeCountry = this.countryIndex["AT"];
  },

  created() {},
};
</script>
<style scoped.vue>
html {
  overflow-y: auto !important;
}

tr.alternate:nth-child(odd) {
  background: #e3f2fd;
}

td,
th,
th[role="columnheader"] {
  padding: 0 1px;
  border-left: 1px dotted #dddddd;
}
</style>
