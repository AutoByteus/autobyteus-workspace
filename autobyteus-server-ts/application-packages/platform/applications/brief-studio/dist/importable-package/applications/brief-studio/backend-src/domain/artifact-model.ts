export type BriefArtifactKind = "researcher" | "writer";

export type BriefArtifactRecord = {
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
};
