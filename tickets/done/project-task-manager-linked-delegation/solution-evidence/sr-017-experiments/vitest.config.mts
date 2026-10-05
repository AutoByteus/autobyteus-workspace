import { createRequire } from 'node:module';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts/package.json');
const { defineConfig } = require('vitest/config');
const tsconfigPaths = require('vite-tsconfig-paths').default;
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(new URL(import.meta.url).pathname);
const owners = JSON.parse(fs.readFileSync(path.join(here, 'owner-map.json'), 'utf8'));
const variant = process.env.SD_VARIANT ?? 'tbc';
export default defineConfig({
 plugins: [{name:'sd017-archive-resolver', enforce:'pre', resolveId(source, importer) {
   if(source.startsWith('autobyteus-ts/')) return '/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-ts/src/'+source.slice('autobyteus-ts/'.length).replace(/\.js$/, '.ts');
   if(source==='autobyteus-ts') return '/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-ts/src/index.ts';
   if (!source.startsWith('/') && !source.startsWith('.')) return;
   const candidate = path.resolve(importer ? path.dirname(importer) : here, source).replace(/\.js$/, '.ts');
   const owner = owners[candidate];
   if (owner && !variant.includes(owner.flag)) return owner.snapshot;
 }}, tsconfigPaths({projects:[path.resolve(process.cwd(), 'tsconfig.json')]})],
 server:{deps:{inline:['repository_prisma']}},
 test:{pool:'forks', fileParallelism:false, environment:'node', include:[path.join(here,'*.test.ts')],
   env:{DATABASE_URL:'file:'+path.join(here,'unused-test-owned.db'), SD_VARIANT:variant}, testTimeout:20000}
});
