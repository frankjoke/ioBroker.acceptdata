<template>
  <v-flex v-if="cToolItem.type == 'text'" v-bind="attrs('html,text,label')">
    <div v-if="cToolItem.label" v-text="cToolItem.label" class="subtitle-2" />
    <div v-if="cToolItem.text" v-text="cToolItem.text" class="caption" />
    <div v-if="cToolItem.html" v-html="cToolItem.html" class="caption" />
  </v-flex>
  <v-flex v-else-if="cToolItem.type == 'html'" v-bind="attrs('text,label')">
    <div v-if="cToolItem.label" v-text="cToolItem.label" class="subtitle-2" />
    <div
      v-if="Array.isArray(cToolItem.text)"
      v-html="cToolItem.text.join('<br>')"
      class="caption"
    />
    <div v-else v-html="cToolItem.text" class="caption" />
  </v-flex>
  <v-text-field
    v-else-if="cToolItem.type == 'number'"
    dense
    hide-details="auto"
    v-bind="attrs('min,max')"
    v-model="cItem[cToolItem.value]"
  />
  <v-text-field
    v-else-if="cToolItem.type == 'string'"
    dense
    hide-details="auto"
    v-bind="attrs()"
    v-model="cItem[cToolItem.value]"
  />
  <v-checkbox
    v-else-if="cToolItem.type == 'checkbox' && cToolItem.label"
    dense
    hide-details="auto"
    v-model="cItem[cToolItem.value]"
    v-bind="attrs()"
  />
  <v-select
    v-else-if="cToolItem.type == 'select'"
    :items="cToolItem.select"
    dense
    hide-details="auto"
    v-model="cItem[cToolItem.value]"
    v-bind="attrs()"
  />
  <v-textarea
    v-else-if="cToolItem.type == 'textarea'"
    style="font-family: monospace !important; font-size: 14px;"
    auto-grow
    row-height="15"
    hide-details="auto"
    :rows="cItem[cToolItem.value].split(`\n`).length"
    dense
    v-model="cItem[cToolItem.value]"
    v-bind="attrs()"
  />
  <v-combobox
    v-else-if="cToolItem.type == 'chips'"
    v-model="cItem[cToolItem.value]"
    v-bind="attrs()"
    :items="cToolItem.select || []"
    chips
    dense
    hide-details="auto"
    deletable-chips
    :search-input.sync="search"
    multiple
  />
  <fjConfigTable
    v-else-if="cToolItem.type == 'table'"
    :columns="cToolItem.items"
    :items="cItem[cToolItem.value]"
    v-bind="attrs()"
  />
  <v-simple-checkbox
    v-else-if="cToolItem.type == 'checkbox' && !cToolItem.label"
    v-model="cItem[cToolItem.value]"
    v-bind="attrs()"
  />
  <v-switch
    v-else-if="cToolItem.type == 'switch'"
    dense
    hide-details="auto"
    v-model="cItem[cToolItem.value]"
    v-bind="attrs()"
  />
  <div v-else v-bind="attrs()">
    {{ cToolItem }} {{ cToolItem.value ? cItem[cToolItem.value] : "" }}
  </div>
</template>

<script>
export default {
  name: "fjConfigItem",

  //  mixins: [attrsMixin],
  data() {
    //    return { my_attrs: "top,bottom,left,right" };
    return {
      //      myUid: "tooltipa_" + this._uid,
      search: null,
    };
  },
  props: {
    cToolItem: {
      type: Object,
      default: () => ({ type: "none" }),
    },
    cItem: {
      type: Object,
      default: () => ({}),
    },
    cTable: {
      type: Object,
      default: () => ({}),
    },
    /*     disabled: {
      type: Boolean,
      default: false
    },
    */
  },
  //  methods: {},
  methods: {
    removeChip(item) {
      this.cItem[this.cToolItem.value].splice(
        this.cItem[this.cToolItem.value].indexOf(item),
        1
      );
      //      this.chips = [...this.chips]
    },

    numberRule(val) {
      const n = Number(val);
      if (isNaN(n)) return this.$t("You can enter only a number here!");
      if (this.cToolItem.min != undefined && n < this.cToolItem.min)
        return this.$t("Number should not be lower than ") + this.cToolItem.min;
      if (this.cToolItem.max != undefined && n > this.cToolItem.max)
        return (
          this.$t("Number should not be bigger than ") + this.cToolItem.min
        );
      return true;
    },

    uniqueTableRule(val) {
      const { items, column } = this.cTable;
      const v = ("" + val).trim();
      const vp = column.value;
      const found = items.filter((i) => ("" + i[vp]).trim() == v);
      return (
        found.length <= 1 ||
        "This item can only be once per table in this field!"
      );
    },

    stringToArrayWith(item, value, what) {
      what = what || ",";
      if (typeof value[item.value] === "string") {
        const ret = value[item.value].split(",").map((i) => i.trim());
        if (ret.length == 1 && !ret[0]) ret.splice(0, 1);
        value[item.value] = ret;
      }
    },

    attrs(remove) {
      const rem = ["type", "value", "attrs", "min", "max", "convertold"];

      function makeFunction(rule, that, args) {
        that = that || {};
        if (typeof rule == "function") return rule;
        else if (typeof rule == "string" && rule.trim()) {
          rule = rule.trim();
          if (typeof that[rule] == "function") return that[rule].bind(that);
          else
            try {
              return new Function(
                ...args,
                rule.startsWith("return ") || rule.startsWith("{")
                  ? rule
                  : `return ${rule};`
              );
            } catch (e) {
              console.log(` error ${e} in function generation with: ${rule}`);
            }
        }
        return null;
      }

      if (remove) {
        if (typeof remove === "string")
          rem.push(...remove.split(",").map((i) => i.trim()));
        else if (Array.isArray(remove)) rem.push(...remove);
        // else
        //   this.$alert(
        //     "warning:using wrong attrs(arg):" + JSON.stringify(remove)
        //   );
      }
      const nattr = Object.assign(
        {},
        this.cToolItem.attrs ? this.cToolItem.attrs : { class: "pa-1" },
        this.cToolItem
      );
      if (
        this.cToolItem.convertold &&
        typeof this.cToolItem.convertold !== "function"
      )
        this.cToolItem.convertold = makeFunction(
          this.cToolItem.convertold,
          this,
          ["item", "value"]
        );

      if (typeof this.cToolItem.convertold == "function")
        try {
          this.cToolItem.convertold(this.cToolItem, this.cItem);
        } catch (e) {
          console.log(
            `error ${e} in conversion function of item ${JSON.stringify(
              this.cToolItem
            )}`
          );
        }
      const rules = nattr.rules;
      const nrules = [];
      if (rules && rules.length) {
        for (let i in rules) {
          const rule = makeFunction(rules[i], this, ["$"]);
          if (rule) nrules.push(rule);
        }
        nattr.rules = nrules;
      }
      for (let r of rem) delete nattr[r];
      for (let p of ["text", "label", "placeholder", "hint"])
        if (typeof nattr[p] == "string") nattr[p] = this.$t(nattr[p]);
      return nattr;
    },
  },
  //  created() {},
};
</script>

<style></style>
