// TEMPORARY Playwright step runner (trusted CDP input) against the owned headless Chrome on :9333.
// Usage: node pw.mjs <step-file.mjs>   — the step module default-exports async ({ page, shot, text }) => any
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire("/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/autobyteus-web/package.json");
const { chromium } = require("playwright-core");
const EVID = "/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/api-e2e-evidence/browser";
const browser = await chromium.connectOverCDP("http://127.0.0.1:9333");
const context = browser.contexts()[0];
const page = context.pages().find((p) => p.url().startsWith("http://127.0.0.1:3000")) ?? context.pages()[0] ?? await context.newPage();
await page.setViewportSize({ width: 1500, height: 950 });
const shot = async (name) => { const file = path.join(EVID, `${name}.png`); await page.screenshot({ path: file }); return file; };
const text = async () => page.evaluate(() => document.body.innerText);
const step = (await import(path.resolve(process.argv[2]))).default;
try {
  const result = await step({ page, shot, text });
  console.log(typeof result === "string" ? result : JSON.stringify(result, null, 1));
} catch (error) {
  console.log("STEP ERROR", error?.message ?? error);
  await shot(`error-${Date.now()}`).catch(() => undefined);
  process.exitCode = 1;
} finally {
  await browser.close().catch(() => undefined); // disconnect only (connectOverCDP)
}
