import { createArtifactRepository } from "../repositories/artifact-repository.js";
import { withAppDatabase } from "../repositories/app-database.js";
import { createBriefRepository } from "../repositories/brief-repository.js";
import { createReviewNoteRepository } from "../repositories/review-note-repository.js";
export const getBriefDetailQuery = async (input, context) => {
    const record = input && typeof input === "object" ? input : null;
    const briefId = typeof record?.briefId === "string" ? record.briefId.trim() : "";
    if (!briefId) {
        throw new Error("briefId is required.");
    }
    return withAppDatabase(context.storage.appDatabasePath, (db) => {
        const briefRepository = createBriefRepository(db);
        const brief = briefRepository.getById(briefId);
        if (!brief) {
            return { brief: null };
        }
        return {
            brief: {
                ...brief,
                artifacts: createArtifactRepository(db).listByBriefId(briefId),
                reviewNotes: createReviewNoteRepository(db).listByBriefId(briefId),
            },
        };
    });
};
