const all = browser.contexts().flatMap(c => c.pages());
const out = [];
for (const p of all) out.push({ url: p.url(), isApp: p === app, gql: await p.evaluate(() => performance.getEntriesByType('resource').map(e => e.name).filter(n => n.includes('/graphql')).slice(-1)[0]).catch(() => null) });
return out;
