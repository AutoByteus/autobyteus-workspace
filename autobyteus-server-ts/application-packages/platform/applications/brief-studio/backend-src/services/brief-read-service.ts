import type { ApplicationHandlerContext } from "@autobyteus/application-backend-sdk";
import type { BriefExecutionRecord } from "../domain/brief-execution-model.js";
import { withAppDatabase } from "../repositories/app-database.js";
import { createArtifactRepository } from "../repositories/artifact-repository.js";
import { createBriefRepository } from "../repositories/brief-repository.js";
import { createReviewNoteRepository } from "../repositories/review-note-repository.js";

const requireBriefId = (briefId: string): string => {
  const normalized = briefId.trim();
  if (!normalized) {
    throw new Error("briefId is required.");
  }
  return normalized;
};

export const createBriefReadService = (context: ApplicationHandlerContext) => ({
  listBriefs() {
    return withAppDatabase(context.storage.appDatabasePath, (db) =>
      createBriefRepository(db).listSummaries(),
    );
  },

  getBrief(briefId: string) {
    const normalizedBriefId = requireBriefId(briefId);
    return withAppDatabase(context.storage.appDatabasePath, (db) => {
      const briefRepository = createBriefRepository(db);
      const brief = briefRepository.getById(normalizedBriefId);
      if (!brief) {
        return null;
      }

      return {
        ...brief,
        artifacts: createArtifactRepository(db).listByBriefId(normalizedBriefId),
        reviewNotes: createReviewNoteRepository(db).listByBriefId(normalizedBriefId),
      };
    });
  },

  async listBriefExecutions(briefId: string): Promise<BriefExecutionRecord[]> {
    const normalizedBriefId = requireBriefId(briefId);
    const bindings = await context.runtimeControl.listRunBindings({ executionRef: normalizedBriefId });
    return bindings
      .map((binding) => ({
        bindingId: binding.bindingId,
        status: binding.status,
        runId: binding.runtime.runId,
        definitionId: binding.runtime.definitionId,
        createdAt: binding.createdAt,
        updatedAt: binding.updatedAt,
        terminatedAt: binding.terminatedAt,
        lastErrorMessage: binding.lastErrorMessage,
      }))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  },
});
