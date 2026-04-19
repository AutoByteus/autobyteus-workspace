import { randomUUID } from "node:crypto";
import type { ApplicationHandlerContext } from "@autobyteus/application-backend-sdk";
import { withAppDatabase, withTransaction } from "../repositories/app-database.js";
import { createLessonMessageRepository } from "../repositories/lesson-message-repository.js";
import { createLessonRepository } from "../repositories/lesson-repository.js";
import { createLessonReadService } from "./lesson-read-service.js";

const SOCRATIC_TEAM_RESOURCE = {
  owner: "bundle",
  kind: "AGENT_TEAM",
  localId: "socratic-math-team",
} as const;

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
  "Use artifactType 'lesson_response' for normal Socratic turns and 'lesson_hint' when the student explicitly asks for a hint.",
  `Student problem: ${studentPrompt}`,
].join("\n\n");

export const createLessonRuntimeService = (context: ApplicationHandlerContext) => ({
  async startLesson(input: { prompt: string; llmModelIdentifier: string }) {
    const prompt = requireNonEmptyString(input.prompt, "prompt");
    const llmModelIdentifier = requireNonEmptyString(input.llmModelIdentifier, "llmModelIdentifier");
    const lessonId = `lesson-${randomUUID()}`;
    const createdAt = new Date().toISOString();

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

    try {
      const binding = await context.runtimeControl.startRun({
        executionRef: lessonId,
        resourceRef: SOCRATIC_TEAM_RESOURCE,
        launch: {
          kind: "AGENT_TEAM",
          mode: "preset",
          launchPreset: {
            workspaceRootPath: context.storage.runtimePath,
            llmModelIdentifier,
          },
        },
        initialInput: {
          text: buildTutorPrompt(prompt),
          metadata: { lessonId },
        },
      });

      withAppDatabase(context.storage.appDatabasePath, (db) => {
        withTransaction(db, () => {
          createLessonRepository(db).upsertLesson({
            lessonId,
            prompt,
            status: "active",
            updatedAt: createdAt,
            latestBindingId: binding.bindingId,
            latestRunId: binding.runtime.runId,
            latestBindingStatus: binding.status,
            lastErrorMessage: null,
            closedAt: null,
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
      withAppDatabase(context.storage.appDatabasePath, (db) => {
        withTransaction(db, () => {
          createLessonRepository(db).upsertLesson({
            lessonId,
            prompt,
            status: "blocked",
            updatedAt: createdAt,
            latestBindingId: null,
            latestRunId: null,
            latestBindingStatus: "FAILED",
            lastErrorMessage: message,
            closedAt: null,
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
