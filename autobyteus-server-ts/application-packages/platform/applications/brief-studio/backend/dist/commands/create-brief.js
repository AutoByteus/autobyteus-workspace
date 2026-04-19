import { createBriefRunLaunchService } from "../services/brief-run-launch-service.js";
export const createBriefCommand = async (input, context) => {
    const record = input && typeof input === "object" ? input : null;
    return createBriefRunLaunchService(context).createBrief({
        title: typeof record?.title === "string" ? record.title : "",
        llmModelIdentifier: typeof record?.llmModelIdentifier === "string" ? record.llmModelIdentifier : "",
    });
};
