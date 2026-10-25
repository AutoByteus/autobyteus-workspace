export default async (page) => page.evaluate(() => {
  const app = document.querySelector('#__nuxt')?.__vue_app__ ?? [...document.querySelectorAll('*')].find((el) => el.__vue_app__)?.__vue_app__;
  const pinia = app?.config.globalProperties.$pinia;
  const s = pinia?.state.value ?? {};
  const keys = Object.keys(s).filter((k) => /notif|update/i.test(k));
  return { marker: window.__apiE2eMarker ?? null, url: location.hash, stores: Object.fromEntries(keys.map((k) => [k, JSON.parse(JSON.stringify(s[k]))])) };
});
