// Put the removed key back into records the server wrote, exactly where released writers stored it.
import fs from 'node:fs'; import path from 'node:path';
const [dataRoot, stateFile, manifestFile] = process.argv.slice(2);
const state = JSON.parse(fs.readFileSync(stateFile, 'utf8')).state;
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const pinned = new Map([[state.agentRuns[0], 'PRELOADED_ONLY'], [state.teamRuns[0], 'PRELOADED_ONLY'], [state.orgRuns[0], 'PRELOADED_ONLY'], [state.agentRuns[1], 'NONE'], [state.teamRuns[1], 'NONE'], [state.orgRuns[1], 'NONE']]);
const manifest = []; let alt = 0;
for (const file of walk(path.join(dataRoot, 'memory')).sort()) {
  const base = path.basename(file);
  if (!/^(run_metadata|team_run_execution_tree|agent_org_run_execution_tree)\.json$/.test(base)) continue;
  const runId = path.basename(path.dirname(file));
  const mode = pinned.get(runId) ?? (alt++ % 2 === 0 ? 'PRELOADED_ONLY' : 'NONE');
  const json = JSON.parse(fs.readFileSync(file, 'utf8')); let count = 0;
  if (base === 'run_metadata.json') { json.skillAccessMode = mode; count = 1; }
  else { const visit = (v) => { if (!v || typeof v !== 'object') return; if (Array.isArray(v)) return v.forEach(visit); for (const [k, c] of Object.entries(v)) { if ((k === 'launchConfiguration' || k === 'defaultLaunchConfiguration') && c && typeof c === 'object') { c.skillAccessMode = mode; count += 1; } else visit(c); } }; visit(json); }
  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
  manifest.push({ file: path.relative(dataRoot, file), mode, keysAdded: count });
}
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
console.log(`${manifest.length} record files rewritten; keys added: ${manifest.reduce((n, m) => n + m.keysAdded, 0)}`);
for (const m of manifest.filter((x) => pinned.has(path.basename(path.dirname(x.file))))) console.log(m.mode, m.keysAdded, m.file);
