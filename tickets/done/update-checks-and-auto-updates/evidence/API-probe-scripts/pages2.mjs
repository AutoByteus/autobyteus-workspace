export default async (page) => { const all = page.context().browser().contexts().flatMap((c) => c.pages());
  return Promise.all(all.map(async (p, i) => ({ i, url: p.url().replace(/^.*index\.html/, ''), node: await p.evaluate(async () => { try { const r = await window.electronAPI?.getWindowContext?.(); return r ?? null; } catch (e) { return String(e); } }), title: await p.title() }))); };
