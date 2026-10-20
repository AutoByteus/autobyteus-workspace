// Attach-only CDP step runner for an isolated instance window. Usage: node cdp.mjs <controlPort> <step.mjs> [jsonArgs]
// The step module's default export receives (page, args) and returns JSON. Never launches or closes a browser.
import path from 'node:path'; import { pathToFileURL } from 'node:url';
const PW = '/Users/normy/autobyteus_org/autobyteus-worktrees/settings-update-notifications/node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';
const { chromium } = await import(PW);
const [port, stepFile, rawArgs] = process.argv.slice(2);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const pages = browser.contexts().flatMap((c) => c.pages());
const page = pages.find((p) => p.url().includes('/renderer/index.html')) ?? pages[0];
const step = (await import(pathToFileURL(path.resolve(stepFile)).href)).default;
try {
  const result = await step(page, rawArgs ? JSON.parse(rawArgs) : {});
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(0);
} catch (error) { process.stderr.write(String(error?.stack ?? error) + '\n'); process.exit(1); }
