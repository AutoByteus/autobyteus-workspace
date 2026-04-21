import { projectExecutionEvent } from "../services/brief-projection-service.js";
export const onRunFailed = async (envelope, context) => {
    await projectExecutionEvent(envelope, context);
};
