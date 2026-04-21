import { parseJson, stringifyJson } from "./app-database.js";
const mapRow = (row) => ({
    briefId: row.brief_id,
    artifactKind: row.artifact_kind,
    artifactKey: row.artifact_key,
    artifactType: row.artifact_type,
    title: row.title,
    summary: row.summary,
    artifactRef: parseJson(row.artifact_ref_json),
    metadata: row.metadata_json ? parseJson(row.metadata_json) : null,
    isFinal: row.is_final === 1,
    producerMemberRouteKey: row.producer_member_route_key,
    updatedAt: row.updated_at,
});
export const createArtifactRepository = (db) => ({
    upsertArtifact(input) {
        db.prepare(`INSERT INTO brief_artifacts (
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
        updated_at = excluded.updated_at`).run(input.briefId, input.artifactKind, input.artifactKey, input.artifactType, input.title, input.summary, stringifyJson(input.artifactRef), input.metadata ? stringifyJson(input.metadata) : null, input.isFinal ? 1 : 0, input.producerMemberRouteKey, input.updatedAt);
    },
    listByBriefId(briefId) {
        const rows = db
            .prepare(`SELECT brief_id, artifact_kind, artifact_key, artifact_type, title, summary, artifact_ref_json, metadata_json, is_final, producer_member_route_key, updated_at
         FROM brief_artifacts
         WHERE brief_id = ?
         ORDER BY CASE artifact_kind WHEN 'researcher' THEN 1 ELSE 2 END`)
            .all(briefId);
        return rows.map(mapRow);
    },
});
