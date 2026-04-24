import { randomUUID } from "node:crypto";
import {
  buildConfiguredTeamRunLaunch,
  resolveConfiguredTeamLaunchProfile,
  type ApplicationHandlerContext,
} from "@autobyteus/application-backend-sdk";
import { withAppDatabase, withTransaction } from "../repositories/app-database.js";
import { createLessonMessageRepository } from "../repositories/lesson-message-repository.js";
import { createLessonRepository } from "../repositories/lesson-repository.js";
import { createPendingBindingIntentRepository } from "../repositories/pending-binding-intent-repository.js";
import { createLessonReadService } from "./lesson-read-service.js";
import { createRunBindingCorrelationService } from "./run-binding-correlation-service.js";

const SOCRATIC_TEAM_RESOURCE = {
  owner: "bundle",
  kind: "AGENT_TEAM",
  localId: "socratic-math-team",
} as const;
const LESSON_TUTOR_TEAM_SLOT_KEY = "lessonTutorTeam" as const;

const requireNonEmptyString = (value: string | null | undefined, fieldName: string): string => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const requireLesson = (context: ApplicationHandlerContext, lessonId: string) =>
  withAppDatabase(context.storage.appDatabasePath, (db) => {
    const lesson = createLessonRepository(db).getById(lessonId);
    if (!lesson) {
      throw new Error(`Lesson '${lessonId}' was not found.`);
    }
    return lesson;
  });

const ensureOpenBinding = (lesson: {
  lessonId: string;
  latestBindingId: string | null;
  latestBindingStatus: string | null;
}) => {
  if (!lesson.latestBindingId) {
    throw new Error(`Lesson '${lesson.lessonId}' does not have an active runtime binding.`);
  }
  if (lesson.latestBindingStatus && ["TERMINATED", "FAILED", "ORPHANED"].includes(lesson.latestBindingStatus)) {
    throw new Error(`Lesson '${lesson.lessonId}' is not attached to a live runtime binding.`);
  }
  return lesson.latestBindingId;
};

const buildTutorPrompt = (studentPrompt: string): string => [
  "You are guiding one student through a math problem.",
  "Ask one focused question or give one concise hint at a time.",
  "After every tutor response, call publish_artifact so the application can project your turn into lesson history.",
  "Publish normal turns to socratic-math/lesson-response.md and hint turns to socratic-math/lesson-hint.md.",
  `Student problem: ${studentPrompt}`,
].join("\n\n");

const resolveStartLessonProjection = (input: {
  currentLesson: {
    status: "active" | "closed" | "blocked";
    updatedAt: string;
    latestBindingId: string | null;
    latestBindingStatus: string | null;
    lastErrorMessage: string | null;
    closedAt: string | null;
    artifactCatchupCompletedAt?: string | null;
  } | null;
  binding: {
    bindingId: string;
    status: string;
  };
  createdAt: string;
}) => {
  const currentBindingProjection = input.currentLesson?.latestBindingId === input.binding.bindingId
    ? input.currentLesson
    : null;

  return {
    status: currentBindingProjection?.status ?? "active",
    updatedAt: currentBindingProjection?.updatedAt ?? input.createdAt,
    latestBindingStatus: currentBindingProjection?.latestBindingStatus ?? input.binding.status,
    lastErrorMessage: currentBindingProjection?.lastErrorMessage ?? null,
    closedAt: currentBindingProjection?.closedAt ?? null,
    artifactCatchupCompletedAt: null,
  };
};

const resolveLessonTutorTeamConfiguration = async (context: ApplicationHandlerContext) => {
  return resolveConfiguredTeamLaunchProfile({
    configuredResource: await context.runtimeControl.getConfiguredResource(LESSON_TUTOR_TEAM_SLOT_KEY),
    fallbackResourceRef: SOCRATIC_TEAM_RESOURCE,
  });
};

export const createLessonRuntimeService = (context: ApplicationHandlerContext) => ({
  async startLesson(input: { prompt: string; llmModelIdentifier?: string | null }) {
    const prompt = requireNonEmptyString(input.prompt, "prompt");
    const lessonId = `lesson-${randomUUID()}`;
    const createdAt = new Date().toISOString();
    const correlationService = createRunBindingCorrelationService(context);

    withAppDatabase(context.storage.appDatabasePath, (db) => {
      withTransaction(db, () => {
        createLessonRepository(db).upsertLesson({
          lessonId,
          prompt,
          status: "active",
          updatedAt: createdAt,
          latestBindingId: null,
          latestRunId: null,
          latestBindingStatus: null,
          lastErrorMessage: null,
          closedAt: null,
          artifactCatchupCompletedAt: null,
        });
        createLessonMessageRepository(db).insertMessage({
          messageId: randomUUID(),
          lessonId,
          role: "student",
          kind: "prompt",
          body: prompt,
          createdAt,
        });
      });
    });
    const pendingIntent = correlationService.createPendingBindingIntent(lessonId);
    const tutorTeam = await resolveLessonTutorTeamConfiguration(context);
    const workspaceRootPath = tutorTeam.launchProfile?.defaults?.workspaceRootPath ?? context.storage.runtimePath;

    try {
      const binding = await context.runtimeControl.startRun({
        bindingIntentId: pendingIntent.bindingIntentId,
        resourceRef: tutorTeam.resourceRef,
        launch: buildConfiguredTeamRunLaunch({
          launchProfile: tutorTeam.launchProfile,
          workspaceRootPath,
          llmModelIdentifier: input.llmModelIdentifier,
        }),
        initialInput: {
          text: buildTutorPrompt(prompt),
          metadata: { lessonId },
        },
      });

      withAppDatabase(context.storage.appDatabasePath, (db) => {
        withTransaction(db, () => {
          const lessonRepository = createLessonRepository(db);
          createPendingBindingIntentRepository(db).markCommitted({
            bindingIntentId: binding.bindingIntentId,
            bindingId: binding.bindingId,
            committedAt: createdAt,
          });
          const launchProjection = resolveStartLessonProjection({
            currentLesson: lessonRepository.getById(lessonId),
            binding,
            createdAt,
          });
          lessonRepository.upsertLesson({
            lessonId,
            prompt,
            status: launchProjection.status,
            updatedAt: launchProjection.updatedAt,
            latestBindingId: binding.bindingId,
            latestRunId: binding.runtime.runId,
            latestBindingStatus: launchProjection.latestBindingStatus,
            lastErrorMessage: launchProjection.lastErrorMessage,
            closedAt: launchProjection.closedAt,
            artifactCatchupCompletedAt: launchProjection.artifactCatchupCompletedAt,
          });
        });
      });

      await context.publishNotification("lesson.started", {
        lessonId,
        bindingId: binding.bindingId,
        runId: binding.runtime.runId,
        createdAt,
      });

      return createLessonReadService(context).getLesson(lessonId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const reconciled = await correlationService.reconcileBindingIntent(pendingIntent.bindingIntentId);
      withAppDatabase(context.storage.appDatabasePath, (db) => {
        withTransaction(db, () => {
          createLessonRepository(db).upsertLesson({
            lessonId,
            prompt,
            status: "blocked",
            updatedAt: createdAt,
            latestBindingId: reconciled?.binding.bindingId ?? null,
            latestRunId: reconciled?.binding.runtime.runId ?? null,
            latestBindingStatus: reconciled?.binding.status ?? "FAILED",
            lastErrorMessage: message,
            closedAt: null,
            artifactCatchupCompletedAt: null,
          });
        });
      });
      throw error;
    }
  },

  async askFollowUp(input: { lessonId: string; text: string }) {
    const lessonId = requireNonEmptyString(input.lessonId, "lessonId");
    const text = requireNonEmptyString(input.text, "text");
    const lesson = requireLesson(context, lessonId);
    const bindingId = ensureOpenBinding(lesson);
    const createdAt = new Date().toISOString();

    withAppDatabase(context.storage.appDatabasePath, (db) => {
      withTransaction(db, () => {
        createLessonMessageRepository(db).insertMessage({
          messageId: randomUUID(),
          lessonId,
          role: "student",
          kind: "follow_up",
          body: text,
          createdAt,
        });
        createLessonRepository(db).upsertLesson({
          lessonId,
          prompt: lesson.prompt,
          status: lesson.status,
          updatedAt: createdAt,
          latestBindingId: lesson.latestBindingId,
          latestRunId: lesson.latestRunId,
          latestBindingStatus: lesson.latestBindingStatus,
          lastErrorMessage: null,
          closedAt: lesson.closedAt,
          artifactCatchupCompletedAt: lesson.artifactCatchupCompletedAt ?? null,
        });
      });
    });

    await context.runtimeControl.postRunInput({
      bindingId,
      text,
      metadata: { lessonId },
    });

    return createLessonReadService(context).getLesson(lessonId);
  },

  async requestHint(input: { lessonId: string; text?: string | null }) {
    const lessonId = requireNonEmptyString(input.lessonId, "lessonId");
    const lesson = requireLesson(context, lessonId);
    const bindingId = ensureOpenBinding(lesson);
    const createdAt = new Date().toISOString();
    const detail = typeof input.text === "string" && input.text.trim()
      ? input.text.trim()
      : "Please give the student the next helpful hint without solving the full problem.";

    withAppDatabase(context.storage.appDatabasePath, (db) => {
      withTransaction(db, () => {
        createLessonMessageRepository(db).insertMessage({
          messageId: randomUUID(),
          lessonId,
          role: "student",
          kind: "hint_request",
          body: detail,
          createdAt,
        });
        createLessonRepository(db).upsertLesson({
          lessonId,
          prompt: lesson.prompt,
          status: lesson.status,
          updatedAt: createdAt,
          latestBindingId: lesson.latestBindingId,
          latestRunId: lesson.latestRunId,
          latestBindingStatus: lesson.latestBindingStatus,
          lastErrorMessage: null,
          closedAt: lesson.closedAt,
          artifactCatchupCompletedAt: lesson.artifactCatchupCompletedAt ?? null,
        });
      });
    });

    await context.runtimeControl.postRunInput({
      bindingId,
      text: `The student requests a hint. ${detail}`,
      metadata: { lessonId, requestKind: "hint" },
    });

    return createLessonReadService(context).getLesson(lessonId);
  },

  async closeLesson(input: { lessonId: string }) {
    const lessonId = requireNonEmptyString(input.lessonId, "lessonId");
    const lesson = requireLesson(context, lessonId);
    const closedAt = new Date().toISOString();

    if (lesson.latestBindingId && !(lesson.latestBindingStatus && ["TERMINATED", "FAILED", "ORPHANED"].includes(lesson.latestBindingStatus))) {
      await context.runtimeControl.terminateRunBinding(lesson.latestBindingId);
    }

    withAppDatabase(context.storage.appDatabasePath, (db) => {
      withTransaction(db, () => {
        createLessonRepository(db).upsertLesson({
          lessonId,
          prompt: lesson.prompt,
          status: "closed",
          updatedAt: closedAt,
          latestBindingId: lesson.latestBindingId,
          latestRunId: lesson.latestRunId,
          latestBindingStatus: lesson.latestBindingStatus,
          lastErrorMessage: null,
          closedAt,
          artifactCatchupCompletedAt: lesson.artifactCatchupCompletedAt ?? null,
        });
      });
    });

    await context.publishNotification("lesson.closed", {
      lessonId,
      closedAt,
    });

    return createLessonReadService(context).getLesson(lessonId);
  },
});
