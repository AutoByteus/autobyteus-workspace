import { describe, expect, it } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { DefinitionCatalog } from "../../../src/definition-catalog/services/definition-catalog.js";
import type {
  DefinitionUnitLocation,
  SubjectNodeOutcome,
  UnitReadOutcome,
} from "../../../src/definition-catalog/domain/definition-catalog-types.js";

const location: DefinitionUnitLocation = {
  packageRoot: "/pkg",
  unitDir: "/pkg/agents/a",
  sourceClass: "external_read_only",
  fromRegisteredRoot: true,
};

const agent = (id: string, instructions = "v1") => new AgentDefinition({
  id, name: id, description: "d", instructions, toolNames: ["t"],
});

const valid = (id: string, instructions = "v1"): SubjectNodeOutcome => ({
  subject: "agent",
  outcome: { kind: "valid", definition: agent(id, instructions), fingerprint: `fp-${instructions}` },
});
const invalid = (reason = "bad json"): SubjectNodeOutcome => ({
  subject: "agent",
  outcome: { kind: "invalid", code: "DEFINITION_CONTRACT_INVALID", reason, definitionPath: "/pkg/agents/a/agent-config.json" },
});
const read = (root: SubjectNodeOutcome, children: Map<string, SubjectNodeOutcome> | null = new Map()): UnitReadOutcome => ({
  kind: "read", location, root, children,
});

describe("DefinitionCatalog reconcile rules", () => {
  it("adds a valid definition and reports no change for the same fingerprint", () => {
    const catalog = new DefinitionCatalog();
    expect(catalog.apply("agent", "a", read(valid("a")))).toBe(true);
    expect(catalog.apply("agent", "a", read(valid("a")))).toBe(false);
    expect(catalog.getDefinition("agent", "a")?.instructions).toBe("v1");
  });

  it("keeps the last good definition with an issue, then clears it when the file is fixed", () => {
    const catalog = new DefinitionCatalog();
    catalog.apply("agent", "a", read(valid("a")));

    expect(catalog.apply("agent", "a", read(invalid()))).toBe(true);
    expect(catalog.getDefinition("agent", "a")?.instructions).toBe("v1");
    expect(catalog.getEntry("agent", "a")?.issue).toMatchObject({
      code: "DEFINITION_CONTRACT_INVALID", reason: "bad json", packageRoot: "/pkg",
      definitionPath: "/pkg/agents/a/agent-config.json",
    });
    expect(catalog.apply("agent", "a", read(invalid()))).toBe(false);

    expect(catalog.apply("agent", "a", read(valid("a", "v2")))).toBe(true);
    expect(catalog.getDefinition("agent", "a")?.instructions).toBe("v2");
    expect(catalog.getEntry("agent", "a")?.issue).toBeNull();
  });

  it("holds a first-seen invalid definition as issue-only (unavailable)", () => {
    const catalog = new DefinitionCatalog();
    expect(catalog.apply("agent", "a", read(invalid()))).toBe(true);
    expect(catalog.getDefinition("agent", "a")).toBeNull();
    expect(catalog.listIssueEntries("agent")).toHaveLength(1);
    expect(catalog.listUnitRoots("agent")[0]?.definition).toBeNull();
  });

  it("removes a unit whose folder is gone", () => {
    const catalog = new DefinitionCatalog();
    catalog.apply("agent", "a", read(valid("a")));
    expect(catalog.apply("agent", "a", { kind: "absent" })).toBe(true);
    expect(catalog.getDefinition("agent", "a")).toBeNull();
    expect(catalog.unitIds("agent")).toEqual([]);
    expect(catalog.apply("agent", "a", { kind: "absent" })).toBe(false);
  });

  it("drops the last good definition for a duplicated identity", () => {
    const catalog = new DefinitionCatalog();
    catalog.apply("agent_team", "t", {
      kind: "read", location, children: new Map(),
      root: { subject: "agent_team", outcome: { kind: "valid", definition: { id: "t", name: "T" } as never, fingerprint: "x" } },
    });
    catalog.apply("agent_team", "t", {
      kind: "read", location, children: new Map(),
      root: { subject: "agent_team", outcome: { kind: "invalid", code: "DEFINITION_IDENTITY_DUPLICATED", reason: "dup", definitionPath: "/p" } },
    });
    expect(catalog.getDefinition("agent_team", "t")).toBeNull();
    expect(catalog.getEntry("agent_team", "t")?.issue?.code).toBe("DEFINITION_IDENTITY_DUPLICATED");
  });

  it("keeps a unit whose package folder is missing and records the source issue", () => {
    const catalog = new DefinitionCatalog();
    catalog.apply("agent", "a", read(valid("a")));
    expect(catalog.markSourceUnavailable("agent", "a", null)).toBe(true);
    expect(catalog.markSourceUnavailable("agent", "a", null)).toBe(false);
    expect(catalog.getDefinition("agent", "a")?.instructions).toBe("v1");
    expect(catalog.getEntry("agent", "a")?.issue?.code).toBe("DEFINITION_SOURCE_MISSING");
    expect(catalog.apply("agent", "a", read(valid("a")))).toBe(true);
    expect(catalog.getEntry("agent", "a")?.issue).toBeNull();
  });

  it("names the read error when a package folder is present but unreadable", () => {
    const catalog = new DefinitionCatalog();
    catalog.apply("agent", "a", read(valid("a")));
    expect(catalog.markSourceUnavailable("agent", "a", "EACCES: permission denied")).toBe(true);
    expect(catalog.getDefinition("agent", "a")?.instructions).toBe("v1");
    expect(catalog.getEntry("agent", "a")?.issue).toMatchObject({
      code: "DEFINITION_SOURCE_MISSING",
      reason: expect.stringContaining("could not be read (EACCES: permission denied)"),
    });
  });

  it("reconciles nested nodes independently with last good, and indexes them to their unit", () => {
    const catalog = new DefinitionCatalog();
    const team = (name: string): SubjectNodeOutcome => ({
      subject: "agent_team",
      outcome: { kind: "valid", definition: { id: "t", name } as never, fingerprint: name },
    });
    catalog.apply("agent_team", "t", read(team("T"), new Map([["team-local-agent:t:a", valid("team-local-agent:t:a")]])));
    expect(catalog.unitOf("agent", "team-local-agent:t:a")).toEqual({ subject: "agent_team", unitId: "t" });

    // A broken nested agent keeps its last good copy; the Team is unaffected.
    expect(catalog.apply("agent_team", "t", read(team("T"), new Map([["team-local-agent:t:a", invalid()]])))).toBe(true);
    expect(catalog.getDefinition("agent", "team-local-agent:t:a")?.instructions).toBe("v1");
    expect(catalog.getEntry("agent", "team-local-agent:t:a")?.issue?.code).toBe("DEFINITION_CONTRACT_INVALID");
    expect(catalog.getEntry("agent_team", "t")?.issue).toBeNull();
    expect(catalog.listNestedNodes("agent_team", "agent").map((entry) => entry.id)).toEqual(["team-local-agent:t:a"]);

    // An unknown nested structure keeps the previous nested nodes unchanged.
    catalog.apply("agent_team", "t", read(team("T"), null));
    expect(catalog.getDefinition("agent", "team-local-agent:t:a")).not.toBeNull();

    // A removed nested folder removes only that node.
    expect(catalog.apply("agent_team", "t", read(team("T"), new Map()))).toBe(true);
    expect(catalog.getDefinition("agent", "team-local-agent:t:a")).toBeNull();
    expect(catalog.unitOf("agent", "team-local-agent:t:a")).toBeNull();
    expect(catalog.getDefinition("agent_team", "t")).not.toBeNull();
  });

  it("returns copies that callers cannot use to mutate the stored definition", () => {
    const catalog = new DefinitionCatalog();
    catalog.apply("agent", "a", read(valid("a")));
    const copy = catalog.getDefinition("agent", "a")!;
    expect(copy).toBeInstanceOf(AgentDefinition);
    copy.instructions = "mutated";
    copy.toolNames.push("x");
    expect(catalog.getDefinition("agent", "a")?.instructions).toBe("v1");
    expect(catalog.getDefinition("agent", "a")?.toolNames).toEqual(["t"]);
  });

  it("lists a unit's issues root first, then nested nodes in reader (path) order, even when a node is added later", () => {
    const catalog = new DefinitionCatalog();
    const team = { subject: "agent_team", outcome: { kind: "valid", definition: { id: "t", name: "T" }, fingerprint: "t1" } } as SubjectNodeOutcome;
    catalog.apply("agent_team", "t", read(team, new Map([["t-b", valid("t-b")]])));
    catalog.apply("agent_team", "t", read(
      { subject: "agent_team", outcome: { kind: "invalid", code: "DEFINITION_CONTRACT_INVALID", reason: "team", definitionPath: "/pkg/t" } },
      new Map([["t-a", invalid("a")], ["t-b", invalid("b")]]),
    ));
    expect(catalog.getUnitIssues("agent_team", "t").map((entry) => [entry.subject, entry.definitionId, entry.name, entry.usingLastGood]))
      .toEqual([["agent_team", "t", "T", true], ["agent", "t-a", null, false], ["agent", "t-b", "t-b", true]]);
    expect([...catalog.listUnitIssues("agent_team").keys()]).toEqual(["t"]);

    catalog.apply("agent_team", "t", read(team, new Map([["t-a", valid("t-a")], ["t-b", valid("t-b")]])));
    expect(catalog.getUnitIssues("agent_team", "t")).toEqual([]);
    expect(catalog.listUnitIssues("agent_team").size).toBe(0);
    expect(catalog.getUnitIssues("agent_team", "unknown")).toEqual([]);
  });
});
