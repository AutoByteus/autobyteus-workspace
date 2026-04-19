import { ApplicationGlobalPlatformStateStore } from "../../application-storage/stores/application-global-platform-state-store.js";
import type { ApplicationRunLookupRecord } from "../domain/models.js";

export class ApplicationRunLookupStore {
  constructor(
    private readonly dependencies: {
      globalPlatformStateStore?: ApplicationGlobalPlatformStateStore;
    } = {},
  ) {}

  private get globalPlatformStateStore(): ApplicationGlobalPlatformStateStore {
    return this.dependencies.globalPlatformStateStore ?? new ApplicationGlobalPlatformStateStore();
  }

  getLookupByRunId(runId: string): ApplicationRunLookupRecord | null {
    return this.globalPlatformStateStore.withDatabase((db) => {
      const row = db
        .prepare(
          `SELECT run_id, application_id, binding_id
             FROM __autobyteus_application_run_lookup
            WHERE run_id = ?
            LIMIT 1`,
        )
        .get(runId) as { run_id: string; application_id: string; binding_id: string } | undefined;
      if (!row) {
        return null;
      }
      return {
        runId: row.run_id,
        applicationId: row.application_id,
        bindingId: row.binding_id,
      } satisfies ApplicationRunLookupRecord;
    });
  }

  replaceBindingLookups(applicationId: string, bindingId: string, runIds: string[]): void {
    this.globalPlatformStateStore.withTransaction((db) => {
      db.prepare(
        `DELETE FROM __autobyteus_application_run_lookup
          WHERE application_id = ?
            AND binding_id = ?`,
      ).run(applicationId, bindingId);
      const insertRow = db.prepare(
        `INSERT OR REPLACE INTO __autobyteus_application_run_lookup (
           run_id,
           application_id,
           binding_id,
           updated_at
         ) VALUES (?, ?, ?, ?)`,
      );
      const updatedAt = new Date().toISOString();
      for (const runId of Array.from(new Set(runIds.filter((value) => value.trim().length > 0)))) {
        insertRow.run(runId, applicationId, bindingId, updatedAt);
      }
    });
  }

  removeBindingLookups(applicationId: string, bindingId: string): void {
    this.globalPlatformStateStore.withTransaction((db) => {
      db.prepare(
        `DELETE FROM __autobyteus_application_run_lookup
          WHERE application_id = ?
            AND binding_id = ?`,
      ).run(applicationId, bindingId);
    });
  }

  clearApplication(applicationId: string): void {
    this.globalPlatformStateStore.withTransaction((db) => {
      db.prepare(`DELETE FROM __autobyteus_application_run_lookup WHERE application_id = ?`).run(applicationId);
    });
  }

  deleteRunId(runId: string): void {
    this.globalPlatformStateStore.withTransaction((db) => {
      db.prepare(`DELETE FROM __autobyteus_application_run_lookup WHERE run_id = ?`).run(runId);
    });
  }
}
