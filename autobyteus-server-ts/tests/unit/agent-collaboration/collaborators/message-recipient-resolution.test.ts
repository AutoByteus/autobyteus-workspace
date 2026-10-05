import { describe, expect, it, vi } from "vitest";
import {
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

/** Two parallel copies of `/team` (copy-1, copy-2) and a run-wide `/team` collaborator. */
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
    ...overrides,
  };
};

describe("MessageRecipientResolution (DS-002)", () => {
  const resolve = (sender: string, address: string) => resolveMessageRecipient({
    port: () => port(), senderAgentRunId: sender, address: a(address), catalog: { bringIn: vi.fn() }, notFoundMessage: () => "nf",
  });

  it("resolves inside the sender's own instance first, so parallel copies never cross (REQ-007)", async () => {
    await expect(resolve("copy-1-lead", "/team/writer"))
      .resolves.toMatchObject({ resolved: true, placement: { receiver: { agentRunId: "copy-1-writer" } } });
    await expect(resolve("copy-1-lead", "/team"))
      .resolves.toMatchObject({ resolved: true, placement: { kind: "agent_team", receiver: { agentRunId: "copy-1-lead" } } });
  });

  it("never falls through inside the instance prefix (AR-003)", async () => {
    // copy-2 has no writer: the run-wide `/team/writer` must not be reached.
    const catalog = { bringIn: vi.fn() };
    await expect(resolveMessageRecipient({
      port: () => port(), senderAgentRunId: "copy-2-lead", address: a("/team/writer"), catalog, notFoundMessage: () => "nf",
    })).rejects.toMatchObject({ code: "COLLABORATION_TARGET_NOT_FOUND" });
    expect(catalog.bringIn).not.toHaveBeenCalled();
  });

  it("resolves addresses outside every instance run-wide", async () => {
    await expect(resolve("copy-1-lead", "/pm"))
      .resolves.toMatchObject({ resolved: true, placement: { receiver: { agentRunId: "wide-pm" } } });
    await expect(resolve("pm", "/team/writer"))
      .resolves.toMatchObject({ resolved: true, placement: { receiver: { agentRunId: "wide-team-writer" } } });
  });

  it("brings in a catalog definition, then resolves the address to the new instance (REQ-004)", async () => {
    let added = false;
    const indexed = () => port({
      getMessagePlacement: (address) => added && address === "/product_team"
        ? messagePlacement("agent_team", address, { agentRunId: "product-lead", address: "/product_team/lead" })
        : null,
    });
    const bringIn = vi.fn(async () => { added = true; return { admitted: true as const, collaborators: [] }; });
    const result = await resolveMessageRecipient({
      port: indexed, senderAgentRunId: "pm", address: a("/product_team"), catalog: { bringIn }, notFoundMessage: () => "nf",
    });
    expect(bringIn).toHaveBeenCalledWith("/product_team");
    expect(result).toMatchObject({ resolved: true, placement: { receiver: { agentRunId: "product-lead" } } });
    // A concurrent first message that finds the address already in the run (bringIn → null) reaches it.
    await expect(resolveMessageRecipient({
      port: indexed, senderAgentRunId: "pm", address: a("/product_team"), catalog: { bringIn: async () => null }, notFoundMessage: () => "nf",
    })).resolves.toMatchObject({ resolved: true, placement: { receiver: { agentRunId: "product-lead" } } });
  });

  it("returns COLLABORATOR_ADD_FAILED with the reason when the add fails; unknown addresses are not found", async () => {
    const failed = await resolveMessageRecipient({
      port: () => port(), senderAgentRunId: "pm", address: a("/product_team"),
      catalog: {
        bringIn: async () => ({ admitted: false, code: "COLLABORATOR_ADD_FAILED", collaboratorName: "Product Team", message: "no model" }),
      },
      notFoundMessage: () => "nf",
    });
    expect(failed).toEqual({ resolved: false, code: "COLLABORATOR_ADD_FAILED", message: "Product Team could not be added: no model" });
    await expect(resolveMessageRecipient({
      port: () => port(), senderAgentRunId: "pm", address: a("/no_such_team"),
      catalog: { bringIn: async () => null }, notFoundMessage: (address) => `${address} nf`,
    })).rejects.toThrow("/no_such_team nf");
  });
});

describe("catalog delegation placement (DS-003)", () => {
  const launch = { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: false, workspaceRootPath: null };
  const snapshot: TaskTeamExecutionSource = {
    kind: "agent_team", teamDefinitionId: "product", coordinatorAddress: a("/product_team/lead"),
    members: [{ address: a("/product_team/lead"), agentDefinitionId: "lead" }, { address: a("/product_team/designer"), agentDefinitionId: "designer" }],
    handoffs: [], defaultLaunchConfiguration: launch,
  };
  const delegationPort = {
    teamInstancesOf: (sender: string) => sender === "copy-lead" ? [{ teamRunId: "copy", address: a("/product_team") }] : [],
    instanceCatalogSource: (teamRunId: string) => teamRunId === "copy" ? snapshot : null,
  };
  const notFound = () => { throw new CollaborationContractError("COLLABORATION_TARGET_NOT_FOUND", "not in run"); };

  it("in-run placements win; a catalog address gets a sourced placement; no source means not found", async () => {
    expect(await resolveDelegationPlacement({
      port: delegationPort, senderAgentRunId: "pm", address: a("/writer"),
      resolveInRun: () => ({ kind: "agent", address: a("/writer") }), catalogSource: vi.fn(),
    })).toEqual({ kind: "agent", address: "/writer" });
    expect(await resolveDelegationPlacement({
      port: delegationPort, senderAgentRunId: "pm", address: a("/product_team"), resolveInRun: notFound,
      catalogSource: async () => ({ name: "Product Team", source: snapshot }),
    })).toEqual({ kind: "agent_team", address: "/product_team", coordinatorAddress: "/product_team/lead", source: snapshot });
    await expect(resolveDelegationPlacement({
      port: delegationPort, senderAgentRunId: "pm", address: a("/nobody"), resolveInRun: notFound, catalogSource: async () => null,
    })).rejects.toThrow("not in run");
  });

  it("a teammate inside a catalog Team copy comes from the copy's snapshot (REQ-007)", async () => {
    expect(await resolveDelegationPlacement({
      port: delegationPort, senderAgentRunId: "copy-lead", address: a("/product_team/designer"), resolveInRun: notFound, catalogSource: vi.fn(),
    })).toEqual({ kind: "agent", address: "/product_team/designer", source: { kind: "agent", agentDefinitionId: "designer", launchConfiguration: launch } });
  });

  it("a catalog definition that cannot run is a not-found delegation with its reason", async () => {
    await expect(resolveDelegationPlacement({
      port: delegationPort, senderAgentRunId: "pm", address: a("/product_team"), resolveInRun: notFound,
      catalogSource: async () => { throw new CollaboratorAddError("Product Team", "no model"); },
    })).rejects.toMatchObject({ code: "COLLABORATION_TARGET_NOT_FOUND", message: "Product Team cannot be delegated to: no model" });
  });
});
