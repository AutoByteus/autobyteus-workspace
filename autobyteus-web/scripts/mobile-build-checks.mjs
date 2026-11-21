/**
 * The checks each phone build runs on its own output (autobyteus-279), called by `build-mobile-web.mjs`:
 *
 * - The node's `/mobile` build holds no demo code: not the demo plugin, not the transport, not the demo origin.
 * - The iOS demo build answers every GraphQL operation compiled into it: each has a demo handler
 *   (`demo/graphql/operations.ts`) or is listed as one the phone never sends, with its reason
 *   (`demo/graphql/unreachable-operations.json`). The list holds nothing else, so it stays exact.
 *
 * The same coverage rule also runs on the operations defined in the web source, without a build
 * (`scripts/__tests__/mobileBuildChecks.spec.ts`, autobyteus-584): the phone build compiles every one of them.
 */
import fs from 'node:fs';
import path from 'node:path';

/** Strings only the demo's code holds: the demo plugin's name, the transport's refusal, the demo origin. */
export const DEMO_MARKERS = ['autobyteus-demo-boot', 'The demo has no network', 'demo.autobyteus.invalid'];

const scriptFiles = (dir) => {
  const files = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(m?js|html)$/.test(entry.name)) files.push(full);
    }
  };
  walk(dir);
  return files.sort();
};

/** Each demo marker found in a build, with the file that holds it. */
export const findDemoCode = (publicDir) => scriptFiles(publicDir).flatMap((file) => {
  const text = fs.readFileSync(file, 'utf8');
  return DEMO_MARKERS.filter((marker) => text.includes(marker)).map((marker) => ({ file: path.relative(publicDir, file), marker }));
});

const OPERATION = /\b(?:query|mutation|subscription)\s+([A-Z][A-Za-z0-9_]*)\s*[({]/g;

/** Every GraphQL operation name compiled into a build's scripts. */
export const compiledOperations = (publicDir) => {
  const names = new Set();
  for (const file of scriptFiles(publicDir)) for (const match of fs.readFileSync(file, 'utf8').matchAll(OPERATION)) names.add(match[1]);
  return names;
};

/** Folders whose files are not the app's source: dependencies, build outputs, generated code, tests and the demo node. */
const NOT_SOURCE = /^(node_modules|\.nuxt|\.output|dist.*|electron-dist|generated|__tests__|tests|demo)$/;

/**
 * Every GraphQL operation name defined in the web source (`.ts`, `.vue`, `.js`, `.mjs`), outside `NOT_SOURCE` folders: the
 * operations a phone build compiles (autobyteus-584; measured equal to the demo build's 252).
 */
export const sourceOperations = (webRoot) => {
  const names = new Set();
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) { if (!NOT_SOURCE.test(entry.name)) walk(full); }
      else if (/\.(ts|vue|m?js)$/.test(entry.name)) for (const match of fs.readFileSync(full, 'utf8').matchAll(OPERATION)) names.add(match[1]);
    }
  };
  walk(webRoot);
  return names;
};

/** The operations the demo node answers: the keys of `DemoOperations` (its handler table must cover all of them, by type). */
export const handledOperations = (webRoot) => {
  const source = fs.readFileSync(path.join(webRoot, 'demo/graphql/operations.ts'), 'utf8');
  const table = source.slice(source.indexOf('export type DemoOperations = {'), source.indexOf('};', source.indexOf('export type DemoOperations = {')));
  return new Set([...table.matchAll(/^ {2}([A-Za-z]+):/gm)].map((match) => match[1]));
};

export const unreachableOperations = (webRoot) =>
  JSON.parse(fs.readFileSync(path.join(webRoot, 'demo/graphql/unreachable-operations.json'), 'utf8'));

/**
 * The demo's operation coverage of `compiled` (the operations of a demo build, `compiledOperations`, or of the source,
 * `sourceOperations`): operations with neither a handler nor a listed reason, list entries that are not among them or
 * are handled, and entries whose reason is not defined.
 */
export const demoOperationCoverage = (compiled, webRoot) => {
  const handled = handledOperations(webRoot);
  const { reasons, operations } = unreachableOperations(webRoot);
  return {
    unanswered: [...compiled].filter((name) => !handled.has(name) && !(name in operations)).sort(),
    stale: Object.keys(operations).filter((name) => !compiled.has(name) || handled.has(name)).sort(),
    unexplained: Object.entries(operations).filter(([, reason]) => !(reason in reasons)).map(([name]) => name).sort(),
    compiled: compiled.size,
  };
};
