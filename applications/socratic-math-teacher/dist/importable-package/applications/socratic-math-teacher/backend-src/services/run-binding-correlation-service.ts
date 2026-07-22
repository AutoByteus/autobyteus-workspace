import { randomUUID } from "node:crypto";
import type {
  ApplicationHandlerContext,
  ApplicationAgentBinding,
  ApplicationAgentTeamBinding,
} from "@autobyteus/application-backend-sdk";
import { withAppDatabase, withTransaction } from "../repositories/app-database.js";
import { createLessonRepository } from "../repositories/lesson-repository.js";
import {
  createPendingLaunchRequestRepository,
  type PendingLaunchRequestRecord,
} from "../repositories/pending-launch-request-repository.js";

const requireNonEmptyString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const requireLaunchRequestId = (binding: ApplicationAgentBinding | ApplicationAgentTeamBinding): string =>
  requireNonEmptyString(binding.launchRequestId, "binding.launchRequestId");

export const createRunBindingCorrelationService = (context: ApplicationHandlerContext) => ({
  createPendingLaunchRequest(lessonId: string): PendingLaunchRequestRecord {
    const createdAt = new Date().toISOString();
    const pendingLaunchRequest: PendingLaunchRequestRecord = {
      launchRequestId: `lesson-launch-request-${randomUUID()}`,
      lessonId: requireNonEmptyString(lessonId, "lessonId"),
      status: "PENDING_START",
      bindingId: null,
      createdAt,
      updatedAt: createdAt,
      committedAt: null,
    };

    withAppDatabase(context.storage.appDatabasePath, (db) => {
      withTransaction(db, () => {
        createPendingLaunchRequestRepository(db).insertPendingLaunchRequest(pendingLaunchRequest);
      });
    });

    return pendingLaunchRequest;
  },

  finalizeBindingForLesson(input: {
    lessonId: string;
    binding: ApplicationAgentBinding | ApplicationAgentTeamBinding;
    committedAt?: string;
  }): void {
    const launchRequestId = requireLaunchRequestId(input.binding);
    const lessonId = requireNonEmptyString(input.lessonId, "lessonId");
    const committedAt = input.committedAt ?? new Date().toISOString();

    withAppDatabase(context.storage.appDatabasePath, (db) => {
      withTransaction(db, () => {
        const lessonRepository = createLessonRepository(db);
        const pendingLaunchRequestRepository = createPendingLaunchRequestRepository(db);
        const lesson = lessonRepository.getById(lessonId);
        if (!lesson) {
          throw new Error(`Lesson '${lessonId}' was not found.`);
        }

        const pendingLaunchRequest = pendingLaunchRequestRepository.getByLaunchRequestId(launchRequestId);
        if (pendingLaunchRequest && pendingLaunchRequest.lessonId !== lessonId) {
          throw new Error(
            `Pending launch request '${launchRequestId}' belongs to lesson '${pendingLaunchRequest.lessonId}', not '${lessonId}'.`,
          );
        }
        lessonRepository.attachBinding({
          lessonId,
          bindingId: input.binding.bindingId,
          runId: input.binding.runtime.runId,
          bindingStatus: input.binding.status,
          updatedAt: committedAt,
        });
        if (pendingLaunchRequest) {
          pendingLaunchRequestRepository.markCommitted({
            launchRequestId,
            bindingId: input.binding.bindingId,
            committedAt,
          });
        }
      });
    });
  },

  resolveLessonIdForBinding(binding: ApplicationAgentBinding | ApplicationAgentTeamBinding): string {
    const launchRequestId = requireLaunchRequestId(binding);

    return withAppDatabase(context.storage.appDatabasePath, (db) =>
      withTransaction(db, () => {
        const lessonRepository = createLessonRepository(db);
        const existingLesson = lessonRepository.getByBindingId(binding.bindingId);
        if (existingLesson) {
          return existingLesson.lessonId;
        }

        const pendingLaunchRequestRepository = createPendingLaunchRequestRepository(db);
        const pendingLaunchRequest = pendingLaunchRequestRepository.getByLaunchRequestId(launchRequestId);
        if (!pendingLaunchRequest) {
          throw new Error(
            `Socratic Math Teacher could not resolve binding '${binding.bindingId}' from launchRequestId '${launchRequestId}'.`,
          );
        }

        lessonRepository.attachBinding({
          lessonId: pendingLaunchRequest.lessonId,
          bindingId: binding.bindingId,
          runId: binding.runtime.runId,
          bindingStatus: binding.status,
          updatedAt: new Date().toISOString(),
        });
        pendingLaunchRequestRepository.markCommitted({
          launchRequestId,
          bindingId: binding.bindingId,
          committedAt: new Date().toISOString(),
        });
        return pendingLaunchRequest.lessonId;
      }),
    );
  },

  async reconcileLaunchRequest(launchRequestId: string): Promise<{
    lessonId: string;
    binding: ApplicationAgentBinding | ApplicationAgentTeamBinding;
  } | null> {
    const normalizedLaunchRequestId = requireNonEmptyString(launchRequestId, "launchRequestId");
    const pendingLaunchRequest = withAppDatabase(context.storage.appDatabasePath, (db) =>
      createPendingLaunchRequestRepository(db).getByLaunchRequestId(normalizedLaunchRequestId),
    );
    if (!pendingLaunchRequest) {
      return null;
    }

    const binding = await context.agentExecution.findByLaunchRequestId(normalizedLaunchRequestId);
    if (!binding) {
      return null;
    }

    this.finalizeBindingForLesson({
      lessonId: pendingLaunchRequest.lessonId,
      binding,
    });

    return {
      lessonId: pendingLaunchRequest.lessonId,
      binding,
    };
  },
});
