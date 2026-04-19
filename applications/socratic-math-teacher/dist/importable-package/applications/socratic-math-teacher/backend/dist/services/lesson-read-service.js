import { withAppDatabase } from "../repositories/app-database.js";
import { createLessonMessageRepository } from "../repositories/lesson-message-repository.js";
import { createLessonRepository } from "../repositories/lesson-repository.js";
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
    getLesson(lessonId) {
        const normalizedLessonId = requireLessonId(lessonId);
        return withAppDatabase(context.storage.appDatabasePath, (db) => {
            const lesson = createLessonRepository(db).getById(normalizedLessonId);
            if (!lesson) {
                return null;
            }
            return {
                ...lesson,
                messages: createLessonMessageRepository(db).listByLessonId(normalizedLessonId),
            };
        });
    },
});
