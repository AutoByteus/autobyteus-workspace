import { afterEach, describe, expect, it, vi } from "vitest";
import { renderBriefDetail } from "../../../../applications/brief-studio/frontend-src/brief-studio-renderer.js";

type FakeElement = {
  className: string;
  textContent: string;
  innerHTML: string;
};

const createBriefDetailElement = (): FakeElement => ({
  className: "",
  textContent: "",
  innerHTML: "",
});

const baseBrief = {
  briefId: "brief-1",
  title: "Semantic final artifact brief",
  status: "in_review",
  createdAt: "2026-04-19T12:00:00.000Z",
  updatedAt: "2026-04-19T12:01:00.000Z",
  approvedAt: null,
  rejectedAt: null,
  latestBindingId: null,
  latestBindingStatus: null,
  latestRunId: null,
  lastErrorMessage: null,
  reviewNotes: [],
};

const renderFinalCount = (artifact: Record<string, unknown>): string => {
  vi.stubGlobal("document", {
    getElementById: vi.fn(() => null),
  });
  const briefDetail = createBriefDetailElement();

  renderBriefDetail({
    state: {
      detail: {
        ...baseBrief,
        artifacts: [artifact],
      },
      executions: [],
    },
    elements: { briefDetail },
    onLaunchDraftRun: vi.fn(async () => undefined),
    onApprove: vi.fn(async () => undefined),
    onReject: vi.fn(async () => undefined),
    onAddReviewNote: vi.fn(async () => undefined),
    onError: vi.fn(),
  });

  return briefDetail.innerHTML;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Brief Studio renderer artifact semantics", () => {
  it("counts final artifacts by publicationKind instead of exact path equality", () => {
    const exactFinalPathDraftHtml = renderFinalCount({
      artifactKind: "writer",
      publicationKind: "draft",
      path: "brief-studio/final-brief.md",
      description: "Looks like the final filename but is only a draft.",
      body: "Draft body",
    });
    expect(exactFinalPathDraftHtml).toContain("0 final");

    const arbitraryPathFinalHtml = renderFinalCount({
      artifactKind: "writer",
      publicationKind: "final",
      path: "/tmp/downloads/not-the-canonical-final-path.md",
      description: "Semantically final despite arbitrary source path.",
      body: "Final body",
    });
    expect(arbitraryPathFinalHtml).toContain("1 final");
  });
});
