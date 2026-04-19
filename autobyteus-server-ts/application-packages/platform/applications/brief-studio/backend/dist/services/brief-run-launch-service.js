import { randomUUID } from "node:crypto";
import { withAppDatabase, withTransaction } from "../repositories/app-database.js";
import { createBriefRepository } from "../repositories/brief-repository.js";
const BRIEF_STUDIO_TEAM_RESOURCE = {
    owner: "bundle",
    kind: "AGENT_TEAM",
    localId: "brief-studio-team",
};
const requireNonEmptyString = (value, fieldName) => {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (!normalized) {
        throw new Error(`${fieldName} is required.`);
    }
    return normalized;
};
export const createBriefRunLaunchService = (context) => ({
    async createBrief(input) {
        const title = requireNonEmptyString(input.title, "title");
        const llmModelIdentifier = requireNonEmptyString(input.llmModelIdentifier, "llmModelIdentifier");
        const briefId = `brief-${randomUUID()}`;
        const createdAt = new Date().toISOString();
        withAppDatabase(context.storage.appDatabasePath, (db) => {
            withTransaction(db, () => {
                createBriefRepository(db).upsertProjectedBrief({
                    briefId,
                    title,
                    status: "researching",
                    updatedAt: createdAt,
                    latestBindingId: null,
                    latestRunId: null,
                    latestBindingStatus: null,
                    lastErrorMessage: null,
                });
            });
        });
        try {
            const binding = await context.runtimeControl.startRun({
                executionRef: briefId,
                resourceRef: BRIEF_STUDIO_TEAM_RESOURCE,
                launch: {
                    kind: "AGENT_TEAM",
                    mode: "preset",
                    launchPreset: {
                        workspaceRootPath: context.storage.runtimePath,
                        llmModelIdentifier,
                    },
                },
            });
            withAppDatabase(context.storage.appDatabasePath, (db) => {
                withTransaction(db, () => {
                    createBriefRepository(db).upsertProjectedBrief({
                        briefId,
                        title,
                        status: "researching",
                        updatedAt: createdAt,
                        latestBindingId: binding.bindingId,
                        latestRunId: binding.runtime.runId,
                        latestBindingStatus: binding.status,
                        lastErrorMessage: null,
                    });
                });
            });
            await context.publishNotification("brief.created", {
                briefId,
                bindingId: binding.bindingId,
                runId: binding.runtime.runId,
                createdAt,
            });
            return {
                briefId,
                bindingId: binding.bindingId,
                runId: binding.runtime.runId,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            withAppDatabase(context.storage.appDatabasePath, (db) => {
                withTransaction(db, () => {
                    createBriefRepository(db).upsertProjectedBrief({
                        briefId,
                        title,
                        status: "blocked",
                        updatedAt: createdAt,
                        latestBindingId: null,
                        latestRunId: null,
                        latestBindingStatus: "FAILED",
                        lastErrorMessage: message,
                    });
                });
            });
            throw error;
        }
    },
});
