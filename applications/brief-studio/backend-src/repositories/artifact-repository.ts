import type { DatabaseSync } from "node:sqlite";
import type {
  BriefArtifactKind,
  BriefArtifactPublicationKind,
  BriefArtifactRecord,
} from "../domain/artifact-model.js";

type ArtifactRow = {
  brief_id: string;
  artifact_kind: BriefArtifactKind;
  publication_kind: BriefArtifactPublicationKind;
  revision_id: string;
  path: string;
  description: string | null;
  body: string;
  producer_member_route_key: string;
  updated_at: string;
};

const mapRow = (row: ArtifactRow): BriefArtifactRecord => ({
  briefId: row.brief_id,
  artifactKind: row.artifact_kind,
  publicationKind: row.publication_kind,
  revisionId: row.revision_id,
  path: row.path,
  description: row.description,
  body: row.body,
  producerMemberRouteKey: row.producer_member_route_key,
  updatedAt: row.updated_at,
});

export const createArtifactRepository = (db: DatabaseSync) => ({
  upsertArtifact(input: BriefArtifactRecord): void {
    db.prepare(
      `INSERT INTO brief_artifacts (
        brief_id,
        artifact_kind,
        publication_kind,
        revision_id,
        path,
        description,
        body,
        producer_member_route_key,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(brief_id, artifact_kind) DO UPDATE SET
        publication_kind = excluded.publication_kind,
        revision_id = excluded.revision_id,
        path = excluded.path,
        description = excluded.description,
        body = excluded.body,
        producer_member_route_key = excluded.producer_member_route_key,
        updated_at = excluded.updated_at`,
    ).run(
      input.briefId,
      input.artifactKind,
      input.publicationKind,
      input.revisionId,
      input.path,
      input.description,
      input.body,
      input.producerMemberRouteKey,
      input.updatedAt,
    );
  },

  listByBriefId(briefId: string): BriefArtifactRecord[] {
    const rows = db
      .prepare(
        `SELECT brief_id, artifact_kind, publication_kind, revision_id, path, description, body, producer_member_route_key, updated_at
           FROM brief_artifacts
          WHERE brief_id = ?
          ORDER BY CASE artifact_kind WHEN 'researcher' THEN 1 ELSE 2 END`,
      )
      .all(briefId) as ArtifactRow[];
    return rows.map(mapRow);
  },
});
