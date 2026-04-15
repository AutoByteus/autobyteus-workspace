import type { ApplicationCommandHandler } from "@autobyteus/application-backend-sdk";
import { createBriefReviewService } from "../services/brief-review-service.js";

export const approveBriefCommand: ApplicationCommandHandler = async (input, context) => {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : null;
  return createBriefReviewService(context).approveBrief({
    briefId: typeof record?.briefId === "string" ? record.briefId : "",
  });
};
