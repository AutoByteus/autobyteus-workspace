import { randomUUID } from "node:crypto";
import { withAppDatabase, withTransaction } from "../repositories/app-database.js";
import { createLessonRepository } from "../repositories/lesson-repository.js";
import { createPendingBindingIntentRepository, } from "../repositories/pending-binding-intent-repository.js";
const requireNonEmptyString = (value, fieldName) => {
    const normalized = value.trim();
    if (!normalized) {
        throw new Error(`${fieldName} is required.`);
    }
    return normalized;
};
const requireBindingIntentId = (binding) => requireNonEmptyString(binding.bindingIntentId, "binding.bindingIntentId");
export const createRunBindingCorrelationService = (context) => ({
    createPendingBindingIntent(lessonId) {
        const createdAt = new Date().toISOString();
        const pendingIntent = {
            bindingIntentId: `lesson-binding-intent-${randomUUID()}`,
            lessonId: requireNonEmptyString(lessonId, "lessonId"),
            status: "PENDING_START",
            bindingId: null,
            createdAt,
            updatedAt: createdAt,
            committedAt: null,
        };
        withAppDatabase(context.storage.appDatabasePath, (db) => {
            withTransaction(db, () => {
                createPendingBindingIntentRepository(db).insertPendingIntent(pendingIntent);
            });
        });
        return pendingIntent;
    },
    finalizeBindingForLesson(input) {
        const bindingIntentId = requireBindingIntentId(input.binding);
        const lessonId = requireNonEmptyString(input.lessonId, "lessonId");
        const committedAt = input.committedAt ?? new Date().toISOString();
        withAppDatabase(context.storage.appDatabasePath, (db) => {
            withTransaction(db, () => {
                const lessonRepository = createLessonRepository(db);
                const pendingIntentRepository = createPendingBindingIntentRepository(db);
                const lesson = lessonRepository.getById(lessonId);
                if (!lesson) {
                    throw new Error(`Lesson '${lessonId}' was not found.`);
                }
                const pendingIntent = pendingIntentRepository.getByBindingIntentId(bindingIntentId);
                if (pendingIntent && pendingIntent.lessonId !== lessonId) {
                    throw new Error(`Pending binding intent '${bindingIntentId}' belongs to lesson '${pendingIntent.lessonId}', not '${lessonId}'.`);
                }
                lessonRepository.attachBinding({
                    lessonId,
                    bindingId: input.binding.bindingId,
                    runId: input.binding.runtime.runId,
                    bindingStatus: input.binding.status,
                    updatedAt: committedAt,
                });
                if (pendingIntent) {
                    pendingIntentRepository.markCommitted({
                        bindingIntentId,
                        bindingId: input.binding.bindingId,
                        committedAt,
                    });
                }
            });
        });
    },
    resolveLessonIdForBinding(binding) {
        const bindingIntentId = requireBindingIntentId(binding);
        return withAppDatabase(context.storage.appDatabasePath, (db) => withTransaction(db, () => {
            const lessonRepository = createLessonRepository(db);
            const existingLesson = lessonRepository.getByBindingId(binding.bindingId);
            if (existingLesson) {
                return existingLesson.lessonId;
            }
            const pendingIntentRepository = createPendingBindingIntentRepository(db);
            const pendingIntent = pendingIntentRepository.getByBindingIntentId(bindingIntentId);
            if (!pendingIntent) {
                throw new Error(`Socratic Math Teacher could not resolve binding '${binding.bindingId}' from bindingIntentId '${bindingIntentId}'.`);
            }
            lessonRepository.attachBinding({
                lessonId: pendingIntent.lessonId,
                bindingId: binding.bindingId,
                runId: binding.runtime.runId,
                bindingStatus: binding.status,
                updatedAt: new Date().toISOString(),
            });
            pendingIntentRepository.markCommitted({
                bindingIntentId,
                bindingId: binding.bindingId,
                committedAt: new Date().toISOString(),
            });
            return pendingIntent.lessonId;
        }));
    },
    async reconcileBindingIntent(bindingIntentId) {
        const normalizedBindingIntentId = requireNonEmptyString(bindingIntentId, "bindingIntentId");
        const pendingIntent = withAppDatabase(context.storage.appDatabasePath, (db) => createPendingBindingIntentRepository(db).getByBindingIntentId(normalizedBindingIntentId));
        if (!pendingIntent) {
            return null;
        }
        const binding = await context.runtimeControl.getRunBindingByIntentId(normalizedBindingIntentId);
        if (!binding) {
            return null;
        }
        this.finalizeBindingForLesson({
            lessonId: pendingIntent.lessonId,
            binding,
        });
        return {
            lessonId: pendingIntent.lessonId,
            binding,
        };
    },
});
