import { randomUUID } from "node:crypto";
import {
  buildEffectiveTeamRunLaunch,
  type ApplicationHandlerContext,
} from "@autobyteus/application-backend-sdk";
import type { BriefDetail, BriefStatus } from "../domain/brief-model.js";
import { withAppDatabase, withTransaction } from "../repositories/app-database.js";
import { createArtifactRepository } from "../repositories/artifact-repository.js";
import { createBriefBindingRepository } from "../repositories/brief-binding-repository.js";
import { createBriefRepository } from "../repositories/brief-repository.js";
import { createPendingLaunchRequestRepository } from "../repositories/pending-launch-request-repository.js";
import { createReviewNoteRepository } from "../repositories/review-note-repository.js";
import { createRunBindingCorrelationService } from "./run-binding-correlation-service.js";

const DRAFTING_TEAM_SLOT_KEY = "draftingTeam" as const;

const requireNonEmptyString = (value: string | null | undefined, fieldName: string): string => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const buildInitialInputText = (input: {
  title: string;
  latestWriterSummary: string | null;
  latestWriterBody: string | null;
  reviewNotes: string[];
}): string => {
  const sections = [
    `Create or revise a reviewable brief titled "${input.title}".`,
    "Follow each bundled role's own ordered instructions. Configured tool selection covers only routed capabilities; Luna's built-in apply_patch is not a configured tool name.",
    "Researcher: call get_brief_context exactly once first, use Luna's built-in apply_patch without run_bash to create brief-studio/research.md, publish that canonical relative path, then hand /writer the exact marker, path, and complete 200-500-word research body verbatim.",
    "Writer: after the handoff, call get_brief_context exactly once first, use the complete message body without read_file or cross-workspace access, copy at least one complete non-marker Key findings bullet verbatim under Key evidence, then use Luna's built-in apply_patch without run_bash to create and relatively publish brief-studio/final-brief.md.",
    "React only to provider-reported patch success or failure; do not inspect provider protocol events or internal normalized traces. On a context, handoff, built-in-patch, or publication failure, stop normal publication and report truthfully without shell fallback or a fabricated artifact. The application binding supplies routing identity; do not pass or guess applicationId, bindingId, or briefId as tool arguments.",
  ];

  if (input.latestWriterSummary) {
    sections.push(`Current projected writer summary: ${input.latestWriterSummary}`);
  }
  if (input.latestWriterBody) {
    sections.push(`Current projected writer body: ${input.latestWriterBody}`);
  }
  if (input.reviewNotes.length > 0) {
    sections.push(`Review notes to address:\n- ${input.reviewNotes.join("\n- ")}`);
  }

  return sections.join("\n\n");
};

const resolveLaunchProjection = (input: {
  brief: {
    title: string;
    status: BriefStatus;
  };
  currentBrief: Pick<
    BriefDetail,
    "title" | "status" | "updatedAt" | "latestBindingId" | "latestBindingStatus" | "lastErrorMessage"
  > | null;
  binding: {
    bindingId: string;
    status: string;
  };
  launchedAt: string;
}): {
  title: string;
  status: BriefStatus;
  updatedAt: string;
  latestBindingStatus: string;
  lastErrorMessage: string | null;
} => {
  const currentBindingProjection = input.currentBrief?.latestBindingId === input.binding.bindingId
    ? input.currentBrief
    : null;

  return {
    title: currentBindingProjection?.title ?? input.brief.title,
    status: currentBindingProjection?.status ?? (
      input.brief.status === "approved" || input.brief.status === "rejected"
        ? input.brief.status
        : "researching"
    ),
    updatedAt: currentBindingProjection?.updatedAt ?? input.launchedAt,
    latestBindingStatus: currentBindingProjection?.latestBindingStatus ?? input.binding.status,
    lastErrorMessage: currentBindingProjection?.lastErrorMessage ?? null,
  };
};

export const createBriefRunLaunchService = (context: ApplicationHandlerContext) => ({
  async createBrief(input: { title: string }) {
    const title = requireNonEmptyString(input.title, "title");
    const briefId = `brief-${randomUUID()}`;
    const createdAt = new Date().toISOString();

    const brief = withAppDatabase(context.storage.appDatabasePath, (db) => {
      withTransaction(db, () => {
        createBriefRepository(db).upsertProjectedBrief({
          briefId,
          title,
          status: "not_started",
          updatedAt: createdAt,
          latestBindingId: null,
          latestRunId: null,
          latestBindingStatus: null,
          lastErrorMessage: null,
        });
      });
      return createBriefRepository(db).getById(briefId);
    });

    if (!brief) {
      throw new Error(`Brief '${briefId}' was not created.`);
    }

    await context.publishNotification("brief.created", {
      briefId,
      createdAt,
    });

    return brief;
  },

  async launchDraftRun(input: { briefId: string }) {
    const briefId = requireNonEmptyString(input.briefId, "briefId");
    const correlationService = createRunBindingCorrelationService(context);

    const launchContext = withAppDatabase(context.storage.appDatabasePath, (db) => {
      const briefRepository = createBriefRepository(db);
      const artifactRepository = createArtifactRepository(db);
      const reviewNoteRepository = createReviewNoteRepository(db);
      const brief = briefRepository.getById(briefId);
      if (!brief) {
        throw new Error(`Brief '${briefId}' was not found.`);
      }

      const writerArtifact = artifactRepository
        .listByBriefId(briefId)
        .find((artifact) => artifact.artifactKind === "writer") ?? null;
      const reviewNotes = reviewNoteRepository
        .listByBriefId(briefId)
        .map((note) => note.body.trim())
        .filter(Boolean);

      return {
        brief,
        latestWriterSummary: writerArtifact?.description?.trim() || null,
        latestWriterBody: writerArtifact?.body?.trim() || null,
        reviewNotes,
      };
    });

    const launchedAt = new Date().toISOString();
    const pendingLaunchRequest = correlationService.createPendingLaunchRequest(briefId);
    const draftingTeam = await context.agentResources.requireRunnable(DRAFTING_TEAM_SLOT_KEY);

    try {
      const binding = await context.agentExecution.startAgentTeam({
        launchRequestId: pendingLaunchRequest.launchRequestId,
        executionResourceRef: draftingTeam.executionResourceRef,
        launch: buildEffectiveTeamRunLaunch({
          configuration: draftingTeam,
        }),
        initialInput: {
          text: buildInitialInputText({
            title: launchContext.brief.title,
            latestWriterSummary: launchContext.latestWriterSummary,
            latestWriterBody: launchContext.latestWriterBody,
            reviewNotes: launchContext.reviewNotes,
          }),
          metadata: {
            briefId,
            title: launchContext.brief.title,
          },
        },
      });

      withAppDatabase(context.storage.appDatabasePath, (db) => {
        withTransaction(db, () => {
          const briefRepository = createBriefRepository(db);
          createPendingLaunchRequestRepository(db).markCommitted({
            launchRequestId: binding.launchRequestId,
            bindingId: binding.bindingId,
            committedAt: launchedAt,
          });
          createBriefBindingRepository(db).upsertBinding({
            briefId,
            bindingId: binding.bindingId,
            launchRequestId: binding.launchRequestId,
            runId: binding.runtime.teamRunId,
            createdAt: binding.createdAt,
            updatedAt: launchedAt,
            artifactCatchupCompletedAt: null,
          });
          const launchProjection = resolveLaunchProjection({
            brief: launchContext.brief,
            currentBrief: briefRepository.getById(briefId),
            binding,
            launchedAt,
          });
          briefRepository.upsertProjectedBrief({
            briefId,
            title: launchProjection.title,
            status: launchProjection.status,
            updatedAt: launchProjection.updatedAt,
            latestBindingId: binding.bindingId,
            latestRunId: binding.runtime.teamRunId,
            latestBindingStatus: launchProjection.latestBindingStatus,
            lastErrorMessage: launchProjection.lastErrorMessage,
          });
        });
      });

      await context.publishNotification("brief.draft_run_started", {
        briefId,
        bindingId: binding.bindingId,
        runId: binding.runtime.teamRunId,
        launchedAt,
      });

      return {
        briefId,
        bindingId: binding.bindingId,
        runId: binding.runtime.teamRunId,
        status: binding.status,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const reconciled = await correlationService.reconcileLaunchRequest(pendingLaunchRequest.launchRequestId);
      withAppDatabase(context.storage.appDatabasePath, (db) => {
        withTransaction(db, () => {
          createBriefRepository(db).upsertProjectedBrief({
            briefId,
            title: launchContext.brief.title,
            status: launchContext.brief.status === "approved" || launchContext.brief.status === "rejected"
              ? launchContext.brief.status
              : "blocked",
            updatedAt: launchedAt,
            latestBindingId: reconciled?.binding.bindingId ?? null,
            latestRunId: reconciled ? (reconciled.binding.runtime.subject === "AGENT_RUN" ? reconciled.binding.runtime.agentRunId : reconciled.binding.runtime.teamRunId) : null,
            latestBindingStatus: reconciled?.binding.status ?? "FAILED",
            lastErrorMessage: message,
          });
        });
      });
      throw error;
    }
  },
});
