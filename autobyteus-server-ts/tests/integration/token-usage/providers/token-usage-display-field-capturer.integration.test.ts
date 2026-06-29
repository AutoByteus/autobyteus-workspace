import { describe, expect, it, vi } from "vitest";
import { createTokenUsageUpdatedPayload } from "../../../../src/agent-execution/domain/agent-run-token-usage.js";
import { TokenUsageDisplayFieldCapturer } from "../../../../src/token-usage/providers/token-usage-display-field-capturer.js";
import type { TokenUsageUpdatedPayload } from "../../../../src/agent-execution/domain/agent-run-token-usage.js";

const buildEvent = (overrides: Record<string, unknown> = {}): TokenUsageUpdatedPayload => createTokenUsageUpdatedPayload({
  runId: String(overrides.run_id ?? "run-1"),
  payload: {
    idempotency_key: `capture:${overrides.run_id ?? "run-1"}:${overrides.root_team_run_id ?? "standalone"}`,
    observed_at: "2026-06-29T12:00:00.000Z",
    runtime_kind: "codex_app_server",
    ingestion_kind: "codex_thread_token_usage",
    usage_scope: "per_call",
    reported_input_tokens: 1,
    reported_output_tokens: 1,
    reported_total_tokens: 2,
    accounting_input_tokens: 1,
    accounting_output_tokens: 1,
    accounting_total_tokens: 2,
    pricing_status: "trusted",
    api_cost_status: "estimated",
    ...overrides,
  },
});

describe("TokenUsageDisplayFieldCapturer", () => {
  it("captures standalone agent display fields from run history sources", async () => {
    const capturer = new TokenUsageDisplayFieldCapturer({
      agentCatalog: {
        getCatalogRow: vi.fn(async () => ({
          runId: "agent-run",
          agentDefinitionId: "agent-def",
          agentName: "Historical Agent",
          workspaceRootPath: "/workspace/ignored",
          summary: "Summarize captured costs",
          createdAt: "2026-06-29T10:00:00.000Z",
          archivedAt: null,
          terminatedAt: null,
        })),
      } as never,
      agentMetadata: { readMetadata: vi.fn(async () => null) } as never,
      teamCatalog: { getCatalogRow: vi.fn(async () => null) } as never,
      teamMetadata: { readMetadata: vi.fn(async () => null) } as never,
    });

    const captured = await capturer.capture(buildEvent({ run_id: "agent-run" }));

    expect(captured).toMatchObject({
      team_name: null,
      agent_name: "Historical Agent",
      run_summary: "Summarize captured costs",
      run_created_at: "2026-06-29T10:00:00.000Z",
      member_name: null,
    });
  });

  it("captures team and member names from team history metadata without producing roster rows", async () => {
    const capturer = new TokenUsageDisplayFieldCapturer({
      agentCatalog: { getCatalogRow: vi.fn(async () => null) } as never,
      agentMetadata: { readMetadata: vi.fn(async () => null) } as never,
      teamCatalog: {
        getCatalogRow: vi.fn(async () => ({
          teamRunId: "team-run",
          teamDefinitionId: "team-def",
          teamDefinitionName: "Historical Team",
          workspaceRootPath: "/workspace/ignored",
          summary: "Team summary",
          createdAt: "2026-06-29T09:00:00.000Z",
          archivedAt: null,
          terminatedAt: null,
        })),
      } as never,
      teamMetadata: {
        readMetadata: vi.fn(async () => ({
          teamRunId: "team-run",
          teamDefinitionId: "team-def",
          teamDefinitionName: "Metadata Team",
          coordinatorMemberRouteKey: "designer",
          createdAt: "2026-06-29T08:00:00.000Z",
          memberTree: [{
            memberKind: "agent",
            memberRouteKey: "designer",
            memberPath: ["designer"],
            memberName: "Solution Designer",
            memberRunId: "member-run",
            runtimeKind: "codex_app_server",
            platformAgentRunId: null,
            agentDefinitionId: "solution-designer",
            llmModelIdentifier: "gpt-test",
            autoExecuteTools: false,
            skillAccessMode: "all" as never,
            llmConfig: null,
            workspaceRootPath: "/workspace/ignored",
          }],
        })),
      } as never,
    });

    const captured = await capturer.capture(buildEvent({
      run_id: "member-run",
      root_team_run_id: "team-run",
      member_agent_run_id: "member-run",
      member_route_key: "designer",
    }));

    expect(captured).toMatchObject({
      team_name: "Historical Team",
      agent_name: null,
      run_summary: "Team summary",
      run_created_at: "2026-06-29T09:00:00.000Z",
      member_name: "Solution Designer",
    });
  });

  it("preserves imported display fields over currently available metadata", async () => {
    const capturer = new TokenUsageDisplayFieldCapturer({
      agentCatalog: { getCatalogRow: vi.fn(async () => ({ agentName: "Renamed Agent", summary: "New", createdAt: "2026-06-30T00:00:00.000Z" })) } as never,
      agentMetadata: { readMetadata: vi.fn(async () => null) } as never,
      teamCatalog: { getCatalogRow: vi.fn(async () => null) } as never,
      teamMetadata: { readMetadata: vi.fn(async () => null) } as never,
    });

    const captured = await capturer.capture(buildEvent({
      run_id: "agent-run",
      agent_name: "Imported Agent",
      run_summary: "Imported summary",
      run_created_at: "2026-06-28T00:00:00.000Z",
    }));

    expect(captured.agent_name).toBe("Imported Agent");
    expect(captured.run_summary).toBe("Imported summary");
    expect(captured.run_created_at).toBe("2026-06-28T00:00:00.000Z");
  });
});
