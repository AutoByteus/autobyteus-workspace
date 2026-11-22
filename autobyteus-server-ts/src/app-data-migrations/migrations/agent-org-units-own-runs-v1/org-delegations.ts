import fs from "node:fs/promises";
import path from "node:path";
import { readJson, writeJsonAtomic } from "./org-unit-targets.js";

/**
 * Delegations from an Org's members (storage contract §6): every Task entry and every delegated run's own
 * `delegatedFrom` that names the Org run as delegating run with a delegator is rewritten to name the delegator's unit run
 * (an agent unit's own run, or the Team unit run the delegator is a member of). An entry without a delegator (contract E6:
 * 4 old runs) keeps naming the Org: preserved history. Values other than the delegating run are kept as they are.
 */
type Json = Record<string, unknown>;
export type UnitRunRef = Readonly<{ kind: "agent" | "agent_team"; runId: string }>;
export type DelegationRewrite = Readonly<{ rewritten: number; withoutDelegator: number; filesWritten: number }>;

const isRecord = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);
const subfolders = async (dir: string): Promise<string[]> => (await fs.readdir(dir, { withFileTypes: true })
  .catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return []; throw error; }))
  .filter((entry) => entry.isDirectory()).map((entry) => path.join(dir, entry.name));

/** Rewrites, in place, every `delegatedFrom` naming the Org with a delegator the map knows; counts what it did. */
const rewriteValue = (value: unknown, orgRunId: string, unitOf: ReadonlyMap<string, UnitRunRef>, counts: { rewritten: number; withoutDelegator: number }): unknown => {
  if (Array.isArray(value)) return value.map((item) => rewriteValue(item, orgRunId, unitOf, counts));
  if (!isRecord(value)) return value;
  const next: Json = {};
  for (const [key, item] of Object.entries(value)) next[key] = rewriteValue(item, orgRunId, unitOf, counts);
  const from = next.delegatedFrom;
  const delegating = isRecord(from) ? from.delegatingRun : undefined;
  if (isRecord(from) && isRecord(delegating) && delegating.kind === "agent_org" && delegating.runId === orgRunId && from.nodeId === undefined) {
    const unit = typeof from.delegatorAgentRunId === "string" ? unitOf.get(from.delegatorAgentRunId) : undefined;
    if (unit) {
      next.delegatedFrom = { ...from, delegatingRun: { kind: unit.kind, runId: unit.runId } };
      counts.rewritten += 1;
    } else {
      counts.withoutDelegator += 1;
    }
  }
  return next;
};

const rewriteFile = async (file: string, orgRunId: string, unitOf: ReadonlyMap<string, UnitRunRef>, totals: { rewritten: number; withoutDelegator: number; filesWritten: number }): Promise<void> => {
  const raw = await readJson(file);
  if (raw === null) return;
  const counts = { rewritten: 0, withoutDelegator: 0 };
  const next = rewriteValue(raw, orgRunId, unitOf, counts);
  totals.withoutDelegator += counts.withoutDelegator;
  if (!counts.rewritten) return;
  await writeJsonAtomic(file, next);
  totals.rewritten += counts.rewritten;
  totals.filesWritten += 1;
};

/** Every Task's entries file (Projects' and ad-hoc Tasks'), and every run's own file that can carry `delegatedFrom`. */
export const delegationFiles = async (appDataDir: string, memoryDir: string): Promise<string[]> => {
  const files: string[] = [];
  for (const project of await subfolders(path.join(appDataDir, "projects"))) {
    for (const task of await subfolders(path.join(project, "tasks"))) files.push(path.join(task, "agent_run_resources.json"));
  }
  for (const task of await subfolders(path.join(appDataDir, "ad-hoc-tasks"))) files.push(path.join(task, "agent_run_resources.json"));
  for (const run of await subfolders(path.join(memoryDir, "agents"))) files.push(path.join(run, "run_metadata.json"));
  for (const run of await subfolders(path.join(memoryDir, "agent_teams"))) files.push(path.join(run, "team_run_execution_tree.json"));
  return files;
};

export const rewriteOrgDelegations = async (files: readonly string[], orgRunId: string, unitOf: ReadonlyMap<string, UnitRunRef>): Promise<DelegationRewrite> => {
  const totals = { rewritten: 0, withoutDelegator: 0, filesWritten: 0 };
  for (const file of files) await rewriteFile(file, orgRunId, unitOf, totals);
  return totals;
};
