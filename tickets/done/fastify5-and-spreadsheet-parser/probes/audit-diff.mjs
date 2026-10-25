// node audit-diff.mjs base.json branch.json -> advisories removed / added (by package + GHSA id), with severity
import fs from 'node:fs';
const load = f => new Map(Object.values(JSON.parse(fs.readFileSync(f,'utf8')).advisories||{}).map(a => [`${a.module_name} ${a.github_advisory_id}`, `${a.severity} ${a.module_name}@${(a.findings||[]).map(x=>x.version).join(',')} ${a.github_advisory_id}`]));
const [b, n] = [load(process.argv[2]), load(process.argv[3])];
console.log('REMOVED (in base, not in branch):'); for (const [k,v] of b) if (!n.has(k)) console.log('  '+v);
console.log('ADDED (in branch, not in base):'); for (const [k,v] of n) if (!b.has(k)) console.log('  '+v);
