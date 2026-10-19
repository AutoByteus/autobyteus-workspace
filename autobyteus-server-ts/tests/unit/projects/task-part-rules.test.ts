import { describe, expect, it } from "vitest";
import { assertParentValid, normalizePartOf } from "../../../src/projects/domain/task-parts.js";
import { compareTaskKeys } from "../../../src/projects/domain/task-keys.js";

/** The pure "part of" rule (REQ-002, REQ-003): same Project, not itself, one level only; clearing always passes. */
const task = (taskId: string, partOfTaskId: string | null = null) => ({ taskId, taskKey: `autobyteus-${taskId}`, partOfTaskId });
const refusal = (message: string) => expect.objectContaining({ code: "TASK_PARENT_INVALID", message });

describe("Task part rules", () => {
  it("normalizes a supplied parent: trimmed ID, or null for null and blank; anything else is refused", () => {
    expect(normalizePartOf(" project_task_1 ")).toBe("project_task_1");
    expect(normalizePartOf("")).toBeNull();
    expect(normalizePartOf("  ")).toBeNull();
    expect(normalizePartOf(null)).toBeNull();
    for (const bad of [7, ["project_task_1"], {}, undefined]) expect(() => normalizePartOf(bad)).toThrow(refusal("The parent must be a Task ID."));
  });

  it("accepts a current Task of the Project that has no parent, for a new Task and an existing one", () => {
    const tasks = [task("1"), task("2"), task("3", "1")];
    expect(() => assertParentValid(null, "1", tasks)).not.toThrow();
    expect(() => assertParentValid("2", "1", tasks)).not.toThrow();
    // Re-saving the same parent (no change) passes too.
    expect(() => assertParentValid("3", "1", tasks)).not.toThrow();
  });

  it("refuses the Task itself and a Task that is not a current Task of this Project", () => {
    const tasks = [task("1"), task("2")];
    expect(() => assertParentValid("1", "1", tasks)).toThrow(refusal("A Task cannot be part of itself."));
    expect(() => assertParentValid("1", "project_task_missing", tasks)).toThrow(refusal("Task 'project_task_missing' is not a current Task of this Project."));
  });

  it("one level only: a part cannot be a parent, and a Task with parts cannot become a part (AC-004)", () => {
    const tasks = [task("1"), task("2", "1"), task("3"), task("4")];
    expect(() => assertParentValid("3", "2", tasks)).toThrow(refusal("autobyteus-2 is itself part of autobyteus-1; a part can't have parts of its own."));
    expect(() => assertParentValid(null, "2", tasks)).toThrow(refusal("autobyteus-2 is itself part of autobyteus-1; a part can't have parts of its own."));
    expect(() => assertParentValid("1", "4", tasks)).toThrow(refusal("This Task has parts, so it can't be part of another Task."));
    // That also rules out a loop: "1 part of 2" while 2 is part of 1.
    expect(() => assertParentValid("1", "2", tasks)).toThrow(expect.objectContaining({ code: "TASK_PARENT_INVALID" }));
  });

  it("clearing always passes; a dangling grandparent counts as no parent", () => {
    expect(() => assertParentValid("1", null, [task("1"), task("2", "1")])).not.toThrow();
    expect(() => assertParentValid("3", "2", [task("2", "project_task_deleted"), task("3")])).not.toThrow();
  });

  it("orders keys by number within a Project", () => {
    expect(["autobyteus-172", "autobyteus-25", "autobyteus-3"].sort(compareTaskKeys)).toEqual(["autobyteus-3", "autobyteus-25", "autobyteus-172"]);
    expect(["a-b-10", "a-b-9"].sort(compareTaskKeys)).toEqual(["a-b-9", "a-b-10"]);
  });
});
