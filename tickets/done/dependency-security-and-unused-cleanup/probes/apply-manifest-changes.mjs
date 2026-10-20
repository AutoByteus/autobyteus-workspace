// Applies the design's manifest edits (DEC-001 direct bumps, DEC-002, DEC-005 removals). Usage: node apply-manifest-changes.mjs <repoRoot> <electronVersion>
import fs from 'node:fs'; import path from 'node:path';
const [root, electronVersion] = process.argv.slice(2);
const edit = (rel, fn) => { const p = path.join(root, rel, 'package.json'); const raw = fs.readFileSync(p, 'utf8'); const m = JSON.parse(raw); fn(m); fs.writeFileSync(p, JSON.stringify(m, null, 2) + (raw.endsWith('\n') ? '\n' : '')); };
const drop = (m, sec, names) => { for (const n of names) { if (!(m[sec] && n in m[sec])) throw new Error(`${n} not in ${sec}`); delete m[sec][n]; } };
edit('autobyteus-web', (m) => {
  m.dependencies.tar = '^7.5.22';
  m.devDependencies.electron = electronVersion;
  drop(m, 'dependencies', ['chart.js', 'vue-chartjs', 'diff-match-patch', 'html2canvas', 'jsonrepair', 'markdown-it-katex', 'markdown-it-prism']);
  drop(m, 'devDependencies', ['nuxt-electron', '@vitejs/plugin-vue', 'concurrently', 'xmldom']);
});
edit('autobyteus-ts', (m) => { m.dependencies.undici = '^7.29.1'; drop(m, 'devDependencies', ['dotenv', 'ts-node']); });
for (const p of ['autobyteus-application-frontend-sdk', 'autobyteus-team-stream-contracts', 'autobyteus-agent-presentation-contracts', 'autobyteus-collaboration-stream-contracts'])
  edit(p, (m) => drop(m, 'devDependencies', ['@types/node']));
console.log('manifests edited');
