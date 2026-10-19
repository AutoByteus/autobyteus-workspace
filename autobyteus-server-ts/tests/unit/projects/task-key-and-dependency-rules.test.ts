import { describe, expect, it } from "vitest";
import { formatTaskKey, taskKeyPrefixOf, uniqueTaskKeyPrefix } from "../../../src/projects/domain/task-keys.js";
import { assertDependenciesValid, normalizeDependsOn, sameDependencies } from "../../../src/projects/domain/task-dependencies.js";
import { formatTaskKeyV1, taskKeyPrefixOfV1, uniqueTaskKeyPrefixV1 } from "../../../src/app-data-migrations/migrations/project-task-keys-v1/task-key-prefix-v1.js";

const NAMES: Array<[string, string]> = [
  ["AutoByteus", "autobyteus"],
  ["AutoByteus Agents", "autobyteus-agents"],
  ["Customer Onboarding Experience Redesign", "customer-onboarding-experience-redesign"],
  ["Café Ops", "cafe-ops"],
  ["客户门户", "客户门户"],
  ["!!!", "project"],
  ["  AutoByteus!  ", "autobyteus"],
  ["Niuzhirui App Market", "niuzhirui-app-market"],
  ["Tiếng Việt", "tieng-viet"],
  ["İstanbul Ofisi", "istanbul-ofisi"],
  ["がぎ プロジェクト", "がぎ-プロジェクト"],
  ["हिन्दी टीम", "हिन्दी-टीम"],
  ["한국 팀", "한국-팀"],
  ["Q3/Q4 — Plan_2026", "q3-q4-plan-2026"],
  ["", "project"],
];

describe("Task key rules (DEC-001, DEC-002; AC-005)", () => {
  it.each(NAMES)("derives the prefix of %j as %j", (name, prefix) => {
    expect(taskKeyPrefixOf(name)).toBe(prefix);
  });

  it("the migration's frozen copy derives the same prefixes, suffixes and keys", () => {
    for (const [name] of NAMES) expect(taskKeyPrefixOfV1(name)).toBe(taskKeyPrefixOf(name));
    const taken = new Set(["autobyteus", "autobyteus-2"]);
    expect(uniqueTaskKeyPrefixV1("autobyteus", taken)).toBe(uniqueTaskKeyPrefix("autobyteus", taken));
    expect(formatTaskKeyV1("autobyteus", 42)).toBe(formatTaskKey("autobyteus", 42));
  });

  it("gives a taken prefix the smallest free suffix, so keys stay unique (AC-004)", () => {
    expect(uniqueTaskKeyPrefix("autobyteus", [])).toBe("autobyteus");
    expect(uniqueTaskKeyPrefix("autobyteus", ["autobyteus"])).toBe("autobyteus-2");
    expect(uniqueTaskKeyPrefix("autobyteus", ["autobyteus", "autobyteus-2"])).toBe("autobyteus-3");
    expect(uniqueTaskKeyPrefix("autobyteus", ["autobyteus", "autobyteus-3"])).toBe("autobyteus-2");
    expect(formatTaskKey("autobyteus-2", 1)).toBe("autobyteus-2-1");
  });
});

const tasks = (edges: Record<string, string[]>) => Object.entries(edges).map(([taskId, dependsOnTaskIds], index) => ({
  taskId, taskKey: `p-${index + 1}`, dependsOnTaskIds,
}));

describe("Dependency rules (REQ-006, REQ-007)", () => {
  it("normalizes to trimmed, de-duplicated IDs in submitted order and rejects non-strings", () => {
    expect(normalizeDependsOn([" b", "a", "b ", "a"])).toEqual(["b", "a"]);
    expect(() => normalizeDependsOn(["a", 1])).toThrow(expect.objectContaining({ code: "TASK_DEPENDENCY_INVALID" }));
    expect(sameDependencies(["a", "b"], ["b", "a"])).toBe(true);
    expect(sameDependencies(["a"], ["a", "b"])).toBe(false);
    expect(sameDependencies([], [])).toBe(true);
  });

  it("accepts current Tasks of the Project in any status, including the Task's current list", () => {
    const project = tasks({ A: [], B: ["A"], C: [] });
    expect(() => assertDependenciesValid("C", ["A", "B"], project)).not.toThrow();
    expect(() => assertDependenciesValid(null, ["A", "B", "C"], project)).not.toThrow();
  });

  it("rejects the Task itself and an ID that is not a current Task of this Project", () => {
    const project = tasks({ A: [], B: [] });
    expect(() => assertDependenciesValid("A", ["A"], project)).toThrow(expect.objectContaining({ code: "TASK_DEPENDENCY_INVALID", message: "A Task cannot depend on itself." }));
    expect(() => assertDependenciesValid("A", ["other_project_task"], project)).toThrow(expect.objectContaining({ code: "TASK_DEPENDENCY_INVALID" }));
    expect(() => assertDependenciesValid(null, [""], project)).toThrow(expect.objectContaining({ code: "TASK_DEPENDENCY_INVALID" }));
  });

  it("rejects direct and indirect loops, naming the Task by key", () => {
    const direct = tasks({ A: [], B: ["A"] });
    expect(() => assertDependenciesValid("A", ["B"], direct)).toThrow(expect.objectContaining({
      code: "TASK_DEPENDENCY_INVALID", message: expect.stringContaining("This Task cannot depend on p-2") }));
    const indirect = tasks({ A: [], B: ["A"], C: ["B"], D: [] });
    expect(() => assertDependenciesValid("A", ["D", "C"], indirect)).toThrow(expect.objectContaining({ code: "TASK_DEPENDENCY_INVALID" }));
    // IDs that name no current Task are ignored while walking.
    expect(() => assertDependenciesValid("A", ["D"], tasks({ A: [], D: ["gone"] }))).not.toThrow();
    // Diamonds are not loops.
    expect(() => assertDependenciesValid("D", ["B", "C"], tasks({ A: [], B: ["A"], C: ["A"], D: [] }))).not.toThrow();
  });
});
