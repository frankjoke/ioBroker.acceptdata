<template>
  <v-dialog
    v-model="dialog"
    :max-width="options.width"
    :style="{ zIndex: options.zIndex }"
    @keydown.esc="cancel"
  >
    <v-card>
      <v-toolbar dark :color="options.color" dense flat>
        <v-toolbar-title class="white--text" v-t="options.title" />
      </v-toolbar>
      <v-card-text
        v-show="!!options.message"
        class="pa-4"
        v-html="$t(options.message)"
      />
      <v-card-actions class="pt-0">
        <v-spacer></v-spacer>
        <v-btn :color="options.okColor" text @click.native="agree">
          <v-icon v-if="options.okIcon" left v-text="options.okIcon" />
          <span v-t="options.okText"></span>
        </v-btn>
        <v-btn :color="options.cancelColor" text @click.native="cancel">
          <span v-t="options.cancelText"></span>
          <v-icon v-if="options.cancelIcon" right v-text="options.cancelIcon" />
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
/**
 * Original from https://gist.github.com/eolant/ba0f8a5c9135d1a146e1db575276177d
 * Vuetify Confirm Dialog component
 *
 */

import Vue from "vue";

export default {
  data: () => ({
    dialog: false,
    resolve: null,
    options: {},
  }),
  props: {
    defaults: {
      type: Object,
      default: () => ({}),
    },
  },
  methods: {
    open(message, options) {
      const defaults = {
        color: "primary",
        cancelColor: "grey darken-1",
        okColor: "success darken-1",
        okText: "Yes",
        okIcon: "mdi-check",
        cancelIcon: "mdi-close",
        cancelText: "No",
        message: "",
        title: "",
        width: 390,
        zIndex: 200,
      };
      options = options || {};
      if (!options.title && message.indexOf("|") > 0) {
        const pos = message.indexOf("|");
        options.message = message.slice(pos + 1);
        const opts = message
          .slice(0, pos)
          .split(",")
          .map((i) =>
            i
              .trim()
              .split("=")
              .map(j => j.trim())
          );
        const cmap = Object.keys(defaults).map((i) => i.toLowerCase());
        let keys;
        for (keys of opts) {
          const key = keys[0],
            val = keys[1],
            keypos = cmap.indexOf(key.toLowerCase());
          if (key && keypos >= 0)
            options[Object.keys(defaults)[keypos]] =
              val === undefined ? true : !!Number(val) ? Number(val) : val;
        }
      } else options.message = message;

      if (!options.title) options.title = "Please confirm:";

      this.title = options.title;
      this.message = options.message;
      const myopts = Object.assign({}, defaults, this.defaults, options);

      this.options = Object.assign({}, this.options, myopts);
      this.dialog = true;
      return new Promise((resolve) => {
        this.resolve = resolve;
      });
    },
    agree() {
      this.$nextTick().then(_ => this.resolve(true));
      this.dialog = false;
    },
    cancel() {
      this.$nextTick().then(_ => this.resolve(false));
      this.dialog = false;
    },
  },
  created() {
    Vue.prototype.$confirm = this.open.bind(this);
  },
};
</script>
