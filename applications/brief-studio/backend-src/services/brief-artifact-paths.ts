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

export const resolveBriefArtifactPathRule = (
  memberRouteKey: string,
  artifactPath: string,
): BriefArtifactPathRule => {
  const normalizedRouteKey = memberRouteKey.trim();
  const normalizedPath = artifactPath.replace(/\\/g, "/").trim();
  const producerRules = RULES_BY_PRODUCER[normalizedRouteKey];
  if (!producerRules) {
    throw new Error(
      `Unexpected Brief Studio artifact producer '${memberRouteKey}'. Expected 'researcher' or 'writer'.`,
    );
  }

  const rule = producerRules[normalizedPath];
  if (!rule) {
    throw new Error(
      `Unexpected Brief Studio artifact path '${artifactPath}' for producer '${memberRouteKey}'.`,
    );
  }

  return rule;
};

export const isBriefFinalArtifactPath = (artifactPath: string): boolean =>
  artifactPath.replace(/\\/g, "/").trim() === "brief-studio/final-brief.md";
