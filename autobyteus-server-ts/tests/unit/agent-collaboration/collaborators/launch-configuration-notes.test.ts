import { describe, expect, it } from "vitest";
import {
  appendLaunchNotes,
  entryPlanLaunchNotes,
  launchNotesOf,
} from "../../../../src/agent-collaboration/collaborators/launch-configuration-notes.js";
import type { CollaboratorEntryPlan } from "../../../../src/agent-collaboration/collaborators/collaborator-entry-builder.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const claude = { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null, autoExecuteTools: false, workspaceRootPath: "/w" };
const codex = { ...claude, runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "sol-6.1" };
const codexMissing = {
  layer: "agent_default" as const, runtimeKind: "codex_app_server", llmModelIdentifier: "sol-6.1",
  reason: "runtime_unavailable" as const, detail: "Codex App Server command 'codex' is not available.",
};
const identity = { addedAt: "2026-10-12T00:00:00.000Z", addedViaAgentRunId: "pm" };

describe("launch configuration notes (REQ-003, REQ-008)", () => {
  it("names the agent, the skipped configuration, the reason and what it runs on instead", () => {
    expect(launchNotesOf([{ name: "implementation_engineer", subject: "agent", launch: claude, source: { origin: "inherited", fallbacks: [codexMissing] } }]))
      .toEqual(["implementation_engineer: its agent default Codex App Server / sol-6.1 could not be used (Codex App Server command 'codex' is not available); it runs on Claude Agent SDK / opus (inherited from the run)."]);
    expect(launchNotesOf([{ name: "Product Team", subject: "team", launch: claude, source: { origin: "inherited", fallbacks: [{
      layer: "team_default", runtimeKind: "codex_app_server", llmModelIdentifier: null, reason: "incomplete", detail: "It names no model.",
    }] } }])).toEqual(["Product Team: its team default Codex App Server / (no model) could not be used (It names no model); its members without their own default run on Claude Agent SDK / opus (inherited from the run)."]);
  });

  it("renders nothing when no configured layer was skipped", () => {
    expect(launchNotesOf([
      { name: "a", subject: "agent", launch: codex, source: { origin: "agent_default", fallbacks: [] } },
      { name: "b", subject: "agent", launch: claude, source: { origin: "inherited", fallbacks: [] } },
    ])).toEqual([]);
  });

  it("a Team plan's notes: the Team's own fallback, then each member whose agent default was skipped", () => {
    const plan: CollaboratorEntryPlan = {
      kind: "agent_team", name: "Software Engineering Team", address: "/se" as never, teamDefinitionId: "se",
      coordinatorAddress: "/se/lead" as never, handoffs: [], ...identity,
      defaultLaunchConfiguration: codex,
      defaultLaunchSource: { origin: "team_default", fallbacks: [] },
      members: [
        { address: "/se/lead" as never, agentDefinitionId: "lead", launchConfiguration: codex, followsTeam: true },
        { address: "/se/implementation_engineer" as never, agentDefinitionId: "ie", launchConfiguration: codex, followsTeam: true,
          launchSource: { origin: "team_default", fallbacks: [{ ...codexMissing, runtimeKind: "grok_build", llmModelIdentifier: "grok-4", detail: "no grok." }] } },
        { address: "/se/code_reviewer" as never, agentDefinitionId: "cr", launchConfiguration: codex, followsTeam: false, launchSource: { origin: "agent_default", fallbacks: [] } },
      ],
    };
    expect(entryPlanLaunchNotes(plan)).toEqual([
      "implementation_engineer: its agent default Grok Build / grok-4 could not be used (no grok); it runs on Codex App Server / sol-6.1 (its team default).",
    ]);
  });

  it("appends notes to an accepted send result only", () => {
    expect(appendLaunchNotes({ accepted: true, message: "Delivered to /se." }, ["a note"]))
      .toEqual({ accepted: true, message: "Delivered to /se.\nLaunch configuration notes:\n- a note" });
    const rejected = { accepted: false, code: "X", message: "no" };
    expect(appendLaunchNotes(rejected, ["a note"])).toBe(rejected);
    const plain = { accepted: true, message: "ok" };
    expect(appendLaunchNotes(plain, [])).toBe(plain);
    expect(appendLaunchNotes(plain, undefined)).toBe(plain);
  });
});
