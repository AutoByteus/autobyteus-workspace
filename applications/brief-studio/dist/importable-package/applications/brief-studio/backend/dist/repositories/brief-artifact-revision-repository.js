export const createBriefArtifactRevisionRepository = (db) => ({
    claimRevision(input) {
        const result = db.prepare(`INSERT OR IGNORE INTO brief_artifact_revisions (
        revision_id,
        brief_id,
        binding_id,
        run_id,
        artifact_kind,
        publication_kind,
        path,
        producer_member_address,
        published_at,
        projected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(input.revisionId, input.briefId, input.bindingId, input.runId, input.artifactKind, input.publicationKind, input.path, input.producerMemberAddress, input.publishedAt, input.projectedAt);
        return Number(result.changes ?? 0) > 0;
    },
});
