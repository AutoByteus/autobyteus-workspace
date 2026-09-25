#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { AppConfig } from "../dist/config/app-config.js";
import { repairCollaborationRunHistoryIndexes } from "../dist/run-history/maintenance/collaboration-run-history-index-repair.js";

const usage = "Usage: node scripts/repair-collaboration-run-history-index.mjs --app-data-dir <owned-local-profile> [--apply] [--acknowledge-missing-index-facts]";
const args = process.argv.slice(2);
if (args.includes("--help")) { console.log(usage); process.exit(0); }
const index = args.indexOf("--app-data-dir");
if (index < 0 || !args[index + 1] || args[index + 1].startsWith("--")) throw new Error(usage);
const appDataDir = path.resolve(args[index + 1]);
const allowed = new Set(["--apply", "--acknowledge-missing-index-facts"]);
for (let i = 0; i < args.length; i++) {
  if (i === index || i === index + 1) continue;
  if (!allowed.has(args[i])) throw new Error(`Unknown argument: ${args[i]}`);
}
// The explicit existing app-data profile is the ownership selector; neither a
// memory-explorer folder nor a direct --memory-dir is accepted for writes.
await fs.access(path.join(appDataDir, ".env"));
const config = new AppConfig({ appDataDir });
config.initialize();
const memoryDir = path.resolve(config.getMemoryDir());
const profile = await fs.realpath(appDataDir);
const root = await fs.realpath(memoryDir);
if (!root.startsWith(`${profile}${path.sep}`)) throw new Error(`Memory root is outside the selected owned profile: ${root}`);
console.log(`Selected owned local profile: ${profile}\nResolved memory root: ${root}`);
const result = await repairCollaborationRunHistoryIndexes({
  memoryDir: root, apply: args.includes("--apply"),
  acknowledgeMissingIndexFacts: args.includes("--acknowledge-missing-index-facts"),
});
console.log(JSON.stringify(result, null, 2));
