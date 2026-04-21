import type {
  ApplicationGraphqlExecutor,
  ApplicationGraphqlRequest,
  ApplicationHandlerContext,
} from "@autobyteus/application-backend-sdk";
import { createBriefReadService } from "../services/brief-read-service.js";
import { createBriefReviewService } from "../services/brief-review-service.js";
import { createBriefRunLaunchService } from "../services/brief-run-launch-service.js";

const parseOperationKey = (request: ApplicationGraphqlRequest): string => {
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

const requireObject = (value: unknown, fieldName: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${fieldName} is required.`);
  }
  return value as Record<string, unknown>;
};

const toGraphqlResult = async (
  fieldName: string,
  loader: () => Promise<unknown> | unknown,
): Promise<{ data: Record<string, unknown> | null; errors?: Array<{ message: string }> }> => {
  try {
    return {
      data: {
        [fieldName]: await loader(),
      },
    };
  } catch (error) {
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

export const executeBriefStudioGraphql: ApplicationGraphqlExecutor = async (
  request,
  context,
) => {
  const readService = createBriefReadService(context);
  const reviewService = createBriefReviewService(context);
  const runLaunchService = createBriefRunLaunchService(context);
  const variables = request.variables ?? {};
  const operationKey = parseOperationKey(request);

  switch (operationKey) {
    case "BriefsQuery":
    case "briefs":
      return toGraphqlResult("briefs", () => readService.listBriefs());
    case "BriefQuery":
    case "brief":
      return toGraphqlResult("brief", () => {
        const briefId = typeof variables.briefId === "string" ? variables.briefId : "";
        return readService.getBrief(briefId);
      });
    case "BriefExecutionsQuery":
    case "briefExecutions":
      return toGraphqlResult("briefExecutions", () => {
        const briefId = typeof variables.briefId === "string" ? variables.briefId : "";
        return readService.listBriefExecutions(briefId);
      });
    case "CreateBriefMutation":
    case "createBrief":
      return toGraphqlResult("createBrief", () => {
        const input = requireObject(variables.input, "input");
        return runLaunchService.createBrief({
          title: typeof input.title === "string" ? input.title : "",
        });
      });
    case "LaunchDraftRunMutation":
    case "launchDraftRun":
      return toGraphqlResult("launchDraftRun", () => {
        const input = requireObject(variables.input, "input");
        return runLaunchService.launchDraftRun({
          briefId: typeof input.briefId === "string" ? input.briefId : "",
          llmModelIdentifier:
            typeof input.llmModelIdentifier === "string" ? input.llmModelIdentifier : null,
        });
      });
    case "ApproveBriefMutation":
    case "approveBrief":
      return toGraphqlResult("approveBrief", () => {
        const input = requireObject(variables.input, "input");
        return reviewService.approveBrief({
          briefId: typeof input.briefId === "string" ? input.briefId : "",
        });
      });
    case "RejectBriefMutation":
    case "rejectBrief":
      return toGraphqlResult("rejectBrief", () => {
        const input = requireObject(variables.input, "input");
        return reviewService.rejectBrief({
          briefId: typeof input.briefId === "string" ? input.briefId : "",
          reason: typeof input.reason === "string" ? input.reason : null,
        });
      });
    case "AddReviewNoteMutation":
    case "addReviewNote":
      return toGraphqlResult("addReviewNote", () => {
        const input = requireObject(variables.input, "input");
        return reviewService.addReviewNote({
          briefId: typeof input.briefId === "string" ? input.briefId : "",
          body: typeof input.body === "string" ? input.body : "",
        });
      });
    default:
      return {
        data: null,
        errors: [
          {
            message: `Unsupported Brief Studio GraphQL operation '${operationKey || "unknown"}'.`,
          },
        ],
      };
  }
};
