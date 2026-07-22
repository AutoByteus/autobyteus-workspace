// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import {
  renderLessonDetail,
  renderSocraticMathTeacherShell,
} from "../../../../applications/socratic-math-teacher/frontend-src/socratic-renderer.js";

const message = (role: string, body: string, index: number) => ({
  messageId: `message-${index}`,
  lessonId: "lesson-1",
  role,
  kind: role === "tutor" ? "response" : "prompt",
  body,
  createdAt: `2026-07-22T12:00:0${index}.000Z`,
});

const renderDetail = (
  tutorLive: Record<string, unknown>,
  messages = [message("student", "Solve 3x + 5 = 20", 1)],
  closingLessonId: string | null = null,
) => {
  document.body.innerHTML = '<div id="app-root"></div>';
  const rootElement = document.getElementById("app-root")!;
  renderSocraticMathTeacherShell(rootElement);
  const state = {
    closingLessonId,
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
      messages,
    },
    tutorLive,
  };
  renderLessonDetail({
    state,
    elements: { lessonDetail: rootElement.querySelector("#lesson-detail") },
    onAskFollowUp: vi.fn(),
    onRequestHint: vi.fn(),
    onCloseLesson: vi.fn(),
    onError: vi.fn(),
  });
  return rootElement;
};

describe("Socratic live tutor renderer", () => {
  it("renders only minimal escaped live text and disables next-turn actions while joining", () => {
    const root = renderDetail({
      lessonId: "lesson-1",
      status: "streaming",
      livePhase: "streaming",
      turnAdmission: "awaiting_join",
      text: "What should <you> subtract?",
      errorMessage: null,
      liveWarning: null,
    });
    const liveTutor = root.querySelector(".live-tutor")!;
    expect(liveTutor.getAttribute("aria-live")).toBe("polite");
    expect(liveTutor.textContent).toContain("Tutor is responding…");
    expect(liveTutor.textContent).toContain("What should <you> subtract?");
    expect(liveTutor.innerHTML).not.toContain("<you>");
    expect(liveTutor.textContent).not.toContain("tool");
    expect(root.querySelector<HTMLButtonElement>("#request-hint")?.disabled).toBe(true);
    expect(root.querySelector<HTMLTextAreaElement>("#follow-up-input")?.disabled).toBe(true);
    expect(root.querySelector<HTMLButtonElement>("#close-lesson")?.disabled).toBe(false);
    expect(root.querySelector("#turn-admission-help")?.textContent).toContain(
      "Wait for the current tutor response to be saved before sending another.",
    );
  });

  it("withholds only newly durable tutor rows while keeping student rows and live deltas visible", () => {
    const root = renderDetail({
      lessonId: "lesson-1",
      status: "streaming",
      livePhase: "streaming",
      turnAdmission: "awaiting_join",
      durableObservedForTurn: true,
      durableTutorMessageBaseline: 1,
      deferDurableTutorMessages: true,
      text: "Live next answer",
      errorMessage: null,
      liveWarning: null,
    }, [
      message("student", "Original problem", 1),
      message("tutor", "Earlier durable answer", 2),
      message("student", "New follow-up", 3),
      message("tutor", "New durable answer", 4),
    ]);

    expect(root.textContent).toContain("Original problem");
    expect(root.textContent).toContain("Earlier durable answer");
    expect(root.textContent).toContain("New follow-up");
    expect(root.textContent).toContain("Live next answer");
    expect(root.textContent).not.toContain("New durable answer");
  });

  it("reveals durable output, clears draft, and enables exactly one next action after saved join", () => {
    const root = renderDetail({
      lessonId: "lesson-1",
      status: "saved",
      livePhase: "completed",
      turnAdmission: "available",
      durableObservedForTurn: true,
      durableTutorMessageBaseline: 0,
      deferDurableTutorMessages: false,
      text: "",
      errorMessage: null,
      liveWarning: null,
    }, [
      message("student", "Original problem", 1),
      message("tutor", "Authoritative durable answer", 2),
    ]);
    expect(root.querySelector(".live-tutor")?.getAttribute("data-live-state")).toBe("saved");
    expect(root.querySelector(".live-tutor-text")).toBeNull();
    expect(root.textContent).toContain("Authoritative durable answer");
    expect(root.querySelector<HTMLButtonElement>("#request-hint")?.disabled).toBe(false);
    expect(root.querySelector<HTMLTextAreaElement>("#follow-up-input")?.disabled).toBe(false);
  });

  it("shows a nonblocking warning after durable success and keeps Close lesson available", () => {
    const root = renderDetail({
      lessonId: "lesson-1",
      status: "saved",
      livePhase: "closed",
      turnAdmission: "closed",
      text: "",
      errorMessage: null,
      liveWarning: "The live tutor stream closed after the response was saved.",
    });
    expect(root.querySelector(".live-warning")?.textContent).toContain("after the response was saved");
    expect(root.querySelector(".live-error")).toBeNull();
    expect(root.querySelector<HTMLButtonElement>("#close-lesson")?.disabled).toBe(false);
  });
});
