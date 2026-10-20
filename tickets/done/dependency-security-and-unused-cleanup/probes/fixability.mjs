// For each high/critical finding in a pnpm audit JSON: walk every path, take the direct parent's declared
// range for the vulnerable module (from the installed parent's package.json, or our importer's manifest),
// and check whether the newest npm version inside that range is patched.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const [auditPath, root] = process.argv.slice(2);
const require = createRequire(path.join(root, 'autobyteus-ts/package.json'));
const semver = require(fs.readdirSync(path.join(root,'node_modules/.pnpm')).filter(d=>/^semver@7/.test(d)).map(d=>path.join(root,'node_modules/.pnpm',d,'node_modules/semver')).at(-1));
const audit = JSON.parse(fs.readFileSync(auditPath,'utf8'));
const versionsCache = {};
const versionsOf = (m) => versionsCache[m] ??= JSON.parse(execFileSync('npm',['view',m,'versions','--json'],{encoding:'utf8'}));
const pnpmDir = path.join(root,'node_modules/.pnpm');
const storeDirs = fs.readdirSync(pnpmDir);
function manifestOf(name, version) {
  const key = name.replace('/', '+') + '@' + version;
  const d = storeDirs.find(x => x === key || x.startsWith(key + '_'));
  if (!d) return null;
  try { return JSON.parse(fs.readFileSync(path.join(pnpmDir, d, 'node_modules', name, 'package.json'),'utf8')); } catch { return null; }
}
const out = {};
for (const a of Object.values(audit.advisories)) {
  if (!['critical','high'].includes(a.severity)) continue;
  for (const f of a.findings) for (const p of f.paths) {
    const parts = p.split('>');
    const mod = parts.at(-1); const parentName = parts.at(-2);
    let range;
    if (parts.length === 2) { const man = JSON.parse(fs.readFileSync(path.join(root, parts[0], 'package.json'),'utf8')); range = {...man.dependencies, ...man.devDependencies, ...man.optionalDependencies}[mod]; }
    else {
      // resolve parent's version via the installed tree: find any store dir for parentName that depends on mod@f.version
      const cands = storeDirs.filter(x => x.startsWith(parentName.replace('/','+') + '@'));
      for (const c of cands) { const ver = c.slice(parentName.length+1).split('_')[0].split('(')[0]; const man = manifestOf(parentName, ver); const r = man && ({...man.dependencies, ...man.optionalDependencies, ...man.peerDependencies})[mod]; if (r && semver.satisfies(f.version, r)) { range = r; break; } }
    }
    const key = `${mod}@${f.version} <- ${parentName} (${range ?? '?'})`;
    if (out[key]) { out[key].adv.add(a.github_advisory_id); continue; }
    let best = null; try { best = range ? semver.maxSatisfying(versionsOf(mod), range) : null; } catch {}
    out[key] = { adv: new Set([a.github_advisory_id]), sev: a.severity, patched: a.patched_versions, best, path: parts.slice(0,3).join('>') };
  }
}
// a key is fixable in-range if `best` satisfies every advisory's patched range for that module/version
const byKey = {};
for (const a of Object.values(audit.advisories)) if (['critical','high'].includes(a.severity)) for (const f of a.findings) byKey[`${a.module_name}@${f.version}`] = [...(byKey[`${a.module_name}@${f.version}`]||[]), a.patched_versions];
for (const [k,v] of Object.entries(out).sort()) {
  const mv = k.split(' <- ')[0]; const pats = byKey[mv] || [];
  const ok = v.best && pats.every(pr => { try { return semver.satisfies(v.best, pr); } catch { return false; } });
  console.log(`${ok ? 'IN-RANGE' : 'NEEDS   '} ${k} -> newest in range ${v.best} | ${v.sev} x${v.adv.size} | via ${v.path}`);
}
