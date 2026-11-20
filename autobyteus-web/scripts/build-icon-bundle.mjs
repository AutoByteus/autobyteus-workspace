#!/usr/bin/env node
/**
 * Builds the local icon bundle (autobyteus-279, AR-003, REQ-011): every Iconify icon the app's source names, cut from its
 * collection's data (`@iconify-json/*`), written to `assets/icons/phone-icon-bundle.json`. `plugins/01.localIcons.client.ts`
 * registers it at start, and the Iconify API is off, so the app never fetches an icon.
 *
 *   node scripts/build-icon-bundle.mjs          write the bundle
 *   node scripts/build-icon-bundle.mjs --check  fail when the bundle is not what the source needs
 *
 * A name its collection does not have fails the build. Icon names are literals in the source (no name is built at run
 * time), including the mapping tables of `utils/teamCommunication/referenceFilePresentation.ts` and `ArtifactItem.vue`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { getIcons } from '@iconify/utils';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(webRoot, 'package.json'));
const BUNDLE = path.join(webRoot, 'assets/icons/phone-icon-bundle.json');

/** The collections the app uses, by prefix. */
export const ICON_COLLECTIONS = ['heroicons', 'mdi', 'ph', 'svg-spinners', 'vscode-icons'];
const SOURCE_DIRS = ['components', 'composables', 'layouts', 'pages', 'plugins', 'services', 'stores', 'utils', 'demo'];
const SOURCE_FILES = ['app.vue', 'error.vue'];
const NAME = new RegExp(`(?<![a-z0-9-])(${ICON_COLLECTIONS.join('|')}):([a-z0-9]+(?:-[a-z0-9]+)*)`, 'g');

const sourceFiles = () => {
  const files = SOURCE_FILES.map((file) => path.join(webRoot, file)).filter((file) => fs.existsSync(file));
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(vue|ts|js|mjs)$/.test(entry.name) && !/\.(spec|test)\.[a-z]+$/.test(entry.name)) files.push(full);
    }
  };
  for (const dir of SOURCE_DIRS) if (fs.existsSync(path.join(webRoot, dir))) walk(path.join(webRoot, dir));
  return files.sort();
};

/** Every icon name the source holds, by prefix. */
export const iconNamesInSource = () => {
  const names = new Map(ICON_COLLECTIONS.map((prefix) => [prefix, new Set()]));
  for (const file of sourceFiles()) {
    for (const match of fs.readFileSync(file, 'utf8').matchAll(NAME)) names.get(match[1]).add(match[2]);
  }
  return names;
};

export const buildBundle = () => {
  const missing = [];
  const bundle = [];
  for (const [prefix, set] of iconNamesInSource()) {
    if (!set.size) continue;
    const names = [...set].sort();
    const data = JSON.parse(fs.readFileSync(require.resolve(`@iconify-json/${prefix}/icons.json`), 'utf8'));
    const subset = getIcons(data, names, false);
    for (const name of names) if (!subset?.icons[name] && !subset?.aliases?.[name]) missing.push(`${prefix}:${name}`);
    if (subset) bundle.push(subset);
  }
  return { bundle, missing };
};

const run = () => {
  const { bundle, missing } = buildBundle();
  if (missing.length) {
    console.error(`[icons] not in their collections: ${missing.join(', ')}`);
    process.exit(1);
  }
  const text = `${JSON.stringify(bundle)}\n`;
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(BUNDLE) ? fs.readFileSync(BUNDLE, 'utf8') : '';
    if (current !== text) {
      console.error('[icons] assets/icons/phone-icon-bundle.json is not what the source needs: run `pnpm icons:build`.');
      process.exit(1);
    }
    console.log('[icons] the bundle is current.');
    return;
  }
  fs.mkdirSync(path.dirname(BUNDLE), { recursive: true });
  fs.writeFileSync(BUNDLE, text);
  const count = bundle.reduce((sum, collection) => sum + Object.keys(collection.icons).length + Object.keys(collection.aliases ?? {}).length, 0);
  console.log(`[icons] wrote ${count} icons from ${bundle.length} collections (${Math.round(text.length / 1024)} KB).`);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
