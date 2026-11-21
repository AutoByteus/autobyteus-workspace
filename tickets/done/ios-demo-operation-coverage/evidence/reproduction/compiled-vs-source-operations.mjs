import fs from 'node:fs'; import path from 'node:path';
import { compiledOperations } from '/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-operation-coverage/autobyteus-web/scripts/mobile-build-checks.mjs';
const web = '/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-operation-coverage/autobyteus-web';
const compiled = compiledOperations(path.join(web, 'dist-mobile-demo/public'));
const OP = /\b(?:query|mutation|subscription)\s+([A-Z][A-Za-z0-9_]*)\s*[({]/g;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (['node_modules','__tests__','.nuxt','.output','dist','dist-mobile','dist-mobile-demo','generated','tests','electron-dist'].includes(e.name) ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]);
const src = new Map();
for (const f of walk(web).filter((f) => /\.(ts|vue|js|mjs)$/.test(f) && !f.includes('/demo/'))) for (const m of fs.readFileSync(f, 'utf8').matchAll(OP)) { if (!src.has(m[1])) src.set(m[1], path.relative(web, f)); }
const gqlOnly = new Set([...src].filter(([,f]) => f.startsWith('graphql/')).map(([n]) => n));
console.log('compiled', compiled.size, 'source(all)', src.size, 'source(graphql/**)', gqlOnly.size);
console.log('compiled not in graphql/**:', [...compiled].filter((n) => !gqlOnly.has(n)).map((n) => `${n} (${src.get(n) ?? '?'})`));
console.log('graphql/** not compiled:', [...gqlOnly].filter((n) => !compiled.has(n)));
