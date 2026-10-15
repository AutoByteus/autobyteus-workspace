import { describe, expect, it, vi } from "vitest";
import {
  isInsideSenderTeamInstances,
  mentionViewerRelation,
  messagePlacement,
  resolveMessageRecipient,
  type MessageRecipientIndexPort,
  type SenderTeamInstance,
} from "../../../../src/agent-collaboration/collaborators/message-recipient-resolution.js";
import { resolveDelegationPlacement } from "../../../../src/agent-collaboration/collaborators/catalog-delegation.js";
import { CollaboratorAddError } from "../../../../src/agent-collaboration/collaborators/collaborator-errors.js";
import { CollaborationContractError } from "../../../../src/agent-collaboration/domain/collaboration-contract-error.js";
import type { AgentTeamAddress } from "../../../../src/agent-collaboration/domain/agent-team-address.js";
import type { TaskTeamExecutionSource } from "../../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const a = (value: string) => value as AgentTeamAddress;

/** Two parallel copies of `/team` (copy-1, copy-2) and run-wide standing instances `/pm` and `/team/writer`. */
const port = (overrides: Partial<MessageRecipientIndexPort> = {}): MessageRecipientIndexPort => {
  const instances: Record<string, SenderTeamInstance[]> = {
    "copy-1-lead": [{ teamRunId: "copy-1", address: a("/team") }],
    "copy-2-lead": [{ teamRunId: "copy-2", address: a("/team") }],
  };
  const members: Record<string, Record<string, string>> = {
    "copy-1": { "/team": "copy-1-lead", "/team/lead": "copy-1-lead", "/team/writer": "copy-1-writer" },
    "copy-2": { "/team": "copy-2-lead", "/team/lead": "copy-2-lead" },
  };
  return {
    teamInstancesOf: (sender) => instances[sender] ?? [],
    memberOfInstance: (teamRunId, address) => {
      const runId = members[teamRunId]?.[address];
      return runId ? messagePlacement(address === "/team" ? "agent_team" : "agent", address, { agentRunId: runId, address }) : null;
    },
    getMessagePlacement: (address) => ["/team/writer", "/pm"].includes(address)
      ? messagePlacement("agent", address, { agentRunId: `wide${address.replaceAll("/", "-")}`, address })
      : null,
    isOwnTeamAddress: () => false,
    ...overrides,
  };
};

describe("MessageRecipientResolution (DS-002, CM-4)", () => {
  const resolve = (sender: string, address: string) => resolveMessageRecipient({
    port: () => port(), senderAgentRunId: sender, address: a(address),
  });

  it("resolves inside the sender's own instance first, so parallel copies never cross (REQ-007)", () => {
    expect(resolve("copy-1-lead", "/team/writer")).toMatchObject({ receiver: { agentRunId: "copy-1-writer" } });
    expect(resolve("copy-1-lead", "/team")).toMatchObject({ kind: "agent_team", receiver: { agentRunId: "copy-1-lead" } });
  });

  it("never falls through inside the instance prefix (AR-003)", () => {
    // copy-2 has no writer: the run-wide `/team/writer` must not be reached.
    expect(() => resolve("copy-2-lead", "/team/writer")).toThrow(expect.objectContaining({ code: "COLLABORATION_TARGET_NOT_FOUND" }));
  });

  it("resolves addresses outside every instance run-wide", () => {
    expect(resolve("copy-1-lead", "/pm")).toMatchObject({ receiver: { agentRunId: "wide-pm" } });
    expect(resolve("pm", "/team/writer")).toMatchObject({ receiver: { agentRunId: "wide-team-writer" } });
  });

  it("an address that is not a standing instance is not found with delegate_task guidance; nothing is created (AC-005)", () => {
    const attempt = () => resolve("pm", "/product_team");
    expect(attempt).toThrow(CollaborationContractError);
    expect(attempt).toThrow(
      "No agent or agent team you can talk with has the address /product_team. To have a task done by a new agent, use delegate_task; then talk with it by its ID.",
    );
    expect(attempt).toThrow(expect.objectContaining({ code: "COLLABORATION_TARGET_NOT_FOUND" }));
  });
});

describe("own-Team membership test (CM-1, DEC-008)", () => {
  const instances: SenderTeamInstance[] = [{ teamRunId: "t", address: a("/team") }];
  it("is the sender's own address, the instance's own address, and every address inside it at any depth", () => {
    expect(isInsideSenderTeamInstances(instances, "/team/lead", "/team/lead")).toBe(true);
    expect(isInsideSenderTeamInstances(instances, "/team/lead", "/team")).toBe(true);
    expect(isInsideSenderTeamInstances(instances, "/team/lead", "/team/writer")).toBe(true);
    expect(isInsideSenderTeamInstances(instances, "/team/lead", "/team/sub/deep/x")).toBe(true);
  });
  it("is not a sibling unit or a similarly named prefix", () => {
    expect(isInsideSenderTeamInstances(instances, "/team/lead", "/team_b")).toBe(false);
    expect(isInsideSenderTeamInstances(instances, "/team/lead", "/other/x")).toBe(false);
    expect(isInsideSenderTeamInstances([], "/pm", "/team")).toBe(false);
    expect(isInsideSenderTeamInstances([], "/pm", "/pm")).toBe(true);
  });
});

describe("mention viewer relation (REQ-008)", () => {
  const placements = new Map<string, unknown>([
    ["/pm", { kind: "agent", receiver: { agentRunId: "run-pm" } }],
    ["/pm/helper", { kind: "agent", receiver: { agentRunId: "run-helper" } }],
  ]);
  const index = {
    getMessagePlacement: (address: string) => (placements.get(address) ?? null) as never,
    isOwnTeamAddress: (_sender: string, address: string) => address === "/pm" || address === "/pm/helper" || address === "/team",
  };
  it("is self by the viewer's own placement identity, own_team for its own team, and other otherwise", () => {
    const relation = mentionViewerRelation(index, "run-pm");
    expect(relation(a("/pm"))).toBe("self");
    expect(relation(a("/pm/helper"))).toBe("own_team");
    expect(relation(a("/team"))).toBe("own_team");
    expect(relation(a("/catalog_unit"))).toBe("other");
  });
  it("does not treat a task agent running at a configured address as that agent (identity, not address)", () => {
    expect(mentionViewerRelation(index, "run-task-agent")(a("/pm"))).toBe("own_team");
  });
});

describe("catalog delegation placement (DS-001)", () => {
  const launch = { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: false, workspaceRootPath: null };
  const skipped = { origin: "inherited" as const, fallbacks: [{
    layer: "agent_default" as const, runtimeKind: "codex_app_server", llmModelIdentifier: "sol-6.1", reason: "runtime_unavailable" as const, detail: "no codex",
  }] };
  const snapshot: TaskTeamExecutionSource = {
    kind: "agent_team", teamDefinitionId: "product", coordinatorAddress: a("/product_team/lead"),
    members: [{ address: a("/product_team/lead"), agentDefinitionId: "lead" }, { address: a("/product_team/designer"), agentDefinitionId: "designer", launchSource: skipped }],
    handoffs: [], defaultLaunchConfiguration: launch,
  };
  const delegationPort = { isOwnTeamAddress: (sender: string, address: string) => sender === "copy-lead" && address.startsWith("/product_team") };
  const notFound = () => { throw new CollaborationContractError("COLLABORATION_TARGET_NOT_FOUND", "not in run"); };

  it("in-run placements win; a catalog address gets a sourced placement; no source means not found", async () => {
    expect(await resolveDelegationPlacement({
      port: delegationPort, senderAgentRunId: "pm", address: a("/writer"),
      resolveInRun: () => ({ kind: "agent", address: a("/writer") }), catalogSource: vi.fn(),
    })).toEqual({ kind: "agent", address: "/writer" });
    expect(await resolveDelegationPlacement({
      port: delegationPort, senderAgentRunId: "pm", address: a("/product_team"), resolveInRun: notFound,
      catalogSource: async () => ({ name: "Product Team", source: snapshot, launchNotes: [] }),
    })).toEqual({ kind: "agent_team", address: "/product_team", coordinatorAddress: "/product_team/lead", source: snapshot });
    await expect(resolveDelegationPlacement({
      port: delegationPort, senderAgentRunId: "pm", address: a("/nobody"), resolveInRun: notFound, catalogSource: async () => null,
    })).rejects.toThrow("not in run");
  });

  it("refuses the sender's own Team before any placement or catalog lookup (CM-1, AC-001..003)", async () => {
    const resolveInRun = vi.fn(notFound);
    const catalogSource = vi.fn(async () => null);
    const attempt = resolveDelegationPlacement({
      port: delegationPort, senderAgentRunId: "copy-lead", address: a("/product_team/designer"), resolveInRun, catalogSource,
    });
    await expect(attempt).rejects.toMatchObject({
      code: "COLLABORATION_SELF_TARGET_REJECTED",
      message: "/product_team/designer is in your own team; you can't delegate to it. Talk with it using send_message_to.",
    });
    expect(resolveInRun).not.toHaveBeenCalled();
    expect(catalogSource).not.toHaveBeenCalled();
  });

  it("a catalog definition that cannot run is a not-found delegation with its reason", async () => {
    await expect(resolveDelegationPlacement({
      port: delegationPort, senderAgentRunId: "pm", address: a("/product_team"), resolveInRun: notFound,
      catalogSource: async () => { throw new CollaboratorAddError("Product Team", "no model"); },
    })).rejects.toMatchObject({ code: "COLLABORATION_TARGET_NOT_FOUND", message: "Product Team cannot be delegated to: no model" });
  });

  it("a catalog copy's placement carries its admission's launch notes; empty notes add no key (REQ-008, AR-002)", async () => {
    expect(await resolveDelegationPlacement({
      port: delegationPort, senderAgentRunId: "pm", address: a("/product_team"), resolveInRun: notFound,
      catalogSource: async () => ({ name: "Product Team", source: snapshot, launchNotes: ["designer: fell back"] }),
    })).toEqual({ kind: "agent_team", address: "/product_team", coordinatorAddress: "/product_team/lead", source: snapshot, launchNotes: ["designer: fell back"] });
    const quiet = await resolveDelegationPlacement({
      port: delegationPort, senderAgentRunId: "pm", address: a("/product_team"), resolveInRun: notFound,
      catalogSource: async () => ({ name: "Product Team", source: snapshot, launchNotes: [] }),
    });
    expect("launchNotes" in quiet).toBe(false);
  });
});
