import type { ApplicationCommandHandler } from "@autobyteus/application-backend-sdk";
import { createBriefRunLaunchService } from "../services/brief-run-launch-service.js";

export const createBriefCommand: ApplicationCommandHandler = async (input, context) => {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : null;
  return createBriefRunLaunchService(context).createBrief({
    title: typeof record?.title === "string" ? record.title : "",
    llmModelIdentifier: typeof record?.llmModelIdentifier === "string" ? record.llmModelIdentifier : "",
  });
};
