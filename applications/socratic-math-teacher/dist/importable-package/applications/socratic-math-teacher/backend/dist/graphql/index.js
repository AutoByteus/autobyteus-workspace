import { createLessonReadService } from "../services/lesson-read-service.js";
import { createLessonRuntimeService } from "../services/lesson-runtime-service.js";
const parseOperationKey = (request) => {
    if (typeof request.operationName === "string" && request.operationName.trim()) {
        return request.operationName.trim();
    }
    const namedOperationMatch = request.query.match(/\b(?:query|mutation|subscription)\s+([_A-Za-z][_0-9A-Za-z]*)\b/i);
    if (namedOperationMatch?.[1]?.trim()) {
        return namedOperationMatch[1].trim();
    }
    const rootFieldMatch = request.query.match(/{\s*(?:[_A-Za-z][_0-9A-Za-z]*\s*:\s*)?([_A-Za-z][_0-9A-Za-z]*)/s);
    return rootFieldMatch?.[1]?.trim() || "";
};
const requireObject = (value, fieldName) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`${fieldName} is required.`);
    }
    return value;
};
const toGraphqlResult = async (fieldName, loader) => {
    try {
        return {
            data: {
                [fieldName]: await loader(),
            },
        };
    }
    catch (error) {
        return {
            data: null,
            errors: [
                {
                    message: error instanceof Error ? error.message : String(error),
                },
            ],
        };
    }
};
export const executeSocraticMathGraphql = async (request, context) => {
    const readService = createLessonReadService(context);
    const runtimeService = createLessonRuntimeService(context);
    const variables = request.variables ?? {};
    const operationKey = parseOperationKey(request);
    switch (operationKey) {
        case "LessonsQuery":
        case "lessons":
            return toGraphqlResult("lessons", () => readService.listLessons());
        case "LessonQuery":
        case "lesson":
            return toGraphqlResult("lesson", () => {
                const lessonId = typeof variables.lessonId === "string" ? variables.lessonId : "";
                return readService.getLesson(lessonId);
            });
        case "StartLessonMutation":
        case "startLesson":
            return toGraphqlResult("startLesson", () => {
                const input = requireObject(variables.input, "input");
                return runtimeService.startLesson({
                    prompt: typeof input.prompt === "string" ? input.prompt : "",
                    llmModelIdentifier: typeof input.llmModelIdentifier === "string" ? input.llmModelIdentifier : null,
                });
            });
        case "AskFollowUpMutation":
        case "askFollowUp":
            return toGraphqlResult("askFollowUp", () => {
                const input = requireObject(variables.input, "input");
                return runtimeService.askFollowUp({
                    lessonId: typeof input.lessonId === "string" ? input.lessonId : "",
                    text: typeof input.text === "string" ? input.text : "",
                });
            });
        case "RequestHintMutation":
        case "requestHint":
            return toGraphqlResult("requestHint", () => {
                const input = requireObject(variables.input, "input");
                return runtimeService.requestHint({
                    lessonId: typeof input.lessonId === "string" ? input.lessonId : "",
                    text: typeof input.text === "string" ? input.text : null,
                });
            });
        case "CloseLessonMutation":
        case "closeLesson":
            return toGraphqlResult("closeLesson", () => {
                const input = requireObject(variables.input, "input");
                return runtimeService.closeLesson({
                    lessonId: typeof input.lessonId === "string" ? input.lessonId : "",
                });
            });
        default:
            return {
                data: null,
                errors: [
                    {
                        message: `Unsupported Socratic Math Teacher GraphQL operation '${operationKey || "unknown"}'.`,
                    },
                ],
            };
    }
};
