/**
 * The demo build's first client plugin (autobyteus-279), registered by nuxt.config.ts only when
 * AUTOBYTEUS_DEMO_BUILD=1 (Nuxt auto-registers top-level plugins/, so this file lives in demo/plugins/). It must run before
 * 20.windowNodeBootstrap, 21.mobileRemoteAccessBootstrap and 30.apollo; `enforce: 'pre'` places it ahead of them.
 */
import { bootDemo } from '../demoBoot';

export default defineNuxtPlugin({
  name: 'autobyteus-demo-boot',
  enforce: 'pre',
  setup() {
    if (!import.meta.client) return;
    bootDemo();
  },
});
