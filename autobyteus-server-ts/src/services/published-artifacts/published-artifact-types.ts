export type PublishedArtifactFileKind =
  | "file"
  | "image"
  | "audio"
  | "video"
  | "pdf"
  | "csv"
  | "excel"
  | "other";

export type PublishedArtifactStatus = "available";

export type PublishedArtifactSummary = {
  id: string;
  runId: string;
  path: string;
  type: PublishedArtifactFileKind;
  status: PublishedArtifactStatus;
  description: string | null;
  revisionId: string;
  createdAt: string;
  updatedAt: string;
};

export type PublishedArtifactRevision = {
  revisionId: string;
  artifactId: string;
  runId: string;
  path: string;
  type: PublishedArtifactFileKind;
  description: string | null;
  createdAt: string;
  snapshotRelativePath: string;
  sourceFileName: string;
};

export type PublishedArtifactProjection = {
  version: 1;
  summaries: PublishedArtifactSummary[];
  revisions: PublishedArtifactRevision[];
};

export const EMPTY_PUBLISHED_ARTIFACT_PROJECTION: PublishedArtifactProjection = {
  version: 1,
  summaries: [],
  revisions: [],
};

export const normalizePublishedArtifactPath = (value: string): string =>
  value.replace(/\\/g, "/").trim();

export const buildPublishedArtifactId = (runId: string, artifactPath: string): string =>
  `${runId}:${normalizePublishedArtifactPath(artifactPath)}`;

export const normalizePublishedArtifactType = (
  value: string | null | undefined,
): PublishedArtifactFileKind => {
  switch (value) {
    case "image":
    case "audio":
    case "video":
    case "pdf":
    case "csv":
    case "excel":
    case "other":
      return value;
    default:
      return "file";
  }
};
