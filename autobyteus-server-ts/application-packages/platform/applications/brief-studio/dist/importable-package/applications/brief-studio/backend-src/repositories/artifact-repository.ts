import type { DatabaseSync } from "node:sqlite";
import type { BriefArtifactKind, BriefArtifactRecord } from "../domain/artifact-model.js";
import { parseJson, stringifyJson } from "./app-database.js";

type ArtifactRow = {
  brief_id: string;
  artifact_kind: BriefArtifactKind;
  artifact_key: string;
  artifact_type: string;
  title: string;
  summary: string | null;
  artifact_ref_json: string;
  metadata_json: string | null;
  is_final: number;
  producer_member_route_key: string;
  updated_at: string;
};

const mapRow = (row: ArtifactRow): BriefArtifactRecord => ({
  briefId: row.brief_id,
  artifactKind: row.artifact_kind,
  artifactKey: row.artifact_key,
  artifactType: row.artifact_type,
  title: row.title,
  summary: row.summary,
  artifactRef: parseJson(row.artifact_ref_json),
  metadata: row.metadata_json ? (parseJson(row.metadata_json) as Record<string, unknown>) : null,
  isFinal: row.is_final === 1,
  producerMemberRouteKey: row.producer_member_route_key,
  updatedAt: row.updated_at,
});

export const createArtifactRepository = (db: DatabaseSync) => ({
  upsertArtifact(input: {
    briefId: string;
    artifactKind: BriefArtifactKind;
    artifactKey: string;
    artifactType: string;
    title: string;
    summary: string | null;
    artifactRef: unknown;
    metadata: Record<string, unknown> | null;
    isFinal: boolean;
    producerMemberRouteKey: string;
    updatedAt: string;
  }): void {
    db.prepare(
      `INSERT INTO brief_artifacts (
        brief_id,
        artifact_kind,
        artifact_key,
        artifact_type,
        title,
        summary,
        artifact_ref_json,
        metadata_json,
        is_final,
        producer_member_route_key,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(brief_id, artifact_kind) DO UPDATE SET
        artifact_key = excluded.artifact_key,
        artifact_type = excluded.artifact_type,
        title = excluded.title,
        summary = excluded.summary,
        artifact_ref_json = excluded.artifact_ref_json,
        metadata_json = excluded.metadata_json,
        is_final = excluded.is_final,
        producer_member_route_key = excluded.producer_member_route_key,
        updated_at = excluded.updated_at`,
    ).run(
      input.briefId,
      input.artifactKind,
      input.artifactKey,
      input.artifactType,
      input.title,
      input.summary,
      stringifyJson(input.artifactRef),
      input.metadata ? stringifyJson(input.metadata) : null,
      input.isFinal ? 1 : 0,
      input.producerMemberRouteKey,
      input.updatedAt,
    );
  },

  listByBriefId(briefId: string): BriefArtifactRecord[] {
    const rows = db
      .prepare(
        `SELECT brief_id, artifact_kind, artifact_key, artifact_type, title, summary, artifact_ref_json, metadata_json, is_final, producer_member_route_key, updated_at
         FROM brief_artifacts
         WHERE brief_id = ?
         ORDER BY CASE artifact_kind WHEN 'researcher' THEN 1 ELSE 2 END`,
      )
      .all(briefId) as ArtifactRow[];
    return rows.map(mapRow);
  },
});
