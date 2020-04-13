<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <div class="d-flex align-center">
        <v-img
          alt="Coronafj Logo"
          class="shrink mr-2"
          contain
          src="../public/coronafj.png"
          transition="scale-transition"
          width="35"
        />
        <span>Private Corona App (v{{ version() }}) @fj</span>
      </div>

      <v-spacer></v-spacer>
    </v-app-bar>

    <v-content class="flex-wrap">
      <v-chip-group :value="selected" multiple mandatory column class="ma-3">
        <v-chip
          v-for="item in selected"
          :key="item.CountryCode"
          small
          close
          @click.stop.prevent="setCountry(item.CountryCode)"
          @click:close="remove(item)"
          ><v-avatar left>
            <v-img
              v-if="item && item.CountryCode"
              :src="
                'https://www.countryflags.io/' +
                item.CountryCode +
                '/flat/64.png'
              "
            ></v-img>
          </v-avatar>
          <strong>{{ item.CountryCode }}</strong
          >&nbsp; <span>({{ item.alt }})</span></v-chip
        >
      </v-chip-group>
      <v-combobox
        class="pa-2"
        v-model="selected"
        :items="countryCodes"
        :hint="selectedShort.join(', ')"
        item-text="CountryName"
        item-value="CountryCode"
        persistent-hint
        :search-input.sync="csearch"
        :label="$t('Select countries for list:')"
        multiple
        prepend-icon="mdi-filter-outline"
        return-object
        :filter="filterItem"
      >
        <template v-slot:selection=""
          ><!--  remove chips from combobox because they are handles separately!
 --></template
        >
      </v-combobox>
      <v-divider class="my-1" />
      <v-data-table
        :headers="histHeaders"
        :items="histList"
        dense
        hide-default-footer
        class="elevation-2 pa-1"
        :items-per-page="100"
        must-sort
        fixed-header
        :sort-by.sync="sortBy"
      >
        <template v-slot:item="{ item, headers }">
          <tr
            class="alternate"
            @click.stop.prevent="setCountry(item.alpha2Code)"
          >
            <td
              class="px-1"
              v-for="column in headers"
              :key="column.value"
              :class="
                { center: 'text-center', end: 'text-right' }[column.align] ||
                'text-start'
              "
              v-text="
                column.format
                  ? numberFormat(item[column.value], column.format)
                  : item[column.value]
              "
            />
          </tr>
        </template>
      </v-data-table>
      <v-divider class="my-1" ref="focus" />
      <div class="subtitle-2" style="display: flex;">
        <v-img
          v-if="ccountry && ccountry.alpha2Code"
          max-width="24"
          :src="
            'https://www.countryflags.io/' +
            ccountry.alpha2Code +
            '/flat/64.png'
          "
        ></v-img
        ><span class="ml-1"
          >{{ ccountry && ccountry.alpha2Code }} /
          {{ ccountry && ccountry.alt }}:</span
        >
      </div>
      <div class="body-2">
        Total cases:&nbsp;{{ current.confirmed | nformat("?;") }}, Total
        recovered:&nbsp;{{ current.recovered | nformat("?;") }}, Total
        deaths:&nbsp;{{ current.deaths | nformat("?;") }}, Current sick:&nbsp;{{
          current.active | nformat("?;")
        }}, Recovery rate:&nbsp;{{ current.recovRate | nformat("?2;%") }}, Death
        rate:&nbsp;{{ current.deathRate | nformat("?2;%") }},
        {{ $t("DeathMillion") }}:&nbsp;{{
          current.deathPerMillion | nformat("?2;")
        }}, Double in days last:&nbsp;{{
          current.double1 | nformat("?2;")
        }}
        average3:&nbsp;{{ current.double3 | nformat("?2;") }}, New rate
        last:&nbsp;{{ current.pconf | nformat("?2;%") }} average3:&nbsp;{{
          current.pconf3 | nformat("?2;%")
        }}, New to recovered+death rate average3:&nbsp;{{
          current.confrate | nformat("?1;%")
        }}, Population:&nbsp;{{ current.population | nformat("?;") }},
        Sick/Million:&nbsp;{{
          ((current.confirmed * 1000000) / current.population) | nformat("?3;")
        }}, Sick/Tested:&nbsp;{{
          ((current.confirmed * 100.0) / current.tests) | nformat("?3;%")
        }},
      </div>
      <v-divider class="my-1" />
      <!--       <vue-chart
        class="pa-1"
        v-if="chart"
        style="position: relative; height: 40vh; width: 100%;"
        :data="timeData"
        :options="timeOptions"
        :update-config="{ duration: 500, easing: 'easeInOutCirc' }"
        type="line"
      />
 -->
    </v-content>
  </v-app>
</template>

<script>
import axios from "axios";
import countries from "./assets/countries.json";
import packagej from "../package.json";

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
      //      myData: myData,
      chart: false,
      histAt: null,
      timeData: null,
      timeOptions: null,
      activeCountry: "",
      message: "",
      searchCountry: "",
      aCountries: [],
      myLang: mylang,
      countries: countries,
      countryIndex: {},
      ccountry: null,
      csearch: null,
      current: { confirmed: 0 },
      selected: [],
      sortBy: ["sickPerMillion"],
      expanded: 0,
      selectedShort: [],
      histList: [],
      // tmp: {},
      // tmp1: {},
      // tmp2: {},
      histHeaders: [
        {
          text: "Country",
          align: "start",
          sortable: false,
          value: "alt",
        },
        // {
        //   text: "Sick%",
        //   align: "end",
        //   sortable: true,
        //   value: "pconf",
        //   format: "?2;",
        // },
        {
          text: "Sick/M",
          align: "end",
          sortable: true,
          value: "sickPerMillion",
          format: "?1;",
        },
        {
          text: "Recovered%",
          align: "end",
          sortable: true,
          value: "recovRate",
          format: "?2;",
        },
        {
          text: "Critical%",
          align: "end",
          sortable: true,
          value: "pcritical",
          format: "?2;",
        },
        {
          text: "Deaths/M",
          align: "end",
          sortable: true,
          value: "deathPerMillion",
          format: "?1;",
        },
        {
          text: "Deaths%",
          align: "end",
          sortable: true,
          value: "deathRate",
          format: "?2;",
        },
        {
          text: "Tests/M",
          align: "end",
          sortable: true,
          value: "mtests",
          format: "?;",
        },
        {
          text: "sick/Tested%",
          align: "end",
          sortable: true,
          value: "stests",
          format: "?2;",
        },
        {
          text: "New%",
          align: "end",
          sortable: true,
          value: "pconf3",
          format: "?2;",
        },
        {
          text: "new/ (rec+dead)",
          align: "end",
          sortable: true,
          value: "confrate",
          format: "?1;",
        },
        {
          text: "Double in",
          align: "end",
          sortable: true,
          value: "double3",
          format: "?1;",
        },
        {
          text: "Recovered/day",
          align: "end",
          sortable: true,
          value: "treco3",
          format: "?;",
        },
        {
          text: "Sick",
          align: "end",
          sortable: true,
          value: "confirmed",
          format: "?;",
        },
        {
          text: "Recovered",
          align: "end",
          sortable: true,
          value: "recovered",
          format: "?;",
        },
        {
          text: "Deaths",
          align: "end",
          sortable: true,
          value: "deaths",
          format: "?;",
        },
        {
          text: "Tests",
          align: "end",
          sortable: true,
          value: "tests",
          format: "?;",
        },
        {
          text: "Population",
          align: "end",
          sortable: true,
          value: "population",
          format: "?;",
        },
      ],
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
    setCountry(item) {
      //      this.mprops.disabled = true;
      // console.log(item, select && select(), this);
      // this.$refs.focus.$el.click()
      this.activeCountry = this.countryCodes.filter(
        (i) => i.CountryCode == item
      )[0];
      //      setTimeout((_) => (this.mprops.disabled = false), 100);
      //      this.$nextTick().then();
    },

    filterItem(item, qText, iText) {
      const s = qText.toLowerCase();
      const t = iText.toLowerCase() + " " + item.CountryCode.toLowerCase();
      //      console.log("filter:", qText, " itext:", iText, "item:", item);
      return t.indexOf(s) >= 0;
    },

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

    version() {
      //      console.log(process.env);
      return packagej.version;
    },

    consoleLog(...args) {
      let s = "";
      args.map((l) => (s += l + " "));
      this.message += s + "<br>";
    },

    calcHistory(history, country) {
      function sq3m(e, key, i, n) {
        const ci = e[key];
        let cs = ci * ci;
        let x = 1;
        if (ci == Infinity) x = cs = 0;

        while (--n >= 0 && --i >= 0)
          if (Number(history[i][key] != Infinity)) {
            x++;
            cs += Math.pow(Number(history[i][key]), 2);
          }
        return Math.sqrt(cs / x);
      }

      while (
        (history.length > 1 &&
          !history[0].confirmed &&
          !history[1].confirmed) ||
        history[0].date < "2020-02-15T00:00:00"
      )
        history.shift();
      for (let i = 0; i < history.length; i++) {
        const item = history[i];
        // calculate all new values
        //        item.active = item.confirmed - item.deaths - item.recovered;
        item.mtests = (item.tests * 1000000.0) / country.population;
        if (item.tests) item.stests = (item.confirmed * 100.0) / item.tests;
        item.pcritical = (item.critical * 100.0) / item.active;
        item.tconf = item.confirmed - (i > 0 ? history[i - 1].confirmed : 0);
        item.tconf3 = sq3m(item, "tconf", i, 4);
        item.tdeaths = item.deaths - (i > 0 ? history[i - 1].deaths : 0);
        item.tdeaths3 = sq3m(item, "tdeaths", i, 4);
        item.treco = item.recovered - (i > 0 ? history[i - 1].recovered : 0);
        item.treco3 = sq3m(item, "treco", i, 4);
        item.pconf = (item.active && (100.0 * item.tconf) / item.active) || 0;
        item.pconf3 = sq3m(item, "pconf", i, 4);
        if (item.pconf3 > 60) item.pconf3 = null;
        let c =
          i < 2
            ? 0
            : Math.log2(2) /
              (Math.log2(item.confirmed) - Math.log2(history[i - 2].confirmed));
        if (c == Infinity) c = item.y ? Math.log2(e.y) : 0;
        item.double1 = c;
        item.double3 = sq3m(item, "double1", i, 3);
      }
      return history;
    },

    calcLast(history, country) {
      let last = { confirmed: 0 };
      if (history && history.length) {
        last = JSON.parse(JSON.stringify(history[history.length - 1]));
        last.deathRate = (100.0 * last.deaths) / last.confirmed;
        last.recovRate = (100.0 * last.recovered) / last.confirmed;
        last.confrate = (100.0 * last.tconf3) / (last.treco3 + last.tdeaths3);
        last.double1 = last.double1;
        last.double3 = last.double3;
        last.pconf = last.pconf;
        last.pconf3 = last.pconf3;
        last.population = country.population;
        last.sickPerMillion = (last.confirmed * 1000000) / country.population;
        last.deathPerMillion = (last.deaths * 1000000) / country.population;
      }
      return last;
    },
    /*     getColor(kp) {
      kp = Number(kp.replace(",", "."));
      const kpa = this.myData.kpmd;
      if (kp > kpa) return "red lighten-4";
      else if (kp < kpa / 2) return "green lighten-4";
      else return "orange lighten-4";
    },
 */
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
    async getCountry(code) {
      function makeRec(i) {
        const rec = {
          date: i.day,
          deaths: i.deaths.total,
          tdeasths: Number(i.deaths.new),
          confirmed: i.cases.total,
          recovered: i.cases.recovered,
          critical: i.cases.critical,
          active: i.cases.active,
          tconf: Number(i.cases.new),
        };
        if (i.tests.total) rec.tests = i.tests.total;
        return rec;
      }
      if (myCache[code]) return myCache[code];
      const country = this.countryIndex[code] && this.countryIndex[code].bname;
      const chist = [];
      if (!country)
        return console.log("Error: Cannot load history data for:", code), null;
      let res = null;
      try {
        res = await axios(
          "https://covid-193.p.rapidapi.com/history?country=" + country,
          {
            method: "GET",
            headers: {
              "x-rapidapi-host": "covid-193.p.rapidapi.com",
              "x-rapidapi-key":
                "f15ec2b43amshcdf31a3383ec09dp1c4144jsn44f08110d1c8",
            },
          }
        );
        res = res.data;
        res.country = this.countryIndex[code];
        const hist = res.response;
        let day = "";
        for (const i of hist) {
          if (i.day != day) {
            day = i.day;
            chist.unshift(makeRec(i));
          }
        }
        if (day > "2020-02-22") {
          let ret = null;
          try {
            ret = await axios.get(
              "https://api.smartable.ai/coronavirus/stats/" + code,
              {
                headers: {
                  "Subscription-Key": "3009d4ccc29e4808af1ccc25c69b4d5d",
                },
              }
            );
            ret = ret.data.stats.history;
            //            console.log(ret);
            for (let i = ret.length; i > 0; --i) {
              const f = ret[i - 1];
              f.date = f.date.slice(0, 10);
              f.active = f.confirmed - f.deaths - f.recovered;
              //              console.log(i, f);
              if (f.date > "2020-02-21" && f.date < day) chist.unshift(f);
            }
          } catch (e) {
            this.consoleLog("Error get additional country data for", code, e);
          }
        }
      } catch (e) {
        this.consoleLog("Error get country data for", code, e);
        return null;
      }
      //      console.log(chist);
      res.history = this.calcHistory(chist, res.country);
      res.current = this.calcLast(res.history, res.country);
      myCache[code] = res;
      return res;
    },

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

  computed: {
    countryCodes() {
      return this.countries
        .map((c) => {
          const ret = {
            CountryCode: c.alpha2Code,
            CountryName: c.aname || c.name,
            aname: c.aname || c.name,
            bname: c.bname || c.name,
          };
          c.alt = c.name;
          let alt = "";
          if (c.translations && c.translations[this.myLang])
            alt = c.translations[this.myLang];
          else if (c.nativeName) alt = c.nativeName;
          if (alt) {
            c.alt = alt;
            ret.alt = alt;
            ret.ori = ret.CountryName;
            ret.CountryName += " / " + alt;
          }
          return ret;
        })
        .sort(function (a, b) {
          if (a.CountryName < b.CountryName) {
            return -1;
          }
          if (a.CountryName > b.CountryName) {
            return 1;
          }
          return 0;
        });
    },
  },
  watch: {
    selected(newC, oldC) {
      const newcf = newC.filter((i) => typeof i === "object");
      if (newcf.length != newC.length) {
        this.wait(10).then((_) => (this.selected = newcf));
      } else {
        this.selectedShort = newC.map((i) => i.CountryCode);
        newC = newC.map((i) => i.CountryCode);
        oldC = oldC.map((i) => i.CountryCode);
        //        console.log(newC, oldC, this.selectedShort);
        while (newC.length && oldC.length && newC[0] == oldC[0])
          newC.shift(oldC.shift());
        //        console.log(newC, oldC, this.selectedShort);
        if (newC.length != 1 || oldC.length != 0) {
          newC = this.selectedShort;
          this.histList = [];
        }
        this.chart = false;
        return this.wait(10).then((_) =>
          this.pSequence(
            newC,
            (code) =>
              this.getCountry(code).then((i) =>
                i
                  ? this.histList.push(Object.assign({}, i.country, i.current))
                  : null
              ),
            10
          ).then((_) => {
            //          this.histList = list;
            return this.wait(10).then((_) => {
              this.chart = true;
              if (newC.length == 1 && oldC.length == 0)
                this.activeCountry = this.countryCodes.filter(
                  (i) => i.CountryCode == newC[0]
                )[0];
              this.$forceUpdate();
            });
          })
        );
      }
    },

    activeCountry(newC) {
      if (!newC) return {};
      this.ccountry = this.countryIndex[newC.CountryCode];
      return this.getCountry(newC.CountryCode).then((res) =>
        res ? (this.histAt = res) : null
      );
    },

    histAt(newH) {
      function hexToRGB(h, e) {
        e = e ? "" : "," + +e;
        let r = 0,
          g = 0,
          b = 0;

        // 3 digits
        if (h.length == 4) {
          r = "0x" + h[1] + h[1];
          g = "0x" + h[2] + h[2];
          b = "0x" + h[3] + h[3];

          // 6 digits
        } else if (h.length == 7) {
          r = "0x" + h[1] + h[2];
          g = "0x" + h[3] + h[4];
          b = "0x" + h[5] + h[6];
        }

        return "rgb(" + +r + "," + +g + "," + +b + e + ")";
      }

      const colors = [
        "#C2185B",
        "#1565C0",
        "#00796B",
        "#FFEA00",
        "#F57C00",
        "#5D4037",
        "#455A64",
        "#64DD17",
      ];

      const country = newH && newH.country;
      const history = newH.history;
      this.current = newH.current;
      const labels = [];
      let datasets = [];
      const timeFormat = "YYYY-MM-DD HH:mm";
      const options = {
        title: {
          text: "Covid cases for " + country,
        },
        maintainAspectRatio: false,
        tooltips: {
          mode: "index",
        },
        scales: {
          xAxes: [
            {
              type: "time",
              time: {
                parser: timeFormat,
                displayFormats: {
                  day: "ddd MMM D",
                  hour: "ddd MMM D",
                }, // round: 'day'
                tooltipFormat: "ddd ll",
              },
              // scaleLabel: {
              //   display: false,
              //   labelString: "Date",
              // },
            },
          ],
          yAxes: [],
        },
      };
      //      this.consoleLog("His data loaded! for:", country || "unknown");
      if (country && history.length) {
        const example = history[0];
        const series = [];
        const axes = {
          tconf3: "new|log2|/day",
          confirmed: "sick total|log1|total",
          double3: "toDouble|n5|days",
          pconf3: "new %|perc|",
          active: "sick actual|log1|total",
          recovered: "recovered|log1|total",
          critical: "critical|log2|/day",
          treco3: "recovered|log2|/day",
          tdeaths: "died|log2|/day",
        };
        const naxes = {};
        let posit = false;
        const yAxes = [];
        for (const n of Object.keys(axes)) {
          const an = axes[n].split("|");
          const a = an[1];
          const se = {
            name: n,
            label: an[0] + (an[2] ? "-" + an[2] : ""),
            yAxisID: a,
            data: [],
            fill: false,
            borderColor: hexToRGB(colors[series.length % colors.length], 0.9),
          };
          se.backgroundColor = se.borderColor;
          series.push(se);
          if (!naxes[a]) {
            const nax = {
              id: a,
              position: (posit = !posit) ? "left" : "right",
              type: a.startsWith("log") ? "logarithmic" : "linear",
              scaleLabel: {
                labelString: an[2],
                display: a != "perc",
              },
              ticks: {
                fontColor: "#202020",
                fontSize: 14,
                callback:
                  a == "perc"
                    ? function (value, index, values) {
                        return (
                          "    ".slice(0, 4 - value.toString().length) +
                          value +
                          " %"
                        );
                      }
                    : (v) => v,
                //           beginAtZero: true,
              },
            };
            naxes[a] = nax;
            yAxes.push(nax);
          }
          //          }
        }
        for (let i = 0; i < history.length; i++) {
          const item = history[i];
          labels.push(new Date(item.date));
          let s = 0;
          for (const n of Object.keys(axes)) series[s++].data.push(item[n]);
        }
        datasets = series;
        options.scales.yAxes = yAxes;
        this.timeOptions = options;
        this.timeData = { labels, datasets };
      }
    },
  },

  mounted() {
    //    console.log("Mounted:", this.$t);
    /*     
    axios(
      "https://coronavirus-monitor.p.rapidapi.com/coronavirus/cases_by_particular_country.php?country=Austria",
      {
        method: "GET",
        headers: {
          "x-rapidapi-host": "coronavirus-monitor.p.rapidapi.com",
          "x-rapidapi-key":
            "f15ec2b43amshcdf31a3383ec09dp1c4144jsn44f08110d1c8",
        },
      }
    )
      .then(
        (response) => this.wait(10, (this.tmp = response.data)),
        (err) => console.log(err)
      )
      .then((_) => {
        return axios(
          "https://coronavirus-monitor.p.rapidapi.com/coronavirus/latest_stat_by_country.php?country=Austria",
          {
            method: "GET",
            headers: {
              "x-rapidapi-host": "coronavirus-monitor.p.rapidapi.com",
              "x-rapidapi-key":
                "f15ec2b43amshcdf31a3383ec09dp1c4144jsn44f08110d1c8",
            },
          }
        )
          .then(
            (response) => this.wait(10, (this.tmp1 = response.data)),
            (err) => console.log(err)
          )
          .then((_) =>
            axios("https://covid-193.p.rapidapi.com/history?country=austria", {
              method: "GET",
              headers: {
                "x-rapidapi-host": "covid-193.p.rapidapi.com",
                "x-rapidapi-key":
                  "f15ec2b43amshcdf31a3383ec09dp1c4144jsn44f08110d1c8",
              },
            })
              .then((response) => {
                console.log((this.tmp2 = response.data));
              })
              .catch((err) => {
                console.log(err);
              })
          );
      });
 */
    this.$i18n.locale = this.myLang;
    //   this.activeCountry = this.countryIndex["AT"];
  },

  created() {
    this.countries.map((i) => (this.countryIndex[i.alpha2Code] = i));
    let mcountries = this.countries;
    return axios(
      "https://coronavirus-monitor.p.rapidapi.com/coronavirus/affected.php",
      {
        method: "GET",
        headers: {
          "x-rapidapi-host": "coronavirus-monitor.p.rapidapi.com",
          "x-rapidapi-key":
            "f15ec2b43amshcdf31a3383ec09dp1c4144jsn44f08110d1c8",
        },
      }
    )
      .then(
        (response) => {
          const data = response.data;
          this.aCountries = data.affected_countries;
          const nfound = [];
          const res = [];
          for (const c of data.affected_countries) {
            let found = false;
            for (const cc of mcountries) {
              if (
                c == cc.name ||
                c == cc.aname ||
                c == cc.alpha3Code ||
                cc.altSpellings.indexOf(c) >= 0
              ) {
                cc.aname = c;
                found = true;
                res.push(cc);
                break;
              }
            }
            if (!found) nfound.push(c);
          }
          //          mcountries = res;
          this.aCountries = nfound;
        },
        (err) => console.log(err)
      )
      .then((_) =>
        axios("https://covid-193.p.rapidapi.com/countries", {
          method: "GET",
          headers: {
            "x-rapidapi-host": "covid-193.p.rapidapi.com",
            "x-rapidapi-key":
              "f15ec2b43amshcdf31a3383ec09dp1c4144jsn44f08110d1c8",
          },
        })
          .then((response) => {
            const c2 = response.data.response;
            const nfound = [];
            const res = [];
            for (const cx of c2) {
              let found = false;
              const c = cx.replace(/-/g, " ").trim();
              for (const cc of mcountries) {
                if (
                  c == cc.name ||
                  c == cc.aname ||
                  cx == (cc.bname && cc.bname.trim()) ||
                  c == cc.bname ||
                  c == cc.alpha3Code ||
                  cc.altSpellings.indexOf(c) >= 0
                ) {
                  cc.bname = cx;
                  found = true;
                  res.push(cc);
                  break;
                }
              }
              if (!found) nfound.push(cx);
            }
            this.countries = res;
            this.aCountries = nfound;
            this.wait(10).then(() => {
              this.selected = this.countryCodes.filter(
                (i) =>
                  //                  "AT, DE"
                  //                  "AT, CH, DE, BE, CN, DK, FI, FR, IT, NL, NO, ES, PT, SE, GB, US"
                  "AT, BE, CH, CN, DE, DK, ES, FI, FR, GB, IT, NL, NO, PT, SE, US"
                    .split(",")
                    .map((i) => i.trim())
                    .indexOf(i.CountryCode) >= 0
              );
              this.$nextTick().then((_) =>
                this.$forceUpdate((this.activeCountry = this.selected[0]))
              );
            });
            //            console.log("countries2", res);
          })
          .catch((err) => {
            console.log(err);
          })
      );
  },
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
