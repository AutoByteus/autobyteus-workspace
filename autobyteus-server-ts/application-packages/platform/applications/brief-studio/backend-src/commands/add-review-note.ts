import type { ApplicationCommandHandler } from "@autobyteus/application-backend-sdk";
import { createBriefReviewService } from "../services/brief-review-service.js";

export const addReviewNoteCommand: ApplicationCommandHandler = async (input, context) => {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : null;
  return createBriefReviewService(context).addReviewNote({
    briefId: typeof record?.briefId === "string" ? record.briefId : "",
    body: typeof record?.body === "string" ? record.body : "",
  });
};
