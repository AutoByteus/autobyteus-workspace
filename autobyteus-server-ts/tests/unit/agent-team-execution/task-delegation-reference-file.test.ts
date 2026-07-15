import { describe, expect, it } from "vitest";
import {
  buildTaskDelegationReferenceId,
  normalizeTaskDelegationReferenceFiles,
} from "../../../src/agent-team-execution/task-delegation/task-delegation-reference-file.js";

describe("task delegation reference files", () => {
  it("builds route-safe reference ids without embedding absolute paths", () => {
    const referenceId = buildTaskDelegationReferenceId(
      0,
      "/var/folders/example/math_problem_train_bird.txt",
    );

    expect(referenceId).toMatch(/^task-reference:0:[a-f0-9]{32}$/);
    expect(referenceId).not.toContain("/var/folders");
    expect(referenceId).not.toContain("math_problem_train_bird.txt");
  });

  it("keeps absolute paths on the reference record while using route-safe ids", () => {
    const [reference] = normalizeTaskDelegationReferenceFiles(
      ["/tmp/math_problem_train_bird.txt"],
      "2026-07-05T00:00:00.000Z",
    );

    expect(reference).toEqual(expect.objectContaining({
      referenceId: expect.stringMatching(/^task-reference:0:[a-f0-9]{32}$/),
      path: "/tmp/math_problem_train_bird.txt",
      type: "file",
    }));
    expect(reference!.referenceId).not.toContain(reference!.path);
  });
});
