import { withAppDatabase } from "../repositories/app-database.js";
import { createLessonMessageRepository } from "../repositories/lesson-message-repository.js";
import { createLessonRepository } from "../repositories/lesson-repository.js";
import { deriveTutorTargetAddress } from "../domain/lesson-model.js";
const requireLessonId = (lessonId) => {
    const normalized = lessonId.trim();
    if (!normalized) {
        throw new Error("lessonId is required.");
    }
    return normalized;
};
export const createLessonReadService = (context) => ({
    listLessons() {
        return withAppDatabase(context.storage.appDatabasePath, (db) => createLessonRepository(db).listSummaries());
    },
    async getLesson(lessonId) {
        const normalizedLessonId = requireLessonId(lessonId);
        const lessonDetail = withAppDatabase(context.storage.appDatabasePath, (db) => {
            const lesson = createLessonRepository(db).getById(normalizedLessonId);
            if (!lesson) {
                return null;
            }
            return {
                lesson,
                messages: createLessonMessageRepository(db).listByLessonId(normalizedLessonId),
            };
        });
        if (!lessonDetail)
            return null;
        const binding = lessonDetail.lesson.status === "active" && lessonDetail.lesson.latestBindingId
            ? await context.agentExecution.get(lessonDetail.lesson.latestBindingId)
            : null;
        return {
            ...lessonDetail.lesson,
            tutorTargetAddress: deriveTutorTargetAddress(lessonDetail.lesson, binding),
            messages: lessonDetail.messages,
        };
    },
});
