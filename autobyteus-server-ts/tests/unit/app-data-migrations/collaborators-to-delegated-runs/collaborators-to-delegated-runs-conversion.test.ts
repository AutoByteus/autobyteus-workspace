import { describe, expect, it } from "vitest";
import {
  convertCollaboratorsToDelegatedRuns,
  InvalidCollaboratorError,
} from "../../../../src/app-data-migrations/migrations/collaborators-to-delegated-runs-v1/collaborators-to-delegated-runs-conversion.js";
import { agentCollaborator, launch, sourcelessCopy, T1, T2, T3, teamCollaborator, type Json } from "./released-collaborator-fixtures.js";

const standalone = (extra: Json): Json => ({ subjectKind: "agent", createdAt: T1, host: { address: "/host", agentRunId: "host", agentDefinitionId: "host-definition" }, taskExecutions: [], ...extra });
const converted = (tree: Json, key: null | "rootTeam" | "rootOrg" = null) => {
  const result = convertCollaboratorsToDelegatedRuns(tree, key);
  if (result.kind !== "converted") throw new Error("expected a conversion");
  return result;
};

describe("collaborators to delegated runs conversion (pure)", () => {
  it("maps a collaborator Agent to an unowned root-level run keyed by its original run ID, losslessly", () => {
    const entry = agentCollaborator({ address: "/code_reviewer", runId: "reviewer-run", definitionId: "reviewer", viaRunId: "host", extra: { userLaunchSelection: { llmModelIdentifier: "x", llmConfig: null, selectedAt: T3 } } });
    const { tree, collaboratorCount } = converted(standalone({ collaborators: [entry] }));
    expect(collaboratorCount).toBe(1);
    expect(tree).not.toHaveProperty("collaborators");
    expect(tree["taskExecutions"]).toEqual([{
      address: "/code_reviewer", agentRunId: "reviewer-run", platformAgentRunId: null, delegatorAgentRunId: "host", startedAt: T1,
      source: { kind: "agent", agentDefinitionId: "reviewer", launchConfiguration: launch(), launchSource: { origin: "inherited", fallbacks: [] } },
      userLaunchSelection: { llmModelIdentifier: "x", llmConfig: null, selectedAt: T3 },
    }]);
  });

  it("maps a collaborator Team to a Team run with its members, handoffs, defaults, stored copies and choices", () => {
    const hosted = { ...sourcelessCopy("/product_team/designer", "designer-extra", "product-lead"), source: { kind: "agent", agentDefinitionId: "d", launchConfiguration: launch() } };
    const entry = teamCollaborator({ address: "/product_team", teamRunId: "product-run", definitionId: "product", viaRunId: "host", taskExecutions: [hosted] });
    const { tree } = converted(standalone({ collaborators: [entry] }));
    const [team] = tree["taskExecutions"] as Json[];
    expect(team).toEqual({
      address: "/product_team", teamRunId: "product-run", delegatorAgentRunId: "host", startedAt: T2,
      members: [
        { address: "/product_team/lead", agentRunId: "product-run-lead", platformAgentRunId: null },
        { address: "/product_team/designer", agentRunId: "product-run-designer", platformAgentRunId: null,
          userLaunchSelection: { llmModelIdentifier: "chosen", llmConfig: null, selectedAt: T3 } },
      ],
      taskExecutions: [hosted],
      source: {
        kind: "agent_team", teamDefinitionId: "product", coordinatorAddress: "/product_team/lead",
        members: [
          { address: "/product_team/lead", agentDefinitionId: "lead-definition" },
          { address: "/product_team/designer", agentDefinitionId: "designer-definition", launchConfiguration: launch("model-b"), launchSource: { origin: "agent_default", fallbacks: [] } },
        ],
        handoffs: [{ from: "/product_team/lead", to: "/product_team/designer", rules: ["UI work"] }],
        defaultLaunchConfiguration: launch(), defaultLaunchSource: { origin: "inherited", fallbacks: [] },
      },
      userTeamLaunchSelection: { llmModelIdentifier: "team-chosen", llmConfig: { thinking: "low" }, selectedAt: T3 },
    });
  });

  it("appends converted runs after the existing ones in addedAt order and keeps existing runs untouched", () => {
    const existing = { ...sourcelessCopy("/other", "existing-run", "host"), source: { kind: "agent", agentDefinitionId: "o", launchConfiguration: launch() } };
    const later = agentCollaborator({ address: "/b", runId: "b-run", definitionId: "b", viaRunId: "host", addedAt: T3 });
    const earlier = agentCollaborator({ address: "/a", runId: "a-run", definitionId: "a", viaRunId: "host", addedAt: T1 });
    const { tree } = converted(standalone({ collaborators: [later, earlier], taskExecutions: [existing] }));
    expect((tree["taskExecutions"] as Json[]).map((task) => task["agentRunId"])).toEqual(["existing-run", "a-run", "b-run"]);
  });

  it("stamps a source on sourceless copies at collaborator and collaborator-Team-member addresses, at any depth (AC-011)", () => {
    const agent = agentCollaborator({ address: "/code_reviewer", runId: "reviewer-run", definitionId: "reviewer", viaRunId: "host" });
    const underTeam = sourcelessCopy("/product_team/lead", "copy-under-team", "product-run-lead");
    const team = teamCollaborator({ address: "/product_team", teamRunId: "product-run", definitionId: "product", viaRunId: "host", taskExecutions: [underTeam] });
    const rootCopy = sourcelessCopy("/code_reviewer", "root-copy", "host");
    const memberCopy = sourcelessCopy("/product_team/designer", "member-copy", "host");
    const nested = { address: "/code_reviewer", teamRunId: "nested", members: [], startedAt: T3, taskExecutions: [sourcelessCopy("/code_reviewer", "deep-copy", "host")] };
    const unrelated = sourcelessCopy("/elsewhere", "unrelated-copy", "host");
    const { tree, stampedCopyCount } = converted(standalone({ collaborators: [agent, team], taskExecutions: [rootCopy, memberCopy, nested, unrelated] }));
    const runs = tree["taskExecutions"] as Json[];
    const byRun = (id: string): Json => JSON.parse(JSON.stringify(runs.find((task) => task["agentRunId"] === id) ?? {}));
    expect(byRun("root-copy")["source"]).toMatchObject({ kind: "agent", agentDefinitionId: "reviewer" });
    expect(byRun("member-copy")["source"]).toMatchObject({ kind: "agent", agentDefinitionId: "designer-definition", launchConfiguration: launch("model-b"), launchSource: { origin: "agent_default" } });
    expect(byRun("unrelated-copy")).not.toHaveProperty("source");
    const converted2 = runs.find((task) => task["teamRunId"] === "product-run") as Json;
    expect(((converted2["taskExecutions"] as Json[])[0] as Json)["source"]).toMatchObject({ kind: "agent", agentDefinitionId: "lead-definition", launchConfiguration: launch() });
    expect(stampedCopyCount).toBe(4); // root, member, under-Team and deep copies
    const deep = ((runs.find((task) => task["teamRunId"] === "nested") as Json)["taskExecutions"] as Json[])[0]!;
    expect(deep["source"]).toMatchObject({ kind: "agent", agentDefinitionId: "reviewer" });
    // A team-shaped copy at a collaborator Agent's address is not a copy of it: left as recorded.
    expect(runs.find((task) => task["teamRunId"] === "nested")).not.toHaveProperty("source");
  });

  it("converts inside the Team and Org containers and stamps copies under mounted Teams at any depth", () => {
    const agent = agentCollaborator({ address: "/code_reviewer", runId: "reviewer-run", definitionId: "reviewer", viaRunId: "lead" });
    const mounted = { address: "/mounted", teamRunId: "mounted-run", members: [{ address: "/mounted/inner", teamRunId: "inner-run", members: [], taskExecutions: [sourcelessCopy("/code_reviewer", "inner-copy", "lead")] }],
      taskExecutions: [sourcelessCopy("/code_reviewer", "mounted-copy", "lead")] };
    for (const key of ["rootTeam", "rootOrg"] as const) {
      const { tree } = converted({ [key]: { members: [mounted], taskExecutions: [], collaborators: [agent] } }, key);
      const container = tree[key] as Json;
      expect(container).not.toHaveProperty("collaborators");
      expect((container["taskExecutions"] as Json[]).map((task) => task["agentRunId"])).toEqual(["reviewer-run"]);
      const mountedOut = (container["members"] as Json[])[0]!;
      expect(((mountedOut["taskExecutions"] as Json[])[0] as Json)["source"]).toMatchObject({ agentDefinitionId: "reviewer" });
      const inner = (mountedOut["members"] as Json[])[0]!;
      expect(((inner["taskExecutions"] as Json[])[0] as Json)["source"]).toMatchObject({ agentDefinitionId: "reviewer" });
    }
  });

  it("is a pure function: the input document is not modified, and converting twice gives the same result", () => {
    const input = standalone({ collaborators: [agentCollaborator({ address: "/a", runId: "a-run", definitionId: "a", viaRunId: "host" })] });
    const before = JSON.stringify(input);
    const first = converted(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(JSON.stringify(converted(input).tree)).toBe(JSON.stringify(first.tree));
    // The converted document is already current.
    expect(convertCollaboratorsToDelegatedRuns(first.tree, null)).toEqual({ kind: "already_current" });
  });

  it("treats a missing or empty collaborators list as already current", () => {
    expect(convertCollaboratorsToDelegatedRuns(standalone({}), null)).toEqual({ kind: "already_current" });
    expect(convertCollaboratorsToDelegatedRuns(standalone({ collaborators: [] }), null)).toEqual({ kind: "already_current" });
  });

  it("rejects an entry that fails the frozen released schema, naming it", () => {
    const bad = { ...agentCollaborator({ address: "/a", runId: "a-run", definitionId: "a", viaRunId: "host" }), addedAt: "yesterday" };
    expect(() => convertCollaboratorsToDelegatedRuns(standalone({ collaborators: [bad] }), null)).toThrow(InvalidCollaboratorError);
    expect(() => convertCollaboratorsToDelegatedRuns(standalone({ collaborators: [bad] }), null)).toThrow(/collaborators\[0\]/);
    expect(() => convertCollaboratorsToDelegatedRuns(standalone({ collaborators: "nope" }), null)).toThrow(InvalidCollaboratorError);
    const missingKey: Json = agentCollaborator({ address: "/a", runId: "a-run", definitionId: "a", viaRunId: "host" });
    delete missingKey["launchConfiguration"];
    expect(() => convertCollaboratorsToDelegatedRuns(standalone({ collaborators: [missingKey] }), null)).toThrow(InvalidCollaboratorError);
  });
});
