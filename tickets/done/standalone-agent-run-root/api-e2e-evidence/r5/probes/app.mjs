// TEMPORARY Playwright runner for the isolated desktop app (trusted CDP input). Usage: CDP=53160 node app.mjs <step.mjs> [args...]
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire("/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/autobyteus-web/package.json");
const { chromium } = require("playwright-core");
const SHOTS = "/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/api-e2e-evidence/r5/shots";
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.CDP}`);
const pages = browser.contexts().flatMap((c) => c.pages());
const page = pages.find((p) => p.url().includes("/renderer/index.html")) ?? pages[0];
const shot = async (name) => { const f = path.join(SHOTS, `${name}.png`); await page.screenshot({ path: f }); return f; };
const text = () => page.evaluate(() => document.body.innerText);
const step = (await import(path.resolve(process.argv[2]))).default;
try { const r = await step({ page, shot, text, args: process.argv.slice(3) }); console.log(typeof r === "string" ? r : JSON.stringify(r, null, 1)); }
catch (e) { console.log("STEP ERROR", e?.message ?? e); await shot(`error-${Date.now()}`).catch(() => {}); process.exitCode = 1; }
finally { await browser.close().catch(() => {}); }
