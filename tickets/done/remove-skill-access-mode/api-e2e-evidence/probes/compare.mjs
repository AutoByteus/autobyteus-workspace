import fs from 'node:fs';
const load = (f, root) => { const r = JSON.parse(fs.readFileSync(f,'utf8')); const m = new Map(); const files = new Map();
  for (const tf of r.testResults) { const name = tf.name.replace(root,''); files.set(name, {status: tf.status, message: (tf.message||'').split('\n')[0]});
    for (const t of tf.assertionResults) m.set(name+' :: '+t.fullName, {status: t.status, msg: (t.failureMessages?.[0]||'').split('\n')[0].replace(/\x1b\[[0-9;]*m/g,'')}); }
  return {r, m, files}; };
const [bf, hf, broot, hroot] = process.argv.slice(2);
const b = load(bf, broot), h = load(hf, hroot);
const c = (x) => `${x.r.numTotalTests} total, ${x.r.numPassedTests} passed, ${x.r.numFailedTests} failed, ${x.r.numPendingTests} skipped; files ${x.r.numTotalTestSuites}`;
console.log('base  :', c(b)); console.log('branch:', c(h));
const out = {branchOnlyFail: [], baseOnlyFail: [], bothFailDifferentMsg: [], newTests: [], removedTests: [], fileLevel: []};
for (const [k, v] of h.m) { const o = b.m.get(k); if (!o) { out.newTests.push(`${v.status} ${k}`); continue; }
  if (v.status==='failed' && o.status!=='failed') out.branchOnlyFail.push(`${k} :: ${v.msg}`);
  if (v.status!=='failed' && o.status==='failed') out.baseOnlyFail.push(`${k} :: ${o.msg}`);
  if (v.status==='failed' && o.status==='failed' && v.msg.replace(/\d+/g,'N')!==o.msg.replace(/\d+/g,'N')) out.bothFailDifferentMsg.push(`${k}\n   base:   ${o.msg}\n   branch: ${v.msg}`); }
for (const [k, v] of b.m) if (!h.m.has(k)) out.removedTests.push(`${v.status} ${k}`);
for (const [k, v] of h.files) { const o = b.files.get(k); if (!o) out.fileLevel.push(`branch-only file ${k} ${v.status}`); else if (o.status!==v.status) out.fileLevel.push(`${k}: base ${o.status} / branch ${v.status} ${v.message}`); }
for (const [k] of b.files) if (!h.files.has(k)) out.fileLevel.push(`base-only file ${k}`);
for (const [k, v] of Object.entries(out)) { console.log(`\n== ${k}: ${v.length}`); for (const line of v.slice(0, 60)) console.log('  '+line.slice(0,420)); }
