import type { NodeRuntimesReading } from "../../../src/available-agent-runtimes/available-agent-runtimes-report.js";
import type { RoutingRequest } from "../../../src/model-routing/domain/model-routing-types.js";

/**
 * A synthesized node (autobyteus-32 tests): Codex with an unblocked and a blocked model, Claude with one model,
 * AutoByteus with one provider; Antigravity installed but signed out. No real runtime is read.
 */
export const nodeFacts = (overrides: Partial<{ signedOut: string[]; codexBlocked: boolean }> = {}): NodeRuntimesReading => ({
  report: {
    checkedAt: "2026-10-26T09:00:00.000Z",
    agentRuntimes: [
      {
        runtime: "codex_app_server", name: "Codex", limits: "not reported",
        models: [
          { id: "gpt-sol", name: "GPT Sol", ...(overrides.codexBlocked ? { blocked: { until: "2026-10-30T20:57:00.000Z", by: "weekly" } } : {}) },
          { id: "gpt-mini", name: "GPT Mini", blocked: { until: "2026-10-27T04:00:00.000Z", by: "5-hour" } },
        ],
      },
      { runtime: "claude_agent_sdk", name: "Claude", limits: "not reported", models: [{ id: "sonnet", name: "Sonnet" }] },
      { runtime: "autobyteus", name: "AutoByteus", providers: [{ provider: "DeepSeek", models: [{ id: "deepseek-chat", name: "DeepSeek Chat" }] }] },
    ],
  },
  signedOutRuntimes: new Set(overrides.signedOut ?? ["antigravity_cli"]),
});

/** A routing request for two agents of a Team, one of which must stay on Codex. */
export const routingRequest = (): RoutingRequest => ({
  work: { text: "Build the agent runtimes tool.", task: { taskId: "task-303", taskKey: "autobyteus-303", projectId: "project-1", title: "Agent runtimes tool" } },
  target: { kind: "agent_team", name: "Software Engineering Team", description: "Builds software." },
  agents: [
    { address: "/set/implementation_engineer", name: "implementation engineer", description: "Implements the design.", role: "Engineer",
      skipped: [], requiredRuntime: "codex_app_server" },
    { address: "/set/code_reviewer", name: "code reviewer", description: "Reviews the code.", role: null, skipped: [], requiredRuntime: null },
  ],
  covered: [{ address: "/set/solution_designer", runtimeKind: "claude_agent_sdk", llmModelIdentifier: "sonnet", source: "agent_default" }],
  delegatingLaunch: { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "sonnet" },
});

/** Valid choices for `routingRequest()`. */
export const validChoices = () => [
  { address: "/set/implementation_engineer", runtime: "codex_app_server", model: "gpt-sol", taskKind: "implementation", reason: "Codex is strongest at code here." },
  { address: "/set/code_reviewer", runtime: "claude_agent_sdk", model: "sonnet", taskKind: "Code Review", reason: "Sonnet reviews with a long context." },
];
