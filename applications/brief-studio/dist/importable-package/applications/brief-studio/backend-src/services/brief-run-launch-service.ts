import { randomUUID } from "node:crypto";
import type { ApplicationHandlerContext } from "@autobyteus/application-backend-sdk";
import { withAppDatabase, withTransaction } from "../repositories/app-database.js";
import { createArtifactRepository } from "../repositories/artifact-repository.js";
import { createBriefRepository } from "../repositories/brief-repository.js";
import { createReviewNoteRepository } from "../repositories/review-note-repository.js";

const BRIEF_STUDIO_TEAM_RESOURCE = {
  owner: "bundle",
  kind: "AGENT_TEAM",
  localId: "brief-studio-team",
} as const;

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
    "Use the bundled researcher and writer flow, and publish artifacts as you progress.",
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

const readLatestWriterBody = (artifactRef: unknown): string | null => {
  if (!artifactRef || typeof artifactRef !== "object" || Array.isArray(artifactRef)) {
    return null;
  }
  const record = artifactRef as Record<string, unknown>;
  if (record.kind !== "INLINE_JSON") {
    return null;
  }
  const value = record.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return typeof (value as Record<string, unknown>).body === "string"
    ? ((value as Record<string, unknown>).body as string)
    : null;
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

  async launchDraftRun(input: { briefId: string; llmModelIdentifier: string }) {
    const briefId = requireNonEmptyString(input.briefId, "briefId");
    const llmModelIdentifier = requireNonEmptyString(input.llmModelIdentifier, "llmModelIdentifier");

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
        latestWriterSummary: writerArtifact?.summary?.trim() || null,
        latestWriterBody: writerArtifact ? readLatestWriterBody(writerArtifact.artifactRef)?.trim() || null : null,
        reviewNotes,
      };
    });

    const launchedAt = new Date().toISOString();

    try {
      const binding = await context.runtimeControl.startRun({
        executionRef: briefId,
        resourceRef: BRIEF_STUDIO_TEAM_RESOURCE,
        launch: {
          kind: "AGENT_TEAM",
          mode: "preset",
          launchPreset: {
            workspaceRootPath: context.storage.runtimePath,
            llmModelIdentifier,
          },
        },
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
          createBriefRepository(db).upsertProjectedBrief({
            briefId,
            title: launchContext.brief.title,
            status: launchContext.brief.status === "approved" || launchContext.brief.status === "rejected"
              ? launchContext.brief.status
              : "researching",
            updatedAt: launchedAt,
            latestBindingId: binding.bindingId,
            latestRunId: binding.runtime.runId,
            latestBindingStatus: binding.status,
            lastErrorMessage: null,
          });
        });
      });

      await context.publishNotification("brief.draft_run_launched", {
        briefId,
        bindingId: binding.bindingId,
        runId: binding.runtime.runId,
        launchedAt,
      });

      return {
        briefId,
        bindingId: binding.bindingId,
        runId: binding.runtime.runId,
        status: binding.status,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      withAppDatabase(context.storage.appDatabasePath, (db) => {
        withTransaction(db, () => {
          createBriefRepository(db).upsertProjectedBrief({
            briefId,
            title: launchContext.brief.title,
            status: "blocked",
            updatedAt: launchedAt,
            latestBindingId: launchContext.brief.latestBindingId,
            latestRunId: launchContext.brief.latestRunId,
            latestBindingStatus: "FAILED",
            lastErrorMessage: message,
          });
        });
      });

      throw error;
    }
  },
});
