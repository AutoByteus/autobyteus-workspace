import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationHandlerContext } from "@autobyteus/application-sdk-contracts";

const briefReadServiceState = vi.hoisted(() => ({
  listBriefs: vi.fn(),
  getBrief: vi.fn(),
  listBriefExecutions: vi.fn(),
}));

const briefReviewServiceState = vi.hoisted(() => ({
  approveBrief: vi.fn(),
  rejectBrief: vi.fn(),
  addReviewNote: vi.fn(),
}));

const briefRunLaunchServiceState = vi.hoisted(() => ({
  createBrief: vi.fn(),
  launchDraftRun: vi.fn(),
}));

const lessonReadServiceState = vi.hoisted(() => ({
  listLessons: vi.fn(),
  getLesson: vi.fn(),
}));

const lessonRuntimeServiceState = vi.hoisted(() => ({
  startLesson: vi.fn(),
  askFollowUp: vi.fn(),
  requestHint: vi.fn(),
  closeLesson: vi.fn(),
}));

vi.mock("../../../../applications/brief-studio/backend-src/services/brief-read-service.js", () => ({
  createBriefReadService: () => ({
    listBriefs: briefReadServiceState.listBriefs,
    getBrief: briefReadServiceState.getBrief,
    listBriefExecutions: briefReadServiceState.listBriefExecutions,
  }),
}));

vi.mock("../../../../applications/brief-studio/backend-src/services/brief-review-service.js", () => ({
  createBriefReviewService: () => ({
    approveBrief: briefReviewServiceState.approveBrief,
    rejectBrief: briefReviewServiceState.rejectBrief,
    addReviewNote: briefReviewServiceState.addReviewNote,
  }),
}));

vi.mock("../../../../applications/brief-studio/backend-src/services/brief-run-launch-service.js", () => ({
  createBriefRunLaunchService: () => ({
    createBrief: briefRunLaunchServiceState.createBrief,
    launchDraftRun: briefRunLaunchServiceState.launchDraftRun,
  }),
}));

vi.mock("../../../../applications/socratic-math-teacher/backend-src/services/lesson-read-service.js", () => ({
  createLessonReadService: () => ({
    listLessons: lessonReadServiceState.listLessons,
    getLesson: lessonReadServiceState.getLesson,
  }),
}));

vi.mock("../../../../applications/socratic-math-teacher/backend-src/services/lesson-runtime-service.js", () => ({
  createLessonRuntimeService: () => ({
    startLesson: lessonRuntimeServiceState.startLesson,
    askFollowUp: lessonRuntimeServiceState.askFollowUp,
    requestHint: lessonRuntimeServiceState.requestHint,
    closeLesson: lessonRuntimeServiceState.closeLesson,
  }),
}));

import { executeBriefStudioGraphql } from "../../../../applications/brief-studio/backend-src/graphql/index.ts";
import { executeSocraticMathGraphql } from "../../../../applications/socratic-math-teacher/backend-src/graphql/index.ts";

const handlerContext: ApplicationHandlerContext = {
  requestContext: {
    applicationId: "sample-app",
  },
  storage: {} as never,
  publishNotification: vi.fn(async () => undefined),
  runtimeControl: {} as never,
};

describe("App-owned GraphQL executors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts Brief Studio single-operation requests without operationName", async () => {
    briefReadServiceState.listBriefs.mockResolvedValue([{ briefId: "brief-1" }]);

    const result = await executeBriefStudioGraphql(
      {
        query: "query BriefsQuery { briefs { briefId } }",
      },
      handlerContext,
    );

    expect(briefReadServiceState.listBriefs).toHaveBeenCalledOnce();
    expect(result).toEqual({
      data: {
        briefs: [{ briefId: "brief-1" }],
      },
    });
  });

  it("accepts Socratic Math Teacher single-operation requests without operationName", async () => {
    lessonReadServiceState.listLessons.mockResolvedValue([{ lessonId: "lesson-1" }]);

    const result = await executeSocraticMathGraphql(
      {
        query: "query LessonsQuery { lessons { lessonId } }",
      },
      handlerContext,
    );

    expect(lessonReadServiceState.listLessons).toHaveBeenCalledOnce();
    expect(result).toEqual({
      data: {
        lessons: [{ lessonId: "lesson-1" }],
      },
    });
  });
});
