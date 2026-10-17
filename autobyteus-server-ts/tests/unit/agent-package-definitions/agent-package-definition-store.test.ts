import { describe, expect, it } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { AgentPackageDefinitionStore } from "../../../src/agent-package-definitions/services/agent-package-definition-store.js";
import type {
  DefinitionFolderLocation,
  KindDefinitionReadResult,
  DefinitionFolderReadResult,
} from "../../../src/agent-package-definitions/domain/agent-package-definition-types.js";

const location: DefinitionFolderLocation = {
  packageRoot: "/pkg",
  folderDir: "/pkg/agents/a",
  sourceClass: "registered_package",
};

const agent = (id: string, instructions = "v1") => new AgentDefinition({
  id, name: id, description: "d", instructions, toolNames: ["t"],
});

const valid = (id: string, instructions = "v1"): KindDefinitionReadResult => ({
  kind: "agent",
  result: { status: "valid", definition: agent(id, instructions), fingerprint: `fp-${instructions}` },
});
const invalid = (reason = "bad json"): KindDefinitionReadResult => ({
  kind: "agent",
  result: { status: "invalid", code: "DEFINITION_CONTRACT_INVALID", reason, definitionPath: "/pkg/agents/a/agent-config.json" },
});
const read = (root: KindDefinitionReadResult, nested: Map<string, KindDefinitionReadResult> | null = new Map()): DefinitionFolderReadResult => ({
  status: "read", location, root, nested,
});

describe("AgentPackageDefinitionStore reconcile rules", () => {
  it("adds a valid definition and reports no change for the same fingerprint", () => {
    const store = new AgentPackageDefinitionStore();
    expect(store.apply("agent", "a", read(valid("a")))).toBe(true);
    expect(store.apply("agent", "a", read(valid("a")))).toBe(false);
    expect(store.getDefinition("agent", "a")?.instructions).toBe("v1");
  });

  it("keeps the last good definition with an issue, then clears it when the file is fixed", () => {
    const store = new AgentPackageDefinitionStore();
    store.apply("agent", "a", read(valid("a")));

    expect(store.apply("agent", "a", read(invalid()))).toBe(true);
    expect(store.getDefinition("agent", "a")?.instructions).toBe("v1");
    expect(store.getEntry("agent", "a")?.issue).toMatchObject({
      code: "DEFINITION_CONTRACT_INVALID", reason: "bad json", packageRoot: "/pkg",
      definitionPath: "/pkg/agents/a/agent-config.json",
    });
    expect(store.apply("agent", "a", read(invalid()))).toBe(false);

    expect(store.apply("agent", "a", read(valid("a", "v2")))).toBe(true);
    expect(store.getDefinition("agent", "a")?.instructions).toBe("v2");
    expect(store.getEntry("agent", "a")?.issue).toBeNull();
  });

  it("holds a first-seen invalid definition as issue-only (unavailable)", () => {
    const store = new AgentPackageDefinitionStore();
    expect(store.apply("agent", "a", read(invalid()))).toBe(true);
    expect(store.getDefinition("agent", "a")).toBeNull();
    expect(store.listLoadIssueEntries("agent")).toHaveLength(1);
    expect(store.listFolderRoots("agent")[0]?.definition).toBeNull();
  });

  it("removes a definition folder that is gone", () => {
    const store = new AgentPackageDefinitionStore();
    store.apply("agent", "a", read(valid("a")));
    expect(store.apply("agent", "a", { status: "absent" })).toBe(true);
    expect(store.getDefinition("agent", "a")).toBeNull();
    expect(store.folderIds("agent")).toEqual([]);
    expect(store.apply("agent", "a", { status: "absent" })).toBe(false);
  });

  it("drops the last good definition for a duplicated identity", () => {
    const store = new AgentPackageDefinitionStore();
    store.apply("agent_team", "t", {
      status: "read", location, nested: new Map(),
      root: { kind: "agent_team", result: { status: "valid", definition: { id: "t", name: "T" } as never, fingerprint: "x" } },
    });
    store.apply("agent_team", "t", {
      status: "read", location, nested: new Map(),
      root: { kind: "agent_team", result: { status: "invalid", code: "DEFINITION_IDENTITY_DUPLICATED", reason: "dup", definitionPath: "/p" } },
    });
    expect(store.getDefinition("agent_team", "t")).toBeNull();
    expect(store.getEntry("agent_team", "t")?.issue?.code).toBe("DEFINITION_IDENTITY_DUPLICATED");
  });

  it("keeps a folder whose package folder is missing and records the source issue", () => {
    const store = new AgentPackageDefinitionStore();
    store.apply("agent", "a", read(valid("a")));
    expect(store.markSourceUnavailable("agent", "a", null)).toBe(true);
    expect(store.markSourceUnavailable("agent", "a", null)).toBe(false);
    expect(store.getDefinition("agent", "a")?.instructions).toBe("v1");
    expect(store.getEntry("agent", "a")?.issue?.code).toBe("DEFINITION_SOURCE_UNAVAILABLE");
    expect(store.apply("agent", "a", read(valid("a")))).toBe(true);
    expect(store.getEntry("agent", "a")?.issue).toBeNull();
  });

  it("names the read error when a package folder is present but unreadable", () => {
    const store = new AgentPackageDefinitionStore();
    store.apply("agent", "a", read(valid("a")));
    expect(store.markSourceUnavailable("agent", "a", "EACCES: permission denied")).toBe(true);
    expect(store.getDefinition("agent", "a")?.instructions).toBe("v1");
    expect(store.getEntry("agent", "a")?.issue).toMatchObject({
      code: "DEFINITION_SOURCE_UNAVAILABLE",
      reason: expect.stringContaining("could not be read (EACCES: permission denied)"),
    });
  });

  it("reconciles nested definitions independently with last good, and indexes them to their folder", () => {
    const store = new AgentPackageDefinitionStore();
    const team = (name: string): KindDefinitionReadResult => ({
      kind: "agent_team",
      result: { status: "valid", definition: { id: "t", name } as never, fingerprint: name },
    });
    store.apply("agent_team", "t", read(team("T"), new Map([["team-local-agent:t:a", valid("team-local-agent:t:a")]])));
    expect(store.folderOf("agent", "team-local-agent:t:a")).toEqual({ kind: "agent_team", folderId: "t" });

    // A broken nested agent keeps its last good copy; the Team is unaffected.
    expect(store.apply("agent_team", "t", read(team("T"), new Map([["team-local-agent:t:a", invalid()]])))).toBe(true);
    expect(store.getDefinition("agent", "team-local-agent:t:a")?.instructions).toBe("v1");
    expect(store.getEntry("agent", "team-local-agent:t:a")?.issue?.code).toBe("DEFINITION_CONTRACT_INVALID");
    expect(store.getEntry("agent_team", "t")?.issue).toBeNull();
    expect(store.listNestedDefinitions("agent_team", "agent").map((entry) => entry.id)).toEqual(["team-local-agent:t:a"]);

    // An unknown nested structure keeps the previous nested definitions unchanged.
    store.apply("agent_team", "t", read(team("T"), null));
    expect(store.getDefinition("agent", "team-local-agent:t:a")).not.toBeNull();

    // A removed nested folder removes only that node.
    expect(store.apply("agent_team", "t", read(team("T"), new Map()))).toBe(true);
    expect(store.getDefinition("agent", "team-local-agent:t:a")).toBeNull();
    expect(store.folderOf("agent", "team-local-agent:t:a")).toBeNull();
    expect(store.getDefinition("agent_team", "t")).not.toBeNull();
  });

  it("returns copies that callers cannot use to mutate the stored definition", () => {
    const store = new AgentPackageDefinitionStore();
    store.apply("agent", "a", read(valid("a")));
    const copy = store.getDefinition("agent", "a")!;
    expect(copy).toBeInstanceOf(AgentDefinition);
    copy.instructions = "mutated";
    copy.toolNames.push("x");
    expect(store.getDefinition("agent", "a")?.instructions).toBe("v1");
    expect(store.getDefinition("agent", "a")?.toolNames).toEqual(["t"]);
  });

  it("lists a folder's issues root first, then nested definitions in reader (path) order, even when a node is added later", () => {
    const store = new AgentPackageDefinitionStore();
    const team = { kind: "agent_team", result: { status: "valid", definition: { id: "t", name: "T" }, fingerprint: "t1" } } as KindDefinitionReadResult;
    store.apply("agent_team", "t", read(team, new Map([["t-b", valid("t-b")]])));
    store.apply("agent_team", "t", read(
      { kind: "agent_team", result: { status: "invalid", code: "DEFINITION_CONTRACT_INVALID", reason: "team", definitionPath: "/pkg/t" } },
      new Map([["t-a", invalid("a")], ["t-b", invalid("b")]]),
    ));
    expect(store.getFolderLoadIssues("agent_team", "t").map((entry) => [entry.kind, entry.definitionId, entry.name, entry.usingLastGood]))
      .toEqual([["agent_team", "t", "T", true], ["agent", "t-a", null, false], ["agent", "t-b", "t-b", true]]);
    expect([...store.listFolderLoadIssues("agent_team").keys()]).toEqual(["t"]);

    store.apply("agent_team", "t", read(team, new Map([["t-a", valid("t-a")], ["t-b", valid("t-b")]])));
    expect(store.getFolderLoadIssues("agent_team", "t")).toEqual([]);
    expect(store.listFolderLoadIssues("agent_team").size).toBe(0);
    expect(store.getFolderLoadIssues("agent_team", "unknown")).toEqual([]);
  });
});
