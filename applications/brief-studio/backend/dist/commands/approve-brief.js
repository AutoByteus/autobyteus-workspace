import { createBriefReviewService } from "../services/brief-review-service.js";
export const approveBriefCommand = async (input, context) => {
    const record = input && typeof input === "object" ? input : null;
    return createBriefReviewService(context).approveBrief({
        briefId: typeof record?.briefId === "string" ? record.briefId : "",
    });
};
