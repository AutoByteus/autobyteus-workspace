import "../api-live/provider-observer.mjs";

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.env.API_PROBE_ROOT;
const worktree = process.env.API_PROBE_WORKTREE;
if (!root || !worktree) {
  throw new Error("API_PROBE_ROOT and API_PROBE_WORKTREE are required.");
}

const output = path.join(root, "readiness-events.jsonl");
const moduleUrl = pathToFileURL(path.join(
  worktree,
  "autobyteus-server-ts/dist/run-history/services/root-run-package-readiness-index.js",
)).href;
const { RootRunPackageReadinessIndex } = await import(moduleUrl);

let sequence = 0;
const record = (event) => {
  fs.appendFileSync(output, `${JSON.stringify({
    sequence: ++sequence,
    pid: process.pid,
    at: new Date().toISOString(),
    monotonicMs: Number(process.uptime() * 1000).toFixed(3),
    ...event,
  })}\n`);
};

for (const method of ["rebuild", "awaitReady"]) {
  const original = RootRunPackageReadinessIndex.prototype[method];
  RootRunPackageReadinessIndex.prototype[method] = function (...args) {
    const callId = `${method}-${sequence + 1}`;
    record({
      type: "readiness-call-start",
      method,
      callId,
      memoryDir: this.memoryDir,
      initializedBefore: this.isInitialized(),
      admittedTeamsBefore: this.listAdmitted("agent_team").length,
      admittedOrgsBefore: this.listAdmitted("agent_org").length,
      caller: new Error().stack?.split("\n").slice(2, 7).map((line) => line.trim()),
    });
    let result;
    try {
      result = original.apply(this, args);
    } catch (error) {
      record({ type: "readiness-call-error", method, callId, error: String(error) });
      throw error;
    }
    Promise.resolve(result).then(
      () => record({
        type: "readiness-call-end",
        method,
        callId,
        initializedAfter: this.isInitialized(),
        admittedTeamsAfter: this.listAdmitted("agent_team").length,
        admittedOrgsAfter: this.listAdmitted("agent_org").length,
      }),
      (error) => record({ type: "readiness-call-error", method, callId, error: String(error) }),
    );
    return result;
  };
}

record({ type: "observer-ready" });
