import type { ApplicationAgentBindingRecord } from "../domain/models.js";
import { DatabaseSync } from "node:sqlite";
import type {
  ApplicationAgentBindingListFilter,
  ApplicationExecutionResourceRef,
} from "@autobyteus/application-sdk-contracts";
import { ApplicationPlatformStateStore } from "../../application-storage/stores/application-platform-state-store.js";
import { ApplicationRunBindingRecordCodec } from "../domain/application-run-binding-record-codec.js";

export const APPLICATION_AGENT_TEAM_MEMBER_STORAGE_RUNTIME_KIND = "AGENT_TEAM_MEMBER" as const;

const ensureTables = (db: DatabaseSync): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS __autobyteus_run_bindings (
      binding_id TEXT PRIMARY KEY,
      launch_request_id TEXT NOT NULL,
      status TEXT NOT NULL,
      runtime_subject TEXT NOT NULL,
      agent_run_id TEXT,
      team_run_id TEXT,
      definition_id TEXT NOT NULL,
      resource_owner TEXT NOT NULL,
      resource_kind TEXT NOT NULL,
      resource_local_id TEXT,
      resource_definition_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      terminated_at TEXT,
      last_error_message TEXT,
      summary_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS __autobyteus_run_bindings_by_status
      ON __autobyteus_run_bindings (status, updated_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS __autobyteus_run_bindings_by_launch_request_id
      ON __autobyteus_run_bindings (launch_request_id);

    CREATE TABLE IF NOT EXISTS __autobyteus_run_binding_members (
      binding_id TEXT NOT NULL,
      member_address TEXT NOT NULL,
      display_name TEXT NOT NULL,
      agent_run_id TEXT NOT NULL,
      runtime_kind TEXT NOT NULL,
      PRIMARY KEY (binding_id, member_address)
    );
  `);
};

const hasBindingState = (db: DatabaseSync): boolean => Boolean(db.prepare(
  `SELECT 1
     FROM sqlite_master
    WHERE type = 'table'
      AND name = '__autobyteus_run_bindings'
    LIMIT 1`,
).get());

const cloneSummary = (summary: ApplicationAgentBindingRecord): ApplicationAgentBindingRecord => structuredClone(summary);

const hydrateSummary = (row: { summary_json: string }): ApplicationAgentBindingRecord =>
  ApplicationRunBindingRecordCodec.decode(JSON.parse(row.summary_json));

const normalizeResourceColumns = (executionResourceRef: ApplicationExecutionResourceRef) => ({
  source: executionResourceRef.source,
  kind: executionResourceRef.kind,
  localId: executionResourceRef.source === "bundle" ? executionResourceRef.localId : null,
  definitionId: executionResourceRef.source === "shared" ? executionResourceRef.definitionId : null,
});

export class ApplicationRunBindingStore {
  constructor(
    private readonly dependencies: {
      platformStateStore?: ApplicationPlatformStateStore;
    } = {},
  ) {}

  private get platformStateStore(): ApplicationPlatformStateStore {
    return this.dependencies.platformStateStore ?? new ApplicationPlatformStateStore();
  }

  async listKnownApplicationIds(): Promise<string[]> {
    const applicationIds = new Set<string>();
    for (const databasePath of this.platformStateStore.listExistingPlatformDatabasePaths()) {
      const db = new DatabaseSync(databasePath, { readOnly: true });
      try {
        const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all() as Array<{ name: string }>;
        if (!tables.some((table) => table.name === "__autobyteus_run_bindings")) {
          continue;
        }
        const rows = db.prepare(`SELECT DISTINCT json_extract(summary_json, '$.applicationId') AS application_id FROM __autobyteus_run_bindings`).all() as Array<{ application_id: string | null }>;
        for (const row of rows) {
          if (typeof row.application_id === "string" && row.application_id.trim()) {
            applicationIds.add(row.application_id.trim());
          }
        }
      } finally {
        db.close();
      }
    }
    return Array.from(applicationIds).sort((left, right) => left.localeCompare(right));
  }

  async persistBinding(summary: ApplicationAgentBindingRecord): Promise<ApplicationAgentBindingRecord> {
    const current = ApplicationRunBindingRecordCodec.decode(summary);
    return this.platformStateStore.withTransaction(current.applicationId, (db) => {
      ensureTables(db);
      const resourceColumns = normalizeResourceColumns(current.executionResourceRef);
      db.prepare(
        `INSERT INTO __autobyteus_run_bindings (
           binding_id,
           launch_request_id,
           status,
           runtime_subject,
           agent_run_id,
           team_run_id,
           definition_id,
           resource_owner,
           resource_kind,
           resource_local_id,
           resource_definition_id,
           created_at,
           updated_at,
           terminated_at,
           last_error_message,
           summary_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(binding_id) DO UPDATE SET
           launch_request_id = excluded.launch_request_id,
           status = excluded.status,
           runtime_subject = excluded.runtime_subject,
           agent_run_id = excluded.agent_run_id,
           team_run_id = excluded.team_run_id,
           definition_id = excluded.definition_id,
           resource_owner = excluded.resource_owner,
           resource_kind = excluded.resource_kind,
           resource_local_id = excluded.resource_local_id,
           resource_definition_id = excluded.resource_definition_id,
           created_at = excluded.created_at,
           updated_at = excluded.updated_at,
           terminated_at = excluded.terminated_at,
           last_error_message = excluded.last_error_message,
           summary_json = excluded.summary_json`,
      ).run(
        current.bindingId,
        current.launchRequestId,
        current.status,
        current.runtime.subject,
        current.runtime.subject === "AGENT_RUN" ? current.runtime.agentRunId : null,
        current.runtime.subject === "TEAM_RUN" ? current.runtime.teamRunId : null,
        current.runtime.definitionId,
        resourceColumns.source,
        resourceColumns.kind,
        resourceColumns.localId,
        resourceColumns.definitionId,
        current.createdAt,
        current.updatedAt,
        current.terminatedAt,
        current.lastErrorMessage,
        JSON.stringify(current),
      );

      db.prepare(`DELETE FROM __autobyteus_run_binding_members WHERE binding_id = ?`).run(current.bindingId);
      const insertMember = db.prepare(
        `INSERT INTO __autobyteus_run_binding_members (
           binding_id,
           member_address,
           display_name,
           agent_run_id,
           runtime_kind
         ) VALUES (?, ?, ?, ?, ?)`,
      );
      for (const member of current.runtime.members) {
        insertMember.run(
          current.bindingId,
          member.memberAddress,
          member.displayName,
          member.agentRunId,
          APPLICATION_AGENT_TEAM_MEMBER_STORAGE_RUNTIME_KIND,
        );
      }
      return cloneSummary(current);
    });
  }

  async getBinding(
    applicationId: string,
    bindingId: string,
  ): Promise<ApplicationAgentBindingRecord | null> {
    const result = await this.platformStateStore.withExistingDatabase(applicationId, (db) => {
      if (!hasBindingState(db)) return null;
      const row = db
        .prepare(`SELECT summary_json FROM __autobyteus_run_bindings WHERE binding_id = ? LIMIT 1`)
        .get(bindingId) as { summary_json: string } | undefined;
      return row ? cloneSummary(hydrateSummary(row)) : null;
    });
    return result ?? null;
  }

  async findBindingByLaunchRequestId(
    applicationId: string,
    launchRequestId: string,
  ): Promise<ApplicationAgentBindingRecord | null> {
    const result = await this.platformStateStore.withExistingDatabase(applicationId, (db) => {
      if (!hasBindingState(db)) return null;
      const row = db
        .prepare(
          `SELECT summary_json
             FROM __autobyteus_run_bindings
            WHERE launch_request_id = ?
            LIMIT 1`,
        )
        .get(launchRequestId.trim()) as { summary_json: string } | undefined;
      return row ? cloneSummary(hydrateSummary(row)) : null;
    });
    return result ?? null;
  }

  async listBindings(
    applicationId: string,
    filter?: ApplicationAgentBindingListFilter | null,
  ): Promise<ApplicationAgentBindingRecord[]> {
    const result = await this.platformStateStore.withExistingDatabase(applicationId, (db) => {
      if (!hasBindingState(db)) return [];
      const conditions = ["1 = 1"];
      const params: Array<string> = [];
      if (filter?.status?.trim()) {
        conditions.push("status = ?");
        params.push(filter.status.trim());
      }
      const rows = db
        .prepare(
          `SELECT summary_json
             FROM __autobyteus_run_bindings
            WHERE ${conditions.join(" AND ")}
            ORDER BY updated_at DESC, created_at DESC`,
        )
        .all(...params) as Array<{ summary_json: string }>;
      return rows.map((row) => cloneSummary(hydrateSummary(row)));
    });
    return result ?? [];
  }

  async listNonterminalBindings(applicationId: string): Promise<ApplicationAgentBindingRecord[]> {
    const result = await this.platformStateStore.withExistingDatabase(applicationId, (db) => {
      if (!hasBindingState(db)) return [];
      const rows = db
        .prepare(
          `SELECT summary_json
             FROM __autobyteus_run_bindings
            WHERE status IN ('ATTACHED', 'TERMINATING', 'FAILED')
            ORDER BY updated_at DESC`,
        )
        .all() as Array<{ summary_json: string }>;
      return rows.map((row) => cloneSummary(hydrateSummary(row)));
    });
    return result ?? [];
  }
}
