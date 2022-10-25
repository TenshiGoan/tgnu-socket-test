import socketModule from "..";

export default defineNuxtConfig({
  modules: [socketModule],

  hooks: {
    "prepare:types"({ tsConfig }) {
      tsConfig.include.push("../../src/**/*");
    },
  },
});
