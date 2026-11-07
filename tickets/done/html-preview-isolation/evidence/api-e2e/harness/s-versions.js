const out = [];
for (const f of page.frames()) { if (f === page.mainFrame()) continue; try { out.push({ url: f.url().replace(/agent_ws_[0-9a-f]+/, 'agent_ws_…'), version: await f.evaluate(() => document.getElementById('version')?.textContent ?? null), origin: await f.evaluate(() => self.origin) }); } catch (e) { out.push({ url: f.url(), error: String(e).slice(0, 80) }); } }
const iframes = await page.evaluate(() => [...document.querySelectorAll('iframe')].map(i => ({ src: (i.getAttribute('src') || '').replace(/agent_ws_[0-9a-f]+/, 'agent_ws_…'), sandbox: i.getAttribute('sandbox'), visible: !!(i.offsetWidth || i.offsetHeight) })));
if (args[0]) await page.screenshot({ path: args[0] });
return { at: new Date().toISOString(), frames: out, iframes };
