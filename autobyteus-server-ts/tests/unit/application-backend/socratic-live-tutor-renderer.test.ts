// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import {
  renderLessonDetail,
  renderSocraticMathTeacherShell,
} from "../../../../applications/socratic-math-teacher/frontend-src/socratic-renderer.js";

const renderDetail = (tutorLive: Record<string, unknown>) => {
  document.body.innerHTML = '<div id="app-root"></div>';
  const rootElement = document.getElementById("app-root")!;
  renderSocraticMathTeacherShell(rootElement);
  const elements = {
    lessonDetail: rootElement.querySelector("#lesson-detail"),
  };
  const state = {
    detail: {
      lessonId: "lesson-1",
      prompt: "Solve 3x + 5 = 20",
      status: "active",
      latestBindingId: "binding-lesson-1",
      latestRunId: "team-run-1",
      latestBindingStatus: "ATTACHED",
      lastErrorMessage: null,
      createdAt: "2026-07-22T12:00:00.000Z",
      updatedAt: "2026-07-22T12:00:00.000Z",
      closedAt: null,
      messages: [{
        messageId: "message-1",
        lessonId: "lesson-1",
        role: "student",
        kind: "prompt",
        body: "Solve 3x + 5 = 20",
        createdAt: "2026-07-22T12:00:00.000Z",
      }],
    },
    tutorLive,
  };
  renderLessonDetail({
    state,
    elements,
    onAskFollowUp: vi.fn(),
    onRequestHint: vi.fn(),
    onCloseLesson: vi.fn(),
    onError: vi.fn(),
  });
  return rootElement.querySelector(".live-tutor")!;
};

describe("Socratic live tutor renderer", () => {
  it("renders the focused streaming state accessibly and escapes live text", () => {
    const liveTutor = renderDetail({
      lessonId: "lesson-1",
      status: "streaming",
      text: "What should <you> subtract?",
      toolStatus: "Saving the tutor response…",
      responseCompleted: true,
      errorMessage: null,
    });

    expect(liveTutor.getAttribute("aria-live")).toBe("polite");
    expect(liveTutor.getAttribute("data-live-state")).toBe("streaming");
    expect(liveTutor.textContent).toContain("Tutor is responding…");
    expect(liveTutor.textContent).toContain("What should <you> subtract?");
    expect(liveTutor.textContent).toContain("Saving the tutor response…");
    expect(liveTutor.textContent).toContain("Response complete");
    expect(liveTutor.innerHTML).not.toContain("<you>");
  });

  it("shows durable convergence without duplicating the ephemeral draft", () => {
    const liveTutor = renderDetail({
      lessonId: "lesson-1",
      status: "saved",
      text: "",
      toolStatus: "Tutor response saved to the transcript.",
      responseCompleted: true,
      errorMessage: null,
    });

    expect(liveTutor.getAttribute("data-live-state")).toBe("saved");
    expect(liveTutor.textContent).toContain("Tutor response saved");
    expect(liveTutor.textContent).toContain("Tutor response saved to the transcript.");
    expect(liveTutor.querySelector(".live-tutor-text")).toBeNull();
  });
});
