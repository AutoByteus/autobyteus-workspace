import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  assertAgentTeamAddress,
  createAgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";
import {
  createTeamExecutionAddress,
  parseTeamExecutionAddress,
} from "../../agent-team-execution/domain/team-execution-address.js";

type Json = Record<string, unknown>;
type BindingRuntime = {
  subject: "AGENT_RUN" | "TEAM_RUN";
  bindingId: string;
  rootRunId: string;
  membersByRunId: Map<string, { memberAddress: string; displayName: string | null; runtimeKind: string }>;
};

const object = (value: unknown, label: string): Json => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Json;
};
const text = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
};
const tableNames = (db: DatabaseSync): Set<string> => new Set(
  (db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all() as Array<{ name: string }>).map((row) => row.name),
);
const columns = (db: DatabaseSync, table: string): Set<string> => new Set(
  (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map((row) => row.name),
);
const addressFromRoute = (routeValue: unknown, pathValue: unknown, label: string): string => {
  const route = text(routeValue, `${label}.memberRouteKey`).replace(/^\/+|\/+$/g, "");
  const segments = route.split("/").filter(Boolean);
  if (Array.isArray(pathValue)) {
    const path = pathValue.map((part, index) => text(part, `${label}.teamPath[${index}]`));
    const name = segments.at(-1);
    if (!name || [...path, name].join("/") !== route) throw new Error(`${label} route/path identity contradicts.`);
  }
  return createAgentTeamAddress(segments);
};

const migrateBinding = (value: unknown, label: string): { binding: Json; runtime: BindingRuntime } => {
  const binding = structuredClone(object(value, label));
  const bindingId = text(binding.bindingId, `${label}.bindingId`);
  const runtime = object(binding.runtime, `${label}.runtime`);
  if (runtime.subject !== "AGENT_RUN" && runtime.subject !== "TEAM_RUN") throw new Error(`${label}.runtime.subject is unsupported.`);
  if ("agentRunId" in runtime || "teamRunId" in runtime) {
    const rootRunId = runtime.subject === "AGENT_RUN"
      ? text(runtime.agentRunId, `${label}.runtime.agentRunId`)
      : text(runtime.teamRunId, `${label}.runtime.teamRunId`);
    const membersByRunId = new Map<string, { memberAddress: string; displayName: string | null; runtimeKind: string }>();
    const members = runtime.subject === "TEAM_RUN"
      ? (Array.isArray(runtime.members) ? runtime.members : []).map((memberValue, index) => {
          const member = object(memberValue, `${label}.runtime.members[${index}]`);
          const agentRunId = text(member.agentRunId, `${label}.runtime.members[${index}].agentRunId`);
          const normalized = {
            memberAddress: assertAgentTeamAddress(text(member.memberAddress, `${label}.runtime.members[${index}].memberAddress`)),
            displayName: text(member.displayName, `${label}.runtime.members[${index}].displayName`),
            agentRunId,
            runtimeKind: text(member.runtimeKind, `${label}.runtime.members[${index}].runtimeKind`),
          };
          membersByRunId.set(agentRunId, normalized);
          return normalized;
        })
      : [];
    binding.runtime = runtime.subject === "AGENT_RUN"
      ? {
          subject: "AGENT_RUN",
          agentRunId: rootRunId,
          definitionId: text(runtime.definitionId, `${label}.runtime.definitionId`),
          members: [],
        }
      : {
          subject: "TEAM_RUN",
          teamRunId: rootRunId,
          definitionId: text(runtime.definitionId, `${label}.runtime.definitionId`),
          members,
        };
    if (runtime.subject === "AGENT_RUN" && Array.isArray(runtime.members) && runtime.members.length > 0) {
      throw new Error(`${label}.runtime.members must be empty for AGENT_RUN.`);
    }
    return { binding, runtime: { subject: runtime.subject, bindingId, rootRunId, membersByRunId } };
  }
  const runId = text(runtime.runId, `${label}.runtime.runId`);
  const legacyMembers = Array.isArray(runtime.members) ? runtime.members : [];
  const members = runtime.subject === "TEAM_RUN" ? legacyMembers.map((memberValue, index) => {
    const member = object(memberValue, `${label}.runtime.members[${index}]`);
    return {
      memberAddress: addressFromRoute(member.memberRouteKey, member.teamPath, `${label}.runtime.members[${index}]`),
      displayName: text(member.displayName, `${label}.runtime.members[${index}].displayName`),
      agentRunId: text(member.runId, `${label}.runtime.members[${index}].runId`),
      runtimeKind: text(member.runtimeKind, `${label}.runtime.members[${index}].runtimeKind`),
    };
  }) : [];
  binding.runtime = runtime.subject === "AGENT_RUN"
    ? { subject: "AGENT_RUN", agentRunId: runId, definitionId: text(runtime.definitionId, `${label}.runtime.definitionId`), members: [] }
    : { subject: "TEAM_RUN", teamRunId: runId, definitionId: text(runtime.definitionId, `${label}.runtime.definitionId`), members };
  return migrateBinding(binding, label);
};

const migrateProducer = (value: unknown, runtimesByRunId: Map<string, BindingRuntime>, label: string): Json => {
  const producer = structuredClone(object(value, label));
  if ("executionAddress" in producer) {
    const executionAddress = parseTeamExecutionAddress(JSON.stringify(object(
      producer.executionAddress,
      `${label}.executionAddress`,
    )));
    return {
      executionAddress,
      displayName: typeof producer.displayName === "string" ? producer.displayName : null,
      runtimeKind: text(producer.runtimeKind, `${label}.runtimeKind`),
    };
  }
  const runId = text(producer.runId, `${label}.runId`);
  const runtime = runtimesByRunId.get(runId);
  if (!runtime) throw new Error(`${label}.runId '${runId}' cannot be resolved to a binding.`);
  const member = runtime.membersByRunId.get(runId);
  const executionAddress = runtime.subject === "AGENT_RUN"
    ? createTeamExecutionAddress({ rootTeamRunId: runtime.bindingId, memberAddress: "/" })
    : createTeamExecutionAddress({
        rootTeamRunId: runtime.rootRunId,
        memberAddress: member?.memberAddress ?? addressFromRoute(producer.memberRouteKey, producer.teamPath, label),
      });
  return {
    executionAddress,
    displayName: typeof producer.displayName === "string" ? producer.displayName : null,
    runtimeKind: text(producer.runtimeKind, `${label}.runtimeKind`),
  };
};

const migrateBindings = (db: DatabaseSync): Map<string, BindingRuntime> => {
  const runtimes = new Map<string, BindingRuntime>();
  if (!tableNames(db).has("__autobyteus_run_bindings")) return runtimes;
  const rows = db.prepare(`SELECT binding_id, summary_json FROM __autobyteus_run_bindings`).all() as Array<{ binding_id: string; summary_json: string }>;
  for (const row of rows) {
    const converted = migrateBinding(JSON.parse(row.summary_json), `binding '${row.binding_id}'`);
    db.prepare(`UPDATE __autobyteus_run_bindings SET summary_json = ? WHERE binding_id = ?`).run(JSON.stringify(converted.binding), row.binding_id);
    runtimes.set(converted.runtime.rootRunId, converted.runtime);
    for (const runId of converted.runtime.membersByRunId.keys()) runtimes.set(runId, converted.runtime);
  }
  const bindingColumns = columns(db, "__autobyteus_run_bindings");
  if (bindingColumns.has("run_id")) {
    db.exec(`ALTER TABLE __autobyteus_run_bindings ADD COLUMN agent_run_id TEXT; ALTER TABLE __autobyteus_run_bindings ADD COLUMN team_run_id TEXT;`);
    db.exec(`UPDATE __autobyteus_run_bindings SET agent_run_id = CASE WHEN runtime_subject = 'AGENT_RUN' THEN run_id END, team_run_id = CASE WHEN runtime_subject = 'TEAM_RUN' THEN run_id END`);
    db.exec(`ALTER TABLE __autobyteus_run_bindings DROP COLUMN run_id`);
  }
  const tables = tableNames(db);
  if (tables.has("__autobyteus_run_binding_members") && columns(db, "__autobyteus_run_binding_members").has("member_route_key")) {
    db.exec(`
      CREATE TABLE __autobyteus_run_binding_members_v5 (
        binding_id TEXT NOT NULL, member_address TEXT NOT NULL, display_name TEXT NOT NULL,
        agent_run_id TEXT NOT NULL, runtime_kind TEXT NOT NULL,
        PRIMARY KEY (binding_id, member_address)
      );
      INSERT INTO __autobyteus_run_binding_members_v5
      SELECT binding_id, '/' || trim(member_route_key, '/'), display_name, run_id, runtime_kind
      FROM __autobyteus_run_binding_members;
      DROP TABLE __autobyteus_run_binding_members;
      ALTER TABLE __autobyteus_run_binding_members_v5 RENAME TO __autobyteus_run_binding_members;
    `);
  }
  return runtimes;
};

const migrateJsonJournal = (
  db: DatabaseSync,
  table: string,
  runtimes: Map<string, BindingRuntime>,
): void => {
  if (!tableNames(db).has(table)) return;
  const tableColumns = columns(db, table);
  const hasBinding = tableColumns.has("binding_json");
  const selected = ["rowid AS row_id", ...(hasBinding ? ["binding_json"] : []), "producer_json"].join(", ");
  const rows = db.prepare(`SELECT ${selected} FROM ${table}`).all() as Array<{ row_id: number; binding_json?: string; producer_json: string | null }>;
  for (const row of rows) {
    let bindingJson = row.binding_json ?? null;
    if (bindingJson) {
      const converted = migrateBinding(JSON.parse(bindingJson), `${table}[${row.row_id}].binding`);
      bindingJson = JSON.stringify(converted.binding);
      runtimes.set(converted.runtime.rootRunId, converted.runtime);
      for (const runId of converted.runtime.membersByRunId.keys()) runtimes.set(runId, converted.runtime);
    }
    const producerJson = row.producer_json
      ? JSON.stringify(migrateProducer(JSON.parse(row.producer_json), runtimes, `${table}[${row.row_id}].producer`))
      : null;
    db.prepare(`UPDATE ${table} SET ${hasBinding ? "binding_json = ?, " : ""}producer_json = ? WHERE rowid = ?`)
      .run(...(hasBinding ? [bindingJson, producerJson, row.row_id] : [producerJson, row.row_id]));
  }
};

const migrateBriefStudioTables = (db: DatabaseSync): void => {
  for (const table of ["brief_artifacts", "brief_artifact_revisions"]) {
    if (!tableNames(db).has(table) || !columns(db, table).has("producer_member_route_key")) continue;
    db.exec(`ALTER TABLE ${table} RENAME COLUMN producer_member_route_key TO producer_member_address`);
    db.exec(`UPDATE ${table} SET producer_member_address = '/' || trim(producer_member_address, '/')`);
  }
};

export const migrateCanonicalApplicationDatabase = (
  databasePath: string,
  applicationId: string,
): { backupPath: string; changed: boolean } => {
  const backupPath = `${databasePath}.backup-${Date.now()}`;
  fs.copyFileSync(databasePath, backupPath);
  const db = new DatabaseSync(databasePath);
  try {
    db.exec("BEGIN IMMEDIATE");
    const before = db.prepare(`PRAGMA data_version`).get() as { data_version?: number };
    const runtimes = migrateBindings(db);
    migrateJsonJournal(db, "__autobyteus_execution_event_journal", runtimes);
    migrateJsonJournal(db, "__autobyteus_publication_journal", runtimes);
    if (applicationId === "brief-studio") migrateBriefStudioTables(db);
    db.exec("COMMIT");
    const after = db.prepare(`PRAGMA data_version`).get() as { data_version?: number };
    return { backupPath, changed: before.data_version !== after.data_version || runtimes.size > 0 };
  } catch (error) {
    try { db.exec("ROLLBACK"); } catch { /* no-op */ }
    throw error;
  } finally {
    db.close();
  }
};
