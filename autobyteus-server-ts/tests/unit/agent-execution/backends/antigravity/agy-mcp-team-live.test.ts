import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../../../src/agent-execution/domain/agent-run-config.js";
import { RuntimeKind } from "../../../../../src/runtime-management/runtime-kind-enum.js";
import { AgyAgentRunBackendFactory } from "../../../../../src/agent-execution/backends/antigravity/backend/agy-agent-run-backend-factory.js";
import { createAgentToolsMcpHost } from "../../../../../src/agent-tools/mcp/agent-tools-mcp-host.js";
import { PublishedArtifactPublicationService } from "../../../../../src/services/published-artifacts/published-artifact-publication-service.js";
import { testMemberExecutionContext } from "../../../../fixtures/current-team-run-fixtures.js";
import { AgentRunEventType } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import { MemberCollaborationContext, MemberExecutionContext } from "../../../../../src/agent-collaboration/execution/domain/member-execution-context.js";
import { createAgentOrgRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from "../../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

const runScopedMcpMessage = async (kind: "team" | "org") => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "agy-team-mcp-live-"));
  const workspace = path.join(base, "workspace");
  await fs.mkdir(workspace);
  const deliveries: unknown[] = [];
  const deliver = async (message: unknown) => { deliveries.push(message); return { accepted: true, agentRunId: `${kind}-recipient-run` }; };
  const member = kind === "team"
    ? testMemberExecutionContext({ rootTeamRunId: "team-live-root", memberAddress: "/coordinator",
      agentRunId: "team-live-member", teamInstruction: "You coordinate this team.", deliverInterAgentMessage: deliver })
    : (() => {
      const root = createAgentOrgRootExecutionIdentity("org-live-root");
      return new MemberExecutionContext({ identity: createCollaborationMemberExecutionIdentity({ root,
        memberAddress: "/coordinator", agentRunId: "org-live-member" }),
      authoredEnclosingScopeInstruction: "You coordinate this organization.",
      collaboration: new MemberCollaborationContext({ deliverLogicalMessage: deliver }),
      tasks: { root, delegateTask: async () => { throw new Error("unused"); },
        submitTaskResult: async () => { throw new Error("unused"); },
        reviewTaskResult: async () => { throw new Error("unused"); } } });
    })();
  const host = createAgentToolsMcpHost({ loggingConfig: {
    pinoLogLevel: "silent", httpAccessLogMode: "off", includeNoisyHttpAccessRoutes: false, scopedLogLevelOverrides: [],
  } });
  const authority = host.sessionAuthorities.begin({ scopeIdentity: "agy-team-live" }).complete({
    executionCapabilities: { publishedArtifactPublisher: new PublishedArtifactPublicationService(), applicationAgentTools: null },
    assertExecutionCapabilitiesReady: () => undefined,
  });
  await host.listen();
  const runId = `${kind}-live-member`;
  const marker = `MCP-MARKER-${kind.toUpperCase()}-5127`;
  const config = new AgentRunConfig({ agentDefinitionId: "agy-member-definition", llmModelIdentifier: "gemini-3.8-flash-low",
    autoExecuteTools: true, workspaceId: "workspace", memoryDir: path.join(base, "memory"),
    skillAccessMode: SkillAccessMode.NONE, runtimeKind: RuntimeKind.ANTIGRAVITY_CLI,
    memberExecutionContext: member });
  const factory = new AgyAgentRunBackendFactory(
    { getAgentDefinitionById: async () => ({ name: "MCP team member", description: "Team messenger.",
      instructions: "When asked, call the AutoByteus send_message_to tool exactly once.", toolNames: ["send_message_to"], skillNames: [] }) } as never,
    { resolveConfiguredSkillBindingsForAgent: () => [] } as never,
    { resolveWorkingDirectory: async () => workspace } as never,
    authority.runSessions,
  );
  const backend = await factory.createBackend(config, runId);
  const events: { eventType: AgentRunEventType; payload: Record<string, unknown> }[] = [];
  backend.subscribeToSourceEventBatches((batch) => { events.push(...batch); });
  try {
    const dispatch = await backend.dispatchUserInput({ kind: "start_turn", message: new AgentInputUserMessage(
      `Use the AutoByteus agent tools MCP send_message_to tool to send '${marker}' to recipient_address /recipient. Report the tool's result.`) });
    expect(dispatch.forwarded).toBe(true);
    for (let attempt = 0; attempt < 180 && !events.some((event) => event.eventType === AgentRunEventType.TURN_COMPLETED); attempt++)
      await new Promise((resolve) => setTimeout(resolve, 500));
    const report = { base, deliveries, dispatch, events };
    await fs.writeFile(path.resolve(globalThis.process.cwd(), `../tickets/in-progress/antigravity-cli-runtime-redesign-20260924/implementation-local-mcp-${kind}-live.json`), JSON.stringify(report, null, 2));
    expect(events.some((event) => event.eventType === AgentRunEventType.TURN_COMPLETED)).toBe(true);
    expect(deliveries).toHaveLength(1);
    expect(JSON.stringify(deliveries[0])).toContain(marker);
  } finally {
    await backend.terminate();
    authority.close();
    await host.close();
  }
};

it.skipIf(process.env.AGY_LIVE !== "1")("calls real scoped AutoByteus MCP send_message_to from an AGY team member", () => runScopedMcpMessage("team"), 240_000);
it.skipIf(process.env.AGY_LIVE !== "1")("calls real scoped AutoByteus MCP send_message_to from an AGY org member", () => runScopedMcpMessage("org"), 240_000);
