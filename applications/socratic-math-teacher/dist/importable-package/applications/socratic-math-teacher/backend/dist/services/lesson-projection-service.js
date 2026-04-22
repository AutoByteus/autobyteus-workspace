import { withAppDatabase, withTransaction } from "../repositories/app-database.js";
import { createLessonRepository } from "../repositories/lesson-repository.js";
import { createProcessedEventRepository } from "../repositories/processed-event-repository.js";
import { createRunBindingCorrelationService } from "./run-binding-correlation-service.js";
const resolveStatus = (family, currentStatus) => {
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
export const projectLessonExecutionEvent = async (envelope, context) => {
    const event = envelope.event;
    const lessonId = createRunBindingCorrelationService(context).resolveLessonIdForBinding(event.binding);
    withAppDatabase(context.storage.appDatabasePath, (db) => withTransaction(db, () => {
        const lessonRepository = createLessonRepository(db);
        const processedEventRepository = createProcessedEventRepository(db);
        if (!processedEventRepository.claimEvent({
            eventId: event.eventId,
            lessonId,
            journalSequence: event.journalSequence,
            processedAt: event.publishedAt,
        })) {
            return;
        }
        const lesson = lessonRepository.getById(lessonId);
        if (!lesson) {
            throw new Error(`Lesson '${lessonId}' was not found during projection.`);
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
            artifactCatchupCompletedAt: lesson.artifactCatchupCompletedAt ?? null,
        });
    }));
};
