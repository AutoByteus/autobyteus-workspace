import { describe, expect, it } from "vitest";
import { appendComment, normalizeCommentText } from "../../../src/projects/domain/task-comments.js";

/** The pure comment rules (task-comments REQ-001, REQ-004): trimmed non-empty text; the next number; add only. */
describe("Task comment rules", () => {
  it("trims the text and refuses blank or non-string text", () => {
    expect(normalizeCommentText("  Decision: use X \n")).toBe("Decision: use X");
    expect(normalizeCommentText("line 1\n\nline 2")).toBe("line 1\n\nline 2");
    for (const bad of ["", "   \n ", null, undefined, 7, ["x"]]) {
      expect(() => normalizeCommentText(bad)).toThrow(expect.objectContaining({ code: "TASK_COMMENT_INVALID", message: "Comment text is required." }));
    }
  });

  it("appends at the end with the next number (1 for the first, then the highest + 1) and the given time", () => {
    const first = appendComment({ comments: [], other: "kept" }, "one", "t1");
    expect(first).toEqual({ other: "kept", comments: [{ id: 1, createdAt: "t1", text: "one" }] });
    const third = appendComment({ comments: [{ id: 1, createdAt: "t1", text: "one" }, { id: 4, createdAt: "t2", text: "four" }] }, "next", "t3");
    expect(third.comments.map((c) => c.id)).toEqual([1, 4, 5]);
    expect(third.comments.at(-1)).toEqual({ id: 5, createdAt: "t3", text: "next" });
  });
});
