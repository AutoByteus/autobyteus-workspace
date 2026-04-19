import type {
  ApplicationExecutionEventEnvelope,
  ApplicationHandlerContext,
} from "@autobyteus/application-backend-sdk";
import type { BriefArtifactKind } from "../domain/artifact-model.js";
import type { BriefStatus } from "../domain/brief-model.js";
import { createArtifactRepository } from "../repositories/artifact-repository.js";
import { withAppDatabase, withTransaction } from "../repositories/app-database.js";
import { createBriefRepository } from "../repositories/brief-repository.js";
import { createProcessedEventRepository } from "../repositories/processed-event-repository.js";

type ArtifactPayload = {
  artifactKey: string;
  artifactType: string;
  title?: string | null;
  summary?: string | null;
  artifactRef: unknown;
  metadata?: Record<string, unknown> | null;
  isFinal?: boolean | null;
};

type BriefArtifactRule = {
  artifactKind: BriefArtifactKind;
  allowedArtifactTypes: readonly string[];
  resolveStatus: (artifactType: string, currentStatus: BriefStatus | null) => BriefStatus;
};

const deriveFallbackTitle = (briefId: string): string =>
  `Brief ${briefId.slice(0, 8)}`;

const preserveTerminalStatus = (
  nextStatus: BriefStatus,
  currentStatus: BriefStatus | null,
): BriefStatus => {
  if (currentStatus === "approved" || currentStatus === "rejected") {
    return currentStatus;
  }
  return nextStatus;
};

const BRIEF_ARTIFACT_RULES: Record<"researcher" | "writer", BriefArtifactRule> = {
  researcher: {
    artifactKind: "researcher",
    allowedArtifactTypes: ["research_note", "source_summary", "research_blocker_note"],
    resolveStatus: (artifactType, currentStatus) => preserveTerminalStatus(
      artifactType === "research_blocker_note" ? "blocked" : "researching",
      currentStatus,
    ),
  },
  writer: {
    artifactKind: "writer",
    allowedArtifactTypes: ["brief_draft", "final_brief", "brief_blocker_note"],
    resolveStatus: (artifactType, currentStatus) => preserveTerminalStatus(
      artifactType === "brief_blocker_note"
        ? "blocked"
        : artifactType === "final_brief"
          ? "in_review"
          : "draft_ready",
      currentStatus,
    ),
  },
};

const resolveArtifactRule = (memberRouteKey: string, artifactType: string): BriefArtifactRule => {
  const rule = BRIEF_ARTIFACT_RULES[
    memberRouteKey as keyof typeof BRIEF_ARTIFACT_RULES
  ];
  if (!rule) {
    throw new Error(
      `Unexpected Brief Studio artifact producer '${memberRouteKey}'. Expected 'researcher' or 'writer'.`,
    );
  }
  if (!rule.allowedArtifactTypes.includes(artifactType)) {
    throw new Error(
      `Unexpected Brief Studio artifactType '${artifactType}' for producer '${memberRouteKey}'. Allowed values: ${rule.allowedArtifactTypes.join(", ")}.`,
    );
  }
  return rule;
};

const resolveLifecycleStatus = (
  family: string,
  currentStatus: BriefStatus | null,
): BriefStatus => {
  switch (family) {
    case "RUN_STARTED":
      return preserveTerminalStatus(currentStatus ?? "researching", currentStatus);
    case "RUN_FAILED":
    case "RUN_ORPHANED":
      return preserveTerminalStatus("blocked", currentStatus);
    case "RUN_TERMINATED":
      return currentStatus ?? "blocked";
    default:
      return currentStatus ?? "researching";
  }
};

export const projectExecutionEvent = async (
  envelope: ApplicationExecutionEventEnvelope,
  context: ApplicationHandlerContext,
): Promise<void> => {
  const event = envelope.event;
  const briefId = event.executionRef.trim();
  if (!briefId) {
    throw new Error("Brief Studio received an execution event without executionRef.");
  }

  const readyNotification = withAppDatabase(context.storage.appDatabasePath, (db) =>
    withTransaction(db, () => {
      const briefRepository = createBriefRepository(db);
      const artifactRepository = createArtifactRepository(db);
      const processedEventRepository = createProcessedEventRepository(db);

      if (!processedEventRepository.claimEvent({
        eventId: event.eventId,
        briefId,
        journalSequence: event.journalSequence,
        processedAt: event.publishedAt,
      })) {
        return null;
      }

      const currentBrief = briefRepository.getById(briefId);
      const fallbackTitle = currentBrief?.title || deriveFallbackTitle(briefId);

      if (event.family === "ARTIFACT") {
        if (!event.producer?.memberRouteKey) {
          throw new Error("Brief Studio artifact projection requires producer.memberRouteKey.");
        }

        const payload = event.payload as ArtifactPayload;
        const artifactRule = resolveArtifactRule(event.producer.memberRouteKey, payload.artifactType);
        const title = payload.title?.trim() || currentBrief?.title || fallbackTitle;
        const nextStatus = artifactRule.resolveStatus(payload.artifactType, currentBrief?.status ?? null);

        briefRepository.upsertProjectedBrief({
          briefId,
          title,
          status: nextStatus,
          updatedAt: event.publishedAt,
          latestBindingId: event.binding.bindingId,
          latestRunId: event.binding.runtime.runId,
          latestBindingStatus: event.binding.status,
          lastErrorMessage: null,
        });

        artifactRepository.upsertArtifact({
          briefId,
          artifactKind: artifactRule.artifactKind,
          artifactKey: payload.artifactKey,
          artifactType: payload.artifactType,
          title,
          summary: payload.summary?.trim() || null,
          artifactRef: payload.artifactRef,
          metadata: payload.metadata ? structuredClone(payload.metadata) : null,
          isFinal: Boolean(payload.isFinal),
          producerMemberRouteKey: event.producer.memberRouteKey,
          updatedAt: event.publishedAt,
        });

        if (artifactRule.artifactKind === "writer" && payload.artifactType === "final_brief") {
          return {
            topic: "brief.ready_for_review",
            payload: {
              briefId,
              eventId: event.eventId,
              journalSequence: event.journalSequence,
              bindingId: event.binding.bindingId,
            },
          };
        }

        return null;
      }

      briefRepository.upsertProjectedBrief({
        briefId,
        title: fallbackTitle,
        status: resolveLifecycleStatus(event.family, currentBrief?.status ?? null),
        updatedAt: event.publishedAt,
        latestBindingId: event.binding.bindingId,
        latestRunId: event.binding.runtime.runId,
        latestBindingStatus: event.binding.status,
        lastErrorMessage: event.binding.lastErrorMessage ?? null,
      });

      return null;
    }),
  );

  if (readyNotification) {
    await context.publishNotification(readyNotification.topic, readyNotification.payload);
  }
};
