import { createBriefReviewService } from "../services/brief-review-service.js";
export const addReviewNoteCommand = async (input, context) => {
    const record = input && typeof input === "object" ? input : null;
    return createBriefReviewService(context).addReviewNote({
        briefId: typeof record?.briefId === "string" ? record.briefId : "",
        body: typeof record?.body === "string" ? record.body : "",
    });
};
