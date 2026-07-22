// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountSocraticMathTeacher } from "../../../../applications/socratic-math-teacher/frontend-src/socratic-runtime.js";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

const addressFor = (lessonId: string) => ({
  bindingId: `binding-${lessonId}`,
  target: {
    kind: "AGENT_TEAM_MEMBER",
    memberRouteKey: "tutor",
  },
});

const buildLesson = (lessonId: string, { target = true } = {}) => ({
  lessonId,
  prompt: `Problem ${lessonId}`,
  status: "active",
  latestBindingId: target ? `binding-${lessonId}` : null,
  latestRunId: target ? `run-${lessonId}` : null,
  latestBindingStatus: target ? "ATTACHED" : null,
  lastErrorMessage: null,
  createdAt: "2026-07-22T12:00:00.000Z",
  updatedAt: "2026-07-22T12:00:00.000Z",
  closedAt: null,
  tutorTargetAddress: target ? addressFor(lessonId) : null,
  messages: [],
});

const bootstrap = {
  application: {
    name: "Socratic Math Teacher",
    applicationId: "socratic-math-teacher",
    localApplicationId: "local-socratic-math-teacher",
    packageId: "builtin-socratic-math-teacher",
  },
  iframeLaunchId: "iframe-launch-1",
  requestContext: {
    applicationId: "socratic-math-teacher",
  },
  transport: {
    backendBaseUrl: "http://127.0.0.1/application-backends/socratic-math-teacher",
    backendNotificationsUrl: "ws://127.0.0.1/application-backends/socratic-math-teacher/notifications",
  },
};

const buildConnection = () => ({
  ready: Promise.resolve(),
  sendInput: vi.fn(async () => undefined),
  onEvent: vi.fn(() => vi.fn()),
  onError: vi.fn(() => vi.fn()),
  onClose: vi.fn(() => vi.fn()),
  close: vi.fn(),
});

const createHarness = (clientOverrides: Record<string, unknown> = {}) => {
  const connections: ReturnType<typeof buildConnection>[] = [];
  const applicationClient = {
    agentCommunication: {
      connect: vi.fn(() => {
        const connection = buildConnection();
        connections.push(connection);
        return connection;
      }),
    },
  };
  const notificationHandle = { close: vi.fn() };
  const client = {
    lessons: vi.fn(async () => []),
    lesson: vi.fn(async () => null),
    startLesson: vi.fn(),
    askFollowUp: vi.fn(),
    requestHint: vi.fn(),
    closeLesson: vi.fn(),
    subscribeNotifications: vi.fn(() => notificationHandle),
    ...clientOverrides,
  };
  const rootElement = document.getElementById("app-root")!;
  const dispose = mountSocraticMathTeacher({
    applicationClient,
    bootstrap,
    browserWindow: window,
    createSocraticMathGraphqlClient: () => client,
    rootElement,
  });

  return {
    applicationClient,
    client,
    connections,
    dispose,
    notificationHandle,
    rootElement,
  };
};

const clickLesson = (rootElement: HTMLElement, lessonId: string) => {
  const button = rootElement.querySelector<HTMLButtonElement>(`button[data-lesson-id="${lessonId}"]`);
  expect(button).not.toBeNull();
  button!.click();
};

describe("Socratic mounted runtime lifecycle", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app-root"></div>';
  });

  it("does not mutate or connect after unload while the initial lesson refresh is pending", async () => {
    const pendingLessons = deferred<ReturnType<typeof buildLesson>[]>();
    const lesson = vi.fn(async () => buildLesson("lesson-a"));
    const harness = createHarness({
      lessons: vi.fn(() => pendingLessons.promise),
      lesson,
    });

    harness.dispose();
    pendingLessons.resolve([buildLesson("lesson-a")]);
    await pendingLessons.promise;
    await Promise.resolve();

    expect(lesson).not.toHaveBeenCalled();
    expect(harness.applicationClient.agentCommunication.connect).not.toHaveBeenCalled();
    expect(harness.notificationHandle.close).toHaveBeenCalledOnce();
  });

  it("keeps the latest rapid selection when lesson details resolve out of order", async () => {
    const lessonA = deferred<ReturnType<typeof buildLesson>>();
    const lessonB = deferred<ReturnType<typeof buildLesson>>();
    const lessons = [buildLesson("lesson-c", { target: false }), buildLesson("lesson-a"), buildLesson("lesson-b")];
    const harness = createHarness({
      lessons: vi.fn(async () => lessons),
      lesson: vi.fn((lessonId: string) => {
        if (lessonId === "lesson-a") return lessonA.promise;
        if (lessonId === "lesson-b") return lessonB.promise;
        return Promise.resolve(buildLesson("lesson-c", { target: false }));
      }),
    });

    await vi.waitFor(() => {
      expect(harness.rootElement.querySelector('button[data-lesson-id="lesson-a"]')).not.toBeNull();
    });
    clickLesson(harness.rootElement, "lesson-a");
    clickLesson(harness.rootElement, "lesson-b");

    lessonB.resolve(buildLesson("lesson-b"));
    await vi.waitFor(() => {
      expect(harness.applicationClient.agentCommunication.connect).toHaveBeenCalledWith(addressFor("lesson-b"));
    });

    lessonA.resolve(buildLesson("lesson-a"));
    await lessonA.promise;
    await Promise.resolve();

    expect(harness.applicationClient.agentCommunication.connect).toHaveBeenCalledTimes(1);
    expect(harness.rootElement.querySelector("#lesson-detail")?.textContent).toContain("Problem lesson-b");
    expect(harness.rootElement.querySelector("#lesson-detail")?.textContent).not.toContain("Problem lesson-a");
    expect(harness.rootElement.querySelector('button[data-lesson-id="lesson-b"]')?.closest("article")?.className).toContain("active");
  });

  it("ignores a stale follow-up failure after a replacement lesson is selected", async () => {
    const pendingFollowUp = deferred<unknown>();
    const lessons = [buildLesson("lesson-a", { target: false }), buildLesson("lesson-b")];
    const harness = createHarness({
      lessons: vi.fn(async () => lessons),
      lesson: vi.fn(async (lessonId: string) => buildLesson(lessonId, { target: lessonId === "lesson-b" })),
      askFollowUp: vi.fn(() => pendingFollowUp.promise),
    });

    await vi.waitFor(() => {
      expect(harness.rootElement.querySelector("#follow-up-form")).not.toBeNull();
    });
    const input = harness.rootElement.querySelector<HTMLTextAreaElement>("#follow-up-input")!;
    input.value = "Why subtract first?";
    harness.rootElement.querySelector<HTMLFormElement>("#follow-up-form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    clickLesson(harness.rootElement, "lesson-b");
    await vi.waitFor(() => {
      expect(harness.applicationClient.agentCommunication.connect).toHaveBeenCalledWith(addressFor("lesson-b"));
    });

    pendingFollowUp.reject(new Error("stale follow-up failure"));
    await expect(pendingFollowUp.promise).rejects.toThrow("stale follow-up failure");
    await Promise.resolve();

    expect(harness.rootElement.querySelector("#workspace-status")?.textContent).not.toContain("stale follow-up failure");
    expect(harness.rootElement.querySelector("#lesson-detail")?.textContent).toContain("Problem lesson-b");
    expect(harness.connections[0].close).not.toHaveBeenCalled();
  });

  it("ignores a stale close completion after a replacement lesson is selected", async () => {
    const pendingClose = deferred<unknown>();
    const lessons = [buildLesson("lesson-a", { target: false }), buildLesson("lesson-b")];
    const lessonsRequest = vi.fn(async () => lessons);
    const harness = createHarness({
      lessons: lessonsRequest,
      lesson: vi.fn(async (lessonId: string) => buildLesson(lessonId, { target: lessonId === "lesson-b" })),
      closeLesson: vi.fn(() => pendingClose.promise),
    });

    await vi.waitFor(() => {
      expect(harness.rootElement.querySelector("#close-lesson")).not.toBeNull();
    });
    harness.rootElement.querySelector<HTMLButtonElement>("#close-lesson")!.click();
    clickLesson(harness.rootElement, "lesson-b");
    await vi.waitFor(() => {
      expect(harness.applicationClient.agentCommunication.connect).toHaveBeenCalledWith(addressFor("lesson-b"));
    });

    pendingClose.resolve(buildLesson("lesson-a", { target: false }));
    await pendingClose.promise;
    await Promise.resolve();

    expect(lessonsRequest).toHaveBeenCalledTimes(1);
    expect(harness.connections[0].close).not.toHaveBeenCalled();
    expect(harness.rootElement.querySelector("#lesson-detail")?.textContent).toContain("Problem lesson-b");
  });
});
