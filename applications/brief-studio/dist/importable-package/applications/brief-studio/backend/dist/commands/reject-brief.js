import { createBriefReviewService } from "../services/brief-review-service.js";
export const rejectBriefCommand = async (input, context) => {
    const record = input && typeof input === "object" ? input : null;
    return createBriefReviewService(context).rejectBrief({
        briefId: typeof record?.briefId === "string" ? record.briefId : "",
        reason: typeof record?.reason === "string" ? record.reason : null,
    });
};
