import type { DatabaseSync } from "node:sqlite";
import type {
  ApplicationRunBindingListFilter,
  ApplicationRunBindingSummary,
  ApplicationRuntimeResourceRef,
} from "@autobyteus/application-sdk-contracts";
import { ApplicationPlatformStateStore } from "../../application-storage/stores/application-platform-state-store.js";

const ensureTables = (db: DatabaseSync): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS __autobyteus_run_bindings (
      binding_id TEXT PRIMARY KEY,
      execution_ref TEXT NOT NULL,
      status TEXT NOT NULL,
      runtime_subject TEXT NOT NULL,
      run_id TEXT NOT NULL,
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
    CREATE INDEX IF NOT EXISTS __autobyteus_run_bindings_by_execution_ref
      ON __autobyteus_run_bindings (execution_ref, updated_at DESC);
    CREATE INDEX IF NOT EXISTS __autobyteus_run_bindings_by_status
      ON __autobyteus_run_bindings (status, updated_at DESC);

    CREATE TABLE IF NOT EXISTS __autobyteus_run_binding_members (
      binding_id TEXT NOT NULL,
      member_name TEXT NOT NULL,
      member_route_key TEXT NOT NULL,
      display_name TEXT NOT NULL,
      team_path_json TEXT NOT NULL,
      run_id TEXT NOT NULL,
      runtime_kind TEXT NOT NULL,
      PRIMARY KEY (binding_id, member_route_key)
    );
  `);
};

const cloneSummary = (summary: ApplicationRunBindingSummary): ApplicationRunBindingSummary => structuredClone(summary);

const hydrateSummary = (row: { summary_json: string }): ApplicationRunBindingSummary =>
  JSON.parse(row.summary_json) as ApplicationRunBindingSummary;

const normalizeResourceColumns = (resourceRef: ApplicationRuntimeResourceRef) => ({
  owner: resourceRef.owner,
  kind: resourceRef.kind,
  localId: resourceRef.owner === "bundle" ? resourceRef.localId : null,
  definitionId: resourceRef.owner === "shared" ? resourceRef.definitionId : null,
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

  async persistBinding(summary: ApplicationRunBindingSummary): Promise<ApplicationRunBindingSummary> {
    return this.platformStateStore.withTransaction(summary.applicationId, (db) => {
      ensureTables(db);
      const resourceColumns = normalizeResourceColumns(summary.resourceRef);
      db.prepare(
        `INSERT INTO __autobyteus_run_bindings (
           binding_id,
           execution_ref,
           status,
           runtime_subject,
           run_id,
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
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(binding_id) DO UPDATE SET
           execution_ref = excluded.execution_ref,
           status = excluded.status,
           runtime_subject = excluded.runtime_subject,
           run_id = excluded.run_id,
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
        summary.bindingId,
        summary.executionRef,
        summary.status,
        summary.runtime.subject,
        summary.runtime.runId,
        summary.runtime.definitionId,
        resourceColumns.owner,
        resourceColumns.kind,
        resourceColumns.localId,
        resourceColumns.definitionId,
        summary.createdAt,
        summary.updatedAt,
        summary.terminatedAt,
        summary.lastErrorMessage,
        JSON.stringify(summary),
      );

      db.prepare(`DELETE FROM __autobyteus_run_binding_members WHERE binding_id = ?`).run(summary.bindingId);
      const insertMember = db.prepare(
        `INSERT INTO __autobyteus_run_binding_members (
           binding_id,
           member_name,
           member_route_key,
           display_name,
           team_path_json,
           run_id,
           runtime_kind
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const member of summary.runtime.members) {
        insertMember.run(
          summary.bindingId,
          member.memberName,
          member.memberRouteKey,
          member.displayName,
          JSON.stringify(member.teamPath),
          member.runId,
          member.runtimeKind,
        );
      }
      return cloneSummary(summary);
    });
  }

  async getBinding(
    applicationId: string,
    bindingId: string,
  ): Promise<ApplicationRunBindingSummary | null> {
    return this.platformStateStore.withDatabase(applicationId, (db) => {
      ensureTables(db);
      const row = db
        .prepare(`SELECT summary_json FROM __autobyteus_run_bindings WHERE binding_id = ? LIMIT 1`)
        .get(bindingId) as { summary_json: string } | undefined;
      return row ? cloneSummary(hydrateSummary(row)) : null;
    });
  }

  async listBindings(
    applicationId: string,
    filter?: ApplicationRunBindingListFilter | null,
  ): Promise<ApplicationRunBindingSummary[]> {
    return this.platformStateStore.withDatabase(applicationId, (db) => {
      ensureTables(db);
      const conditions = ["1 = 1"];
      const params: Array<string> = [];
      if (filter?.executionRef?.trim()) {
        conditions.push("execution_ref = ?");
        params.push(filter.executionRef.trim());
      }
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
  }

  async listNonterminalBindings(applicationId: string): Promise<ApplicationRunBindingSummary[]> {
    return this.platformStateStore.withDatabase(applicationId, (db) => {
      ensureTables(db);
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
  }
}
