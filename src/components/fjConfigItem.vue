<template>
  <v-flex v-if="cToolItem.type == 'text'" v-bind="attrs('html,text,label')">
    <div v-if="cToolItem.label" v-text="cToolItem.label" class="subtitle-2" />
    <div v-if="cToolItem.text" v-text="cToolItem.text" class="caption" />
    <div v-if="cToolItem.html" v-html="cToolItem.html" class="caption" />
  </v-flex>
  <v-text-field
    v-else-if="cToolItem.type == 'number'"
    dense
    v-bind="attrs('min,max')"
    v-model="cItem[cToolItem.value]"
  />
  <v-text-field
    v-else-if="cToolItem.type == 'string'"
    dense
    v-bind="attrs()"
    v-model="cItem[cToolItem.value]"
  />
  <v-checkbox
    v-else-if="cToolItem.type == 'checkbox' && cToolItem.label"
    dense
    v-model="cItem[cToolItem.value]"
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
    /*     disabled: {
      type: Boolean,
      default: false
    },
    */
  },
  //  methods: {},
  methods: {
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

    attrs(remove) {
      const rem = ["type", "value", "attrs", "min", "max"];
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
      const rules = nattr.rules;
      const nrules = [];
      if (rules && rules.length) {
        for (let i in rules) {
          let rule = rules[i];
          if (typeof rule == "function") nrules.push(rule);
          else if (typeof rule == "string" && rule.trim()) {
            rule = rule.trim();
            if (typeof this[rule] == "function")
              nrules.push(this[rule].bind(this));
            else
              nrules.push(
                new Function(
                  "$",
                  rule.startsWith("return ") || rule.startsWith("{")
                    ? rule
                    : `return (${rule})`
                )
              );
          }
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
