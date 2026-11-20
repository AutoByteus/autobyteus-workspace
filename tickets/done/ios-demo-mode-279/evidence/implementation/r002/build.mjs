// Builds the R-002 check page with Vite from autobyteus-web's dependencies (the same @apollo/client and @novnc/novnc the
// phone build uses) into <out>/ and copies index.html to 200.html (Nuxt's SPA fallback name).
// Run: node <this file> <autobyteus-web dir> <out dir>
import { createRequire } from 'node:module';
import { copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [webDir, outDir] = process.argv.slice(2).map((value) => path.resolve(value));
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(webDir, 'package.json'));
const { build } = await import(require.resolve('vite'));
await build({
  root: path.join(here, 'page'),
  base: '/',
  logLevel: 'warn',
  publicDir: path.join(here, 'page', 'public'),
  resolve: { alias: [
    { find: /^@apollo\/client\/core$/, replacement: require.resolve('@apollo/client/core') },
    { find: /^@novnc\/novnc$/, replacement: require.resolve('@novnc/novnc') },
  ] },
  build: { outDir, emptyOutDir: true, target: 'es2022', minify: false },
});
copyFileSync(path.join(outDir, 'index.html'), path.join(outDir, '200.html'));
console.log(`built ${outDir}`);
