import { randomUUID } from "node:crypto";
import type {
  ApplicationExecutionEventEnvelope,
  ApplicationHandlerContext,
} from "@autobyteus/application-backend-sdk";
import { withAppDatabase, withTransaction } from "../repositories/app-database.js";
import { createLessonMessageRepository } from "../repositories/lesson-message-repository.js";
import { createLessonRepository } from "../repositories/lesson-repository.js";
import { createProcessedEventRepository } from "../repositories/processed-event-repository.js";

const readArtifactBody = (payload: Record<string, unknown>): string => {
  const artifactRef = payload.artifactRef;
  if (artifactRef && typeof artifactRef === "object" && !Array.isArray(artifactRef)) {
    const value = (artifactRef as Record<string, unknown>).value;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const body = (value as Record<string, unknown>).body;
      if (typeof body === "string" && body.trim()) {
        return body.trim();
      }
    }
  }
  if (typeof payload.summary === "string" && payload.summary.trim()) {
    return payload.summary.trim();
  }
  if (typeof payload.title === "string" && payload.title.trim()) {
    return payload.title.trim();
  }
  return "Tutor response received.";
};

const resolveMessageKind = (artifactType: string): "lesson_response" | "lesson_hint" => (
  artifactType === "lesson_hint" ? "lesson_hint" : "lesson_response"
);

const resolveStatus = (family: string, currentStatus: string): "active" | "closed" | "blocked" => {
  if (currentStatus === "closed") {
    return "closed";
  }
  if (family === "RUN_FAILED" || family === "RUN_ORPHANED") {
    return "blocked";
  }
  if (family === "RUN_TERMINATED") {
    return "closed";
  }
  return "active";
};

export const projectLessonExecutionEvent = async (
  envelope: ApplicationExecutionEventEnvelope,
  context: ApplicationHandlerContext,
): Promise<void> => {
  const event = envelope.event;
  const lessonId = event.executionRef.trim();
  if (!lessonId) {
    throw new Error("Socratic Math Teacher received an execution event without executionRef.");
  }

  const notification = withAppDatabase(context.storage.appDatabasePath, (db) =>
    withTransaction(db, () => {
      const lessonRepository = createLessonRepository(db);
      const lessonMessageRepository = createLessonMessageRepository(db);
      const processedEventRepository = createProcessedEventRepository(db);

      if (!processedEventRepository.claimEvent({
        eventId: event.eventId,
        lessonId,
        journalSequence: event.journalSequence,
        processedAt: event.publishedAt,
      })) {
        return null;
      }

      const lesson = lessonRepository.getById(lessonId);
      if (!lesson) {
        throw new Error(`Lesson '${lessonId}' was not found during projection.`);
      }

      if (event.family === "ARTIFACT") {
        const payload = event.payload && typeof event.payload === "object" && !Array.isArray(event.payload)
          ? event.payload as Record<string, unknown>
          : {};
        const artifactType = typeof payload.artifactType === "string" ? payload.artifactType : "lesson_response";
        const body = readArtifactBody(payload);
        lessonMessageRepository.insertMessage({
          messageId: randomUUID(),
          lessonId,
          role: "tutor",
          kind: resolveMessageKind(artifactType),
          body,
          createdAt: event.publishedAt,
          sourceEventId: event.eventId,
        });
        lessonRepository.upsertLesson({
          lessonId,
          prompt: lesson.prompt,
          status: lesson.status === "closed" ? "closed" : "active",
          updatedAt: event.publishedAt,
          latestBindingId: event.binding.bindingId,
          latestRunId: event.binding.runtime.runId,
          latestBindingStatus: event.binding.status,
          lastErrorMessage: null,
          closedAt: lesson.closedAt,
        });
        return {
          topic: artifactType === "lesson_hint" ? "lesson.hint_received" : "lesson.response_received",
          payload: {
            lessonId,
            bindingId: event.binding.bindingId,
            eventId: event.eventId,
          },
        };
      }

      lessonRepository.upsertLesson({
        lessonId,
        prompt: lesson.prompt,
        status: resolveStatus(event.family, lesson.status),
        updatedAt: event.publishedAt,
        latestBindingId: event.binding.bindingId,
        latestRunId: event.binding.runtime.runId,
        latestBindingStatus: event.binding.status,
        lastErrorMessage: event.binding.lastErrorMessage ?? null,
        closedAt: event.family === "RUN_TERMINATED" ? (lesson.closedAt ?? event.publishedAt) : lesson.closedAt,
      });

      return null;
    }),
  );

  if (notification) {
    await context.publishNotification(notification.topic, notification.payload);
  }
};
