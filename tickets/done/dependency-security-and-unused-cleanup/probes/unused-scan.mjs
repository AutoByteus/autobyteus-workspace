// Lead finder: for every workspace package, list declared deps with no reference in that package's own
// files (source, tests, scripts, configs), apart from package.json. References counted:
//  - the package name as a module specifier: 'name' "name" `name` or 'name/...'  (import/require/config/vi.mock)
//  - a binary the dependency provides, used in package.json scripts or shell/yaml files
//  - for @types/x: a reference to x
// Usage: node unused-scan.mjs <repoRoot>
import fs from 'node:fs'; import path from 'node:path';
const root = process.argv[2];
const pkgs = ['.', 'autobyteus-ts','autobyteus-server-ts','autobyteus-web','autobyteus-message-gateway',
  'autobyteus-application-sdk-contracts','autobyteus-application-backend-sdk','autobyteus-application-frontend-sdk',
  'autobyteus-application-devkit','autobyteus-team-stream-contracts','autobyteus-agent-presentation-contracts',
  'autobyteus-collaboration-stream-contracts', ...fs.readdirSync(path.join(root,'applications')).map(a=>'applications/'+a)];
const SKIP = new Set(['node_modules','dist','.nuxt','.output','tickets','electron-dist','dist-electron','coverage','.git','build-output','resources','test-results','android','ios']);
const EXT = /\.(ts|tsx|mts|cts|js|mjs|cjs|vue|json|ya?ml|sh|toml|html|css|scss|md)$|(^|\/)(Dockerfile[^/]*|\.npmrc|\.babelrc|\.eslintrc[^/]*|\.prettierrc[^/]*)$/;
function walk(dir, acc, isRoot) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (isRoot && pkgs.includes(path.relative(root, p))) continue; if (isRoot && ['applications','docs','skills','scripts','test-support','.github'].includes(e.name) === false && dir===root && !['scripts','test-support','.github'].includes(e.name)) continue; walk(p, acc, false); }
    else if (EXT.test(p) && !p.endsWith('package.json') && !p.endsWith('pnpm-lock.yaml') && fs.statSync(p).size < 2_000_000) acc.push(p);
  }
  return acc;
}
const binsOf = (dir, name) => { try { const m = JSON.parse(fs.readFileSync(path.join(dir,'node_modules',name,'package.json'),'utf8')); return typeof m.bin === 'string' ? [name.split('/').pop()] : Object.keys(m.bin || {}); } catch { return []; } };
for (const rel of pkgs) {
  const dir = path.join(root, rel);
  if (!fs.existsSync(path.join(dir,'package.json'))) continue;
  const man = JSON.parse(fs.readFileSync(path.join(dir,'package.json'),'utf8'));
  const files = walk(dir, [], rel === '.');
  const text = files.map(f => fs.readFileSync(f,'utf8')).join('\n');
  const scripts = Object.values(man.scripts || {}).join('\n');
  const deps = { ...Object.fromEntries(Object.keys(man.dependencies||{}).map(k=>[k,'dep'])), ...Object.fromEntries(Object.keys(man.devDependencies||{}).map(k=>[k,'dev'])), ...Object.fromEntries(Object.keys(man.optionalDependencies||{}).map(k=>[k,'opt'])) };
  const unused = [];
  for (const [name, kind] of Object.entries(deps)) {
    const target = name.startsWith('@types/') ? (name.slice(7).includes('__') ? '@' + name.slice(7).replace('__','/') : name.slice(7)) : name;
    const esc = target.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const spec = new RegExp(`['"\`]${esc}(/[^'"\`]*)?['"\`]`);
    const bins = binsOf(dir, name).concat(binsOf(root, name));
    const binUsed = bins.some(b => new RegExp(`(^|[\\s;&|(\`'"/])${b.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(\\s|$|['"\`;&|)])`,'m').test(scripts + '\n' + text));
    const nameInScripts = scripts.includes(name);
    if (!spec.test(text) && !binUsed && !nameInScripts) unused.push(`${name} (${kind})`);
  }
  console.log(`${rel}: ${files.length} files scanned; ${Object.keys(deps).length} deps; no reference: ${unused.length ? unused.join(', ') : 'none'}`);
}
