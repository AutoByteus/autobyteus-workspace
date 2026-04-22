import type { DatabaseSync } from "node:sqlite";
import type {
  BriefArtifactKind,
  BriefArtifactPublicationKind,
} from "../domain/artifact-model.js";

export const createBriefArtifactRevisionRepository = (db: DatabaseSync) => ({
  claimRevision(input: {
    revisionId: string;
    briefId: string;
    bindingId: string;
    runId: string;
    artifactKind: BriefArtifactKind;
    publicationKind: BriefArtifactPublicationKind;
    path: string;
    producerMemberRouteKey: string;
    publishedAt: string;
    projectedAt: string;
  }): boolean {
    const result = db.prepare(
      `INSERT OR IGNORE INTO brief_artifact_revisions (
        revision_id,
        brief_id,
        binding_id,
        run_id,
        artifact_kind,
        publication_kind,
        path,
        producer_member_route_key,
        published_at,
        projected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      input.revisionId,
      input.briefId,
      input.bindingId,
      input.runId,
      input.artifactKind,
      input.publicationKind,
      input.path,
      input.producerMemberRouteKey,
      input.publishedAt,
      input.projectedAt,
    );
    return Number(result.changes ?? 0) > 0;
  },
});
