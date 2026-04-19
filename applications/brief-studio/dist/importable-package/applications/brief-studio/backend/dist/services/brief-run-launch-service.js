import { randomUUID } from "node:crypto";
import { withAppDatabase, withTransaction } from "../repositories/app-database.js";
import { createArtifactRepository } from "../repositories/artifact-repository.js";
import { createBriefBindingRepository } from "../repositories/brief-binding-repository.js";
import { createBriefRepository } from "../repositories/brief-repository.js";
import { createPendingBindingIntentRepository } from "../repositories/pending-binding-intent-repository.js";
import { createReviewNoteRepository } from "../repositories/review-note-repository.js";
import { createRunBindingCorrelationService } from "./run-binding-correlation-service.js";
const BRIEF_STUDIO_TEAM_RESOURCE = {
    owner: "bundle",
    kind: "AGENT_TEAM",
    localId: "brief-studio-team",
};
const requireNonEmptyString = (value, fieldName) => {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (!normalized) {
        throw new Error(`${fieldName} is required.`);
    }
    return normalized;
};
const buildInitialInputText = (input) => {
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
const readLatestWriterBody = (artifactRef) => {
    if (!artifactRef || typeof artifactRef !== "object" || Array.isArray(artifactRef)) {
        return null;
    }
    const record = artifactRef;
    if (record.kind !== "INLINE_JSON") {
        return null;
    }
    const value = record.value;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }
    return typeof value.body === "string"
        ? value.body
        : null;
};
const resolveLaunchProjection = (input) => {
    const currentBindingProjection = input.currentBrief?.latestBindingId === input.binding.bindingId
        ? input.currentBrief
        : null;
    return {
        title: currentBindingProjection?.title ?? input.brief.title,
        status: currentBindingProjection?.status ?? (input.brief.status === "approved" || input.brief.status === "rejected"
            ? input.brief.status
            : "researching"),
        updatedAt: currentBindingProjection?.updatedAt ?? input.launchedAt,
        latestBindingStatus: currentBindingProjection?.latestBindingStatus ?? input.binding.status,
        lastErrorMessage: currentBindingProjection?.lastErrorMessage ?? null,
    };
};
export const createBriefRunLaunchService = (context) => ({
    async createBrief(input) {
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
    async launchDraftRun(input) {
        const briefId = requireNonEmptyString(input.briefId, "briefId");
        const llmModelIdentifier = requireNonEmptyString(input.llmModelIdentifier, "llmModelIdentifier");
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
                latestWriterSummary: writerArtifact?.summary?.trim() || null,
                latestWriterBody: writerArtifact ? readLatestWriterBody(writerArtifact.artifactRef)?.trim() || null : null,
                reviewNotes,
            };
        });
        const launchedAt = new Date().toISOString();
        const pendingIntent = correlationService.createPendingBindingIntent(briefId);
        try {
            const binding = await context.runtimeControl.startRun({
                bindingIntentId: pendingIntent.bindingIntentId,
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
                    const briefRepository = createBriefRepository(db);
                    createPendingBindingIntentRepository(db).markCommitted({
                        bindingIntentId: binding.bindingIntentId,
                        bindingId: binding.bindingId,
                        committedAt: launchedAt,
                    });
                    createBriefBindingRepository(db).upsertBinding({
                        briefId,
                        bindingId: binding.bindingId,
                        bindingIntentId: binding.bindingIntentId,
                        runId: binding.runtime.runId,
                        createdAt: binding.createdAt,
                        updatedAt: launchedAt,
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
                        latestRunId: binding.runtime.runId,
                        latestBindingStatus: launchProjection.latestBindingStatus,
                        lastErrorMessage: launchProjection.lastErrorMessage,
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const reconciled = await correlationService.reconcileBindingIntent(pendingIntent.bindingIntentId);
            withAppDatabase(context.storage.appDatabasePath, (db) => {
                withTransaction(db, () => {
                    createBriefRepository(db).upsertProjectedBrief({
                        briefId,
                        title: launchContext.brief.title,
                        status: "blocked",
                        updatedAt: launchedAt,
                        latestBindingId: reconciled?.binding.bindingId ?? launchContext.brief.latestBindingId,
                        latestRunId: reconciled?.binding.runtime.runId ?? launchContext.brief.latestRunId,
                        latestBindingStatus: reconciled?.binding.status ?? "FAILED",
                        lastErrorMessage: message,
                    });
                });
            });
            throw error;
        }
    },
});
