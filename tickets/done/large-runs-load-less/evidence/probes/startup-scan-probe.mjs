#!/usr/bin/env node
// autobyteus-358 / item autobyteus-156 probe: what the run-package readiness scan (run at the first history access
// after a start, and again on every new team or org run) costs as team message logs grow. Test-owned data only:
//   1. copies <seedMemoryDir> (a probe seed, never a user's data) to <workDir>/memory;
//   2. times RootRunPackageCurrentValidator.scan() (the built server's dist) and counts admitted team runs;
//   3. grows the admitted root team runs' message logs to about <targetMb> MB in total, with messages between each
//      run's own members in the stored line format, and times the scan again.
// Usage: node startup-scan-probe.mjs <serverDistDir> <seedMemoryDir> <workDir> [targetMb=100] [samples=3]
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

const [dist, seedMemory, workDir, targetArg = "100", samplesArg = "3"] = process.argv.slice(2);
const { RootRunPackageCurrentValidator } = await import(pathToFileURL(path.join(dist, "run-history/services/root-run-package-current-validator.js")).href);
const memory = path.join(workDir, "memory");
await fs.rm(memory, { recursive: true, force: true });
await fs.cp(seedMemory, memory, { recursive: true });

const logBytes = async () => {
  let total = 0;
  for (const family of ["agent_teams", "agent_orgs"]) {
    const root = path.join(memory, family);
    for (const name of await fs.readdir(root).catch(() => [])) {
      for (const file of await fs.readdir(path.join(root, name)).catch(() => [])) {
        if (/communication_messages(_active|_\d{6})\.jsonl$/.test(file)) total += (await fs.stat(path.join(root, name, file))).size;
      }
    }
  }
  return total;
};
const scanTimes = async () => {
  const ms = [];
  let snapshot;
  for (let i = 0; i < Number(samplesArg); i += 1) {
    const s = performance.now();
    snapshot = await new RootRunPackageCurrentValidator(memory).scan();
    ms.push(Math.round(performance.now() - s));
  }
  const teams = snapshot.groups.filter((g) => g.family === "agent_team");
  return { ms, teams, diagnostics: snapshot.diagnostics.length };
};

const before = await scanTimes();
const bytesBefore = await logBytes();
// Grow every admitted root team's log with messages between two of its own members.
const perTeam = Math.ceil((Number(targetArg) * 1048576 - bytesBefore) / Math.max(1, before.teams.length));
const body = "x".repeat(2000);
for (const team of before.teams) {
  const tree = await fs.readFile(path.join(team.directory, "team_run_execution_tree.json"), "utf8");
  const ids = [...new Set([...tree.matchAll(/"agentRunId":\s*"([^"]+)"/g)].map((m) => m[1]))];
  if (ids.length < 2) continue;
  const lines = [];
  let size = 0;
  for (let i = 0; size < perTeam; i += 1) {
    const line = JSON.stringify({ messageId: `collabmsg_${randomUUID().replaceAll("-", "")}`, senderAgentRunId: ids[i % ids.length],
      receiverAgentRunId: ids[(i + 1) % ids.length], content: `Probe message ${i}: ${body}`, messageType: "agent_message",
      referenceFiles: [], createdAt: new Date(Date.UTC(2026, 9, 1, 0, 0, i)).toISOString() }) + "\n";
    lines.push(line); size += line.length;
  }
  await fs.appendFile(path.join(team.directory, "team_communication_messages_active.jsonl"), lines.join(""));
}
const after = await scanTimes();
const bytesAfter = await logBytes();
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const os = await import("node:os");
console.log(JSON.stringify({
  before: { admittedTeams: before.teams.length, diagnostics: before.diagnostics, logMb: +(bytesBefore / 1048576).toFixed(1), scanMs: before.ms, medianMs: median(before.ms) },
  after: { admittedTeams: after.teams.length, diagnostics: after.diagnostics, logMb: +(bytesAfter / 1048576).toFixed(1), scanMs: after.ms, medianMs: median(after.ms) },
  loadAverage: os.loadavg().map((x) => Math.round(x * 100) / 100), node: process.version }));
