// For each given workspace package, list every bare import specifier in its own files (source, tests, scripts,
// configs) and where pnpm's layout makes that package available: the package's node_modules, the root
// node_modules, or only pnpm's hidden hoist (node_modules/.pnpm/node_modules, reachable through Vite/Nuxt
// resolution). Run before and after a dependency change and diff the outputs: a line that turns MISSING (or
// changes from a provider to MISSING) is an import that lost its only provider.
// Usage: node import-provider-check.mjs <repoRoot> <pkgDir> [<pkgDir> ...]  > out.txt
import fs from 'node:fs'; import path from 'node:path'; import { builtinModules } from 'node:module';
const [root, ...pkgs] = process.argv.slice(2);
const builtins = new Set(builtinModules);
const skip = new Set(['node_modules', '.nuxt', '.output', 'dist', 'dist-electron', 'electron-dist', 'release', 'tickets', 'docs', '.git', 'coverage', 'resources']);
const re = /(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+|vi\.mock\(\s*)['"]([^'".~#/\\][^'"]*|@[^'"]+)['"]/g;
const has = (dir, name) => fs.existsSync(path.join(dir, name, 'package.json'));
for (const pkg of pkgs) {
  const dir = path.join(root, pkg); const names = new Set();
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (skip.has(e.name)) continue; const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (/\.(m?[jt]sx?|vue|cjs|mts|cts)$/.test(e.name)) for (const m of fs.readFileSync(p, 'utf8').matchAll(re)) {
      const spec = m[1]; if (spec.startsWith('node:') || spec.startsWith('virtual:') || spec.startsWith('#') || spec.includes('${')) continue;
      const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
      if (!builtins.has(name) && /^(@[a-z0-9._-]+\/)?[a-z0-9._-]+$/i.test(name)) names.add(name); } } })(dir);
  for (const n of [...names].sort()) {
    const where = has(path.join(dir, 'node_modules'), n) ? 'package' : has(path.join(root, 'node_modules'), n) ? 'root' : has(path.join(root, 'node_modules/.pnpm/node_modules'), n) ? 'hidden-hoist-only' : 'MISSING';
    console.log(`${pkg}\t${n}\t${where}`);
  }
}
