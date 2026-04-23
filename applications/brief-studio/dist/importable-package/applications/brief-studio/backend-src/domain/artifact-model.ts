export type BriefArtifactKind = "researcher" | "writer";

export type BriefArtifactPublicationKind =
  | "research"
  | "research_blocker"
  | "draft"
  | "final"
  | "writer_blocker";

export type BriefArtifactRecord = {
  briefId: string;
  artifactKind: BriefArtifactKind;
  publicationKind: BriefArtifactPublicationKind;
  revisionId: string;
  path: string;
  description: string | null;
  body: string;
  producerMemberRouteKey: string;
  updatedAt: string;
};
