<template>
  <v-col v-if="nCols" :cols="nCols" class="pa-1">
    <fjConfigRuler
      v-for="(item, index) in nRuler"
      v-bind:key="index"
      :ruler="item"
    />
    <fjConfigItem v-if="cToolItem.type" :cToolItem="nToolItem" :cItem="cItem" />
  </v-col>
  <span v-else>
    <fjConfigRuler
      v-for="(item, index) in nRuler"
      v-bind:key="index"
      :ruler="item"
    />
    <fjConfigItem v-if="cToolItem.type" :cToolItem="nToolItem" :cItem="cItem" />
  </span>
</template>

<script>
import Vue from "vue";

import fjConfigItem from "./fjConfigItem";
import fjConfigRuler from "./fjConfigRuler";
import fjConfigTable from "./fjConfigTable";

Vue.component("fjConfigItem", fjConfigItem);
Vue.component("fjConfigRuler", fjConfigRuler);
Vue.component("fjConfigTable", fjConfigTable);

export default {
  name: "fjConfigElement",
  //  mixins: [attrsMixin],
  data() {
    return {
      nToolItem: {},
      nRuler: [],
      nCols: 0,
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
  },
  //  methods: {},
  //  computed: {},
  created() {
    const nitem = Object.assign({}, this.cToolItem);
    let { ruler, cols, rcols } = nitem;
    delete nitem.ruler;
    delete nitem.cols;
    this.nToolItem = nitem;
    this.nCols = cols;
    ruler =
      ruler &&
      ruler.split("|").map((item) => {
        item =
          (item &&
            item
              .trim()
              .split("=")
              .map((i) => i.trim())) ||
          [];
        if (item.length == 1) item.push(1);
        return item;
      });
    this.nRuler = ruler || [];
  },
};
</script>

<style></style>
