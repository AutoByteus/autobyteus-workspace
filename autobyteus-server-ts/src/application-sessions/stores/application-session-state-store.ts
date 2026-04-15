import type { DatabaseSync } from "node:sqlite";
import { ApplicationPlatformStateStore } from "../../application-storage/stores/application-platform-state-store.js";
import type {
  ApplicationSessionBinding,
  ApplicationSessionBindingResolution,
  ApplicationSessionSnapshot,
} from "../domain/models.js";

const cloneSnapshot = (snapshot: ApplicationSessionSnapshot): ApplicationSessionSnapshot => structuredClone(snapshot);

type SessionIndexRow = {
  application_session_id: string;
  application_id: string;
  status: string;
  active: number;
  created_at: string;
  terminated_at: string | null;
  runtime_kind: string;
  runtime_run_id: string;
  runtime_definition_id: string;
};

type SessionProjectionRow = {
  application_session_id: string;
  application_id: string;
  snapshot_json: string;
  updated_at: string;
};

export class ApplicationSessionStateStore {
  constructor(
    private readonly dependencies: {
      platformStateStore?: ApplicationPlatformStateStore;
    } = {},
  ) {}

  private get platformStateStore(): ApplicationPlatformStateStore {
    return this.dependencies.platformStateStore ?? new ApplicationPlatformStateStore();
  }

  async persistLiveSession(snapshot: ApplicationSessionSnapshot): Promise<ApplicationSessionSnapshot> {
    return this.platformStateStore.withTransaction(snapshot.application.applicationId, (db) => {
      db.prepare(
        `UPDATE __autobyteus_session_index
            SET active = 0
          WHERE application_id = ?`,
      ).run(snapshot.application.applicationId);
      this.writeSessionSnapshot(db, snapshot, "live", 1);
      return cloneSnapshot(snapshot);
    });
  }

  async persistSessionUpdate(snapshot: ApplicationSessionSnapshot): Promise<ApplicationSessionSnapshot> {
    const active = snapshot.terminatedAt ? 0 : 1;
    const status = snapshot.terminatedAt ? "terminated" : "live";
    return this.platformStateStore.withTransaction(snapshot.application.applicationId, (db) => {
      this.writeSessionSnapshot(db, snapshot, status, active);
      return cloneSnapshot(snapshot);
    });
  }

  async getSessionById(
    applicationId: string,
    applicationSessionId: string,
  ): Promise<ApplicationSessionSnapshot | null> {
    return this.platformStateStore.withDatabase(applicationId, (db) => this.readSessionSnapshot(db, applicationSessionId));
  }

  async findSessionById(
    applicationIds: string[],
    applicationSessionId: string,
  ): Promise<ApplicationSessionSnapshot | null> {
    const applicationId = await this.resolveSessionApplicationId(applicationIds, applicationSessionId);
    if (!applicationId) {
      return null;
    }
    return this.getSessionById(applicationId, applicationSessionId);
  }

  async applicationSessionBinding(
    applicationId: string,
    requestedSessionId?: string | null,
  ): Promise<ApplicationSessionBinding> {
    return this.platformStateStore.withDatabase(applicationId, (db) => {
      const normalizedRequestedSessionId = requestedSessionId?.trim() || null;
      if (normalizedRequestedSessionId) {
        const requestedSession = this.readSessionSnapshot(db, normalizedRequestedSessionId);
        if (requestedSession && requestedSession.terminatedAt === null) {
          return this.buildBinding(
            applicationId,
            normalizedRequestedSessionId,
            requestedSession.applicationSessionId,
            "requested_live",
            requestedSession,
          );
        }
      }

      const activeRow = db
        .prepare(
          `SELECT application_session_id
             FROM __autobyteus_session_index
            WHERE application_id = ?
              AND active = 1
            ORDER BY created_at DESC
            LIMIT 1`,
        )
        .get(applicationId) as { application_session_id: string } | undefined;
      if (activeRow?.application_session_id) {
        const activeSession = this.readSessionSnapshot(db, activeRow.application_session_id);
        if (activeSession && activeSession.terminatedAt === null) {
          return this.buildBinding(
            applicationId,
            normalizedRequestedSessionId,
            activeSession.applicationSessionId,
            "application_active",
            activeSession,
          );
        }
      }

      return this.buildBinding(applicationId, normalizedRequestedSessionId, null, "none", null);
    });
  }

  writeSessionSnapshot(
    db: DatabaseSync,
    snapshot: ApplicationSessionSnapshot,
    status: string,
    active: number,
  ): void {
    db.prepare(
      `INSERT INTO __autobyteus_session_index (
         application_session_id,
         application_id,
         status,
         active,
         created_at,
         terminated_at,
         runtime_kind,
         runtime_run_id,
         runtime_definition_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(application_session_id) DO UPDATE SET
         application_id = excluded.application_id,
         status = excluded.status,
         active = excluded.active,
         created_at = excluded.created_at,
         terminated_at = excluded.terminated_at,
         runtime_kind = excluded.runtime_kind,
         runtime_run_id = excluded.runtime_run_id,
         runtime_definition_id = excluded.runtime_definition_id`,
    ).run(
      snapshot.applicationSessionId,
      snapshot.application.applicationId,
      status,
      active,
      snapshot.createdAt,
      snapshot.terminatedAt,
      snapshot.runtime.kind,
      snapshot.runtime.runId,
      snapshot.runtime.definitionId,
    );
    db.prepare(
      `INSERT INTO __autobyteus_session_projection (
         application_session_id,
         application_id,
         snapshot_json,
         updated_at
       ) VALUES (?, ?, ?, ?)
       ON CONFLICT(application_session_id) DO UPDATE SET
         application_id = excluded.application_id,
         snapshot_json = excluded.snapshot_json,
         updated_at = excluded.updated_at`,
    ).run(
      snapshot.applicationSessionId,
      snapshot.application.applicationId,
      JSON.stringify(snapshot),
      new Date().toISOString(),
    );
  }

  readSessionSnapshot(db: DatabaseSync, applicationSessionId: string): ApplicationSessionSnapshot | null {
    const row = db
      .prepare(
        `SELECT snapshot_json
           FROM __autobyteus_session_projection
          WHERE application_session_id = ?`,
      )
      .get(applicationSessionId) as SessionProjectionRow | undefined;
    if (!row?.snapshot_json) {
      return null;
    }
    return JSON.parse(row.snapshot_json) as ApplicationSessionSnapshot;
  }

  private buildBinding(
    applicationId: string,
    requestedSessionId: string | null,
    resolvedSessionId: string | null,
    resolution: ApplicationSessionBindingResolution,
    session: ApplicationSessionSnapshot | null,
  ): ApplicationSessionBinding {
    return {
      applicationId,
      requestedSessionId,
      resolvedSessionId,
      resolution,
      session: session ? cloneSnapshot(session) : null,
    };
  }

  private async resolveSessionApplicationId(
    applicationIds: string[],
    applicationSessionId: string,
  ): Promise<string | null> {
    for (const applicationId of applicationIds) {
      const matchedApplicationId = await this.platformStateStore.withExistingDatabase(applicationId, (db) => {
        const row = db
          .prepare(
            `SELECT application_id
               FROM __autobyteus_session_index
              WHERE application_session_id = ?
              LIMIT 1`,
          )
          .get(applicationSessionId) as Pick<SessionIndexRow, "application_id"> | undefined;
        return row?.application_id ?? null;
      });
      if (matchedApplicationId) {
        return matchedApplicationId;
      }
    }
    return null;
  }
}
