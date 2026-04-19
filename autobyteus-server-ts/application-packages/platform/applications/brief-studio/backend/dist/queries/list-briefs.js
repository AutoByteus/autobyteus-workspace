import { withAppDatabase } from "../repositories/app-database.js";
import { createBriefRepository } from "../repositories/brief-repository.js";
export const listBriefsQuery = async (_input, context) => withAppDatabase(context.storage.appDatabasePath, (db) => ({
    briefs: createBriefRepository(db).listSummaries(),
}));
