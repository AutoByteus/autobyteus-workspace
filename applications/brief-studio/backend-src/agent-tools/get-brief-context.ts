import type {
  ApplicationAgentToolHandler,
} from "@autobyteus/application-backend-sdk";
import { withAppDatabase } from "../repositories/app-database.js";
import { createBriefBindingRepository } from "../repositories/brief-binding-repository.js";
import { createBriefRepository } from "../repositories/brief-repository.js";

export const getBriefContext: ApplicationAgentToolHandler = async (_input, context) => {
  const current = withAppDatabase(context.storage.appDatabasePath, (db) => {
    const binding = createBriefBindingRepository(db)
      .getByBindingId(context.caller.bindingId);
    if (!binding) return null;
    const brief = createBriefRepository(db).getById(binding.briefId);
    return brief ? { binding, brief } : null;
  });

  if (!current) {
    return {
      content: [{
        type: "text",
        text: "No Brief Studio brief is associated with this application binding.",
      }],
      structuredContent: { bindingId: context.caller.bindingId, brief: null },
      isError: true,
    };
  }

  const snapshot = {
    briefId: current.brief.briefId,
    title: current.brief.title,
    status: current.brief.status,
    latestBindingStatus: current.brief.latestBindingStatus,
    updatedAt: current.brief.updatedAt,
  };
  const marker = JSON.stringify({
    briefId: snapshot.briefId,
    title: snapshot.title,
    observedStatus: snapshot.status,
  });

  return {
    content: [{
      type: "text",
      text: `Brief context: ${marker}`,
    }],
    structuredContent: snapshot,
  };
};
