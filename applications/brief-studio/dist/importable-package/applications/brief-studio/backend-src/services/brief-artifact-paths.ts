import type {
  BriefArtifactKind,
  BriefArtifactPublicationKind,
} from "../domain/artifact-model.js";
import type { BriefStatus } from "../domain/brief-model.js";

export type BriefArtifactPathRule = {
  artifactKind: BriefArtifactKind;
  publicationKind: BriefArtifactPublicationKind;
  path: string;
  readyForReview: boolean;
  resolveStatus: (currentStatus: BriefStatus | null) => BriefStatus;
};

const preserveTerminalStatus = (
  nextStatus: BriefStatus,
  currentStatus: BriefStatus | null,
): BriefStatus => {
  if (currentStatus === "approved" || currentStatus === "rejected") {
    return currentStatus;
  }
  return nextStatus;
};

const buildRule = (
  input: Omit<BriefArtifactPathRule, "resolveStatus"> & {
    nextStatus: BriefStatus;
  },
): BriefArtifactPathRule => ({
  artifactKind: input.artifactKind,
  publicationKind: input.publicationKind,
  path: input.path,
  readyForReview: input.readyForReview,
  resolveStatus: (currentStatus) => preserveTerminalStatus(input.nextStatus, currentStatus),
});

const RULES_BY_PRODUCER: Record<string, Record<string, BriefArtifactPathRule>> = {
  researcher: {
    "brief-studio/research.md": buildRule({
      artifactKind: "researcher",
      publicationKind: "research",
      path: "brief-studio/research.md",
      readyForReview: false,
      nextStatus: "researching",
    }),
    "brief-studio/research-blocker.md": buildRule({
      artifactKind: "researcher",
      publicationKind: "research_blocker",
      path: "brief-studio/research-blocker.md",
      readyForReview: false,
      nextStatus: "blocked",
    }),
  },
  writer: {
    "brief-studio/brief-draft.md": buildRule({
      artifactKind: "writer",
      publicationKind: "draft",
      path: "brief-studio/brief-draft.md",
      readyForReview: false,
      nextStatus: "draft_ready",
    }),
    "brief-studio/final-brief.md": buildRule({
      artifactKind: "writer",
      publicationKind: "final",
      path: "brief-studio/final-brief.md",
      readyForReview: true,
      nextStatus: "in_review",
    }),
    "brief-studio/brief-blocker.md": buildRule({
      artifactKind: "writer",
      publicationKind: "writer_blocker",
      path: "brief-studio/brief-blocker.md",
      readyForReview: false,
      nextStatus: "blocked",
    }),
  },
};

const normalizeArtifactPath = (artifactPath: string): string =>
  artifactPath.replace(/\\/g, "/").trim();

const basenameOf = (normalizedPath: string): string => {
  const segments = normalizedPath.split("/").filter((segment) => segment.length > 0);
  return segments.at(-1) ?? normalizedPath;
};

const buildBasenameRules = (
  rulesByPath: Record<string, BriefArtifactPathRule>,
): Record<string, BriefArtifactPathRule> => {
  const entriesByBasename = new Map<string, BriefArtifactPathRule | null>();
  for (const rule of Object.values(rulesByPath)) {
    const basename = basenameOf(rule.path);
    entriesByBasename.set(
      basename,
      entriesByBasename.has(basename) ? null : rule,
    );
  }

  return Object.fromEntries(
    [...entriesByBasename.entries()].filter((entry): entry is [string, BriefArtifactPathRule] =>
      entry[1] !== null),
  );
};

const BASENAME_RULES_BY_PRODUCER: Record<string, Record<string, BriefArtifactPathRule>> =
  Object.fromEntries(
    Object.entries(RULES_BY_PRODUCER).map(([producer, rules]) => [
      producer,
      buildBasenameRules(rules),
    ]),
  );

const extractBriefStudioSuffix = (normalizedPath: string): string | null => {
  const appFolderMarker = "/brief-studio/";
  const markerIndex = normalizedPath.lastIndexOf(appFolderMarker);
  if (markerIndex < 0) {
    return normalizedPath.startsWith("brief-studio/") ? normalizedPath : null;
  }
  return normalizedPath.slice(markerIndex + 1);
};

export const resolveBriefArtifactPathRule = (
  memberRouteKey: string,
  artifactPath: string,
): BriefArtifactPathRule => {
  const normalizedRouteKey = memberRouteKey.trim();
  const normalizedPath = normalizeArtifactPath(artifactPath);
  const producerRules = RULES_BY_PRODUCER[normalizedRouteKey];
  if (!producerRules) {
    throw new Error(
      `Unexpected Brief Studio artifact producer '${memberRouteKey}'. Expected 'researcher' or 'writer'.`,
    );
  }

  const suffixPath = extractBriefStudioSuffix(normalizedPath);
  const rule = producerRules[normalizedPath]
    ?? (suffixPath ? producerRules[suffixPath] : undefined)
    ?? BASENAME_RULES_BY_PRODUCER[normalizedRouteKey]?.[basenameOf(normalizedPath)];
  if (!rule) {
    throw new Error(
      `Unexpected Brief Studio artifact path '${artifactPath}' for producer '${memberRouteKey}'.`,
    );
  }

  return rule;
};
