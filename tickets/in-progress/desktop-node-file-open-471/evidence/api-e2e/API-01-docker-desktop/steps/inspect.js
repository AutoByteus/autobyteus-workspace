// Inspect: every app window, which node it talks to, and what the Docker node's window shows (exploration only).
const wins = browser.contexts().flatMap(c => c.pages()).filter(p => p.url().includes('renderer/index.html'));
const out = [];
for (const w of wins) {
  const info = await w.evaluate(() => {
    const pinia = document.querySelector('#__nuxt')?.__vue_app__?.config?.globalProperties?.$pinia;
    const ctx = pinia?._s.get('windowNodeContext');
    const links = [...document.querySelectorAll('[data-event-monitor-file-action-control="true"]')].map(e => e.getAttribute('title'));
    return { hash: location.hash.slice(0, 160), embedded: ctx?.isEmbeddedWindow ?? null, rest: ctx?.getBoundEndpoints?.().rest ?? null,
      links, text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 900) };
  }).catch(e => ({ error: e.message }));
  out.push(info);
}
const win = wins.find((w, i) => out[i].embedded === false);
if (win) await win.screenshot({ path: '/tmp/abtest471/inspect.png' });
return out;
