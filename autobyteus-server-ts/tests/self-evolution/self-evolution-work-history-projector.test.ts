import { describe, expect, it } from "vitest";
import { AgentDefinition } from "../../src/agent-definition/domain/models.js";
import { RuntimeKind } from "../../src/runtime-management/runtime-kind-enum.js";
import { SelfEvolutionWorkHistoryProjector } from "../../src/self-evolution/services/self-evolution-work-history-projector.js";
import type { SelfEvolutionTargetContext } from "../../src/self-evolution/services/self-evolution-target-context-resolver.js";

describe("SelfEvolutionWorkHistoryProjector", () => {
  it("renders anonymized human-readable evidence without raw trace internals", () => {
    const context: SelfEvolutionTargetContext = {
      target: { kind: "agent_run", runId: "target-run-secret" },
      sourceRunIds: ["target-run-secret"],
      targetAgentDefinition: new AgentDefinition({
        id: "target-agent",
        name: "Target Agent",
        description: "Handles support tasks from /Users/alice/private-client",
        instructions: "Use skills.",
        skillNames: ["durable-skill"],
      }),
      agentDefinitionId: "target-agent",
      agentName: "Target Agent",
      workspaceRootPath: "/Users/alice/private-client",
      memoryDir: "/Users/alice/memory/agents/target-run-secret",
      runMetadataPath: "/Users/alice/memory/agents/target-run-secret/run_metadata.json",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "target-model",
      llmConfig: null,
      effectiveConfig: null,
      targetMetadata: {} as any,
    };

    const result = new SelfEvolutionWorkHistoryProjector().render({
      targetContext: context,
      skillTargets: [{
        skillName: "durable-skill",
        skillRootPath: "/tmp/skills/durable-skill",
        skillMdPath: "/tmp/skills/durable-skill/SKILL.md",
        isWritable: true,
      }],
      projection: {
        runId: "target-run-secret",
        summary: "User corrected a missing validation step in /Users/alice/private-client/output.json",
        lastActivityAt: null,
        conversation: [{
          kind: "message",
          role: "user",
          content: [
            "This is wrong; fix the validation for target-run-secret.",
            "Trace 6984a63e-dd84-4dc2-a9b0-3a6195f4ba4d should not be prompt-facing.",
            "token Bearer abc.def.ghi was in the log.",
            "OPENAI_API_KEY=sk-projSecretValue123456 and password=hunter2 were also shown.",
            "api_key: \"AIzaSyDfakefakefakefake\" and GitHub token ghp_1234567890abcdefghijkl appeared.",
          ].join(" "),
        }],
        activities: [{
          kind: "tool",
          invocationId: "tool_call_secret123456",
          toolName: "run_bash",
          type: "terminal_command",
          status: "error",
          contextText: "Command failed with Authorization: Token abcdefghijklmnop and secret=super-secret-value while reading /Users/alice/private-client/output.json",
        }],
      },
    });

    expect(result.anonymizedWorkHistory).toContain("[WORK_HISTORY_TO_LEARN_FROM]");
    expect(result.anonymizedWorkHistory).toContain("Tool run_bash error");
    expect(result.anonymizedWorkHistory).toContain("<redacted-path>");
    expect(result.anonymizedWorkHistory).toContain("Bearer <redacted-token>");
    expect(result.anonymizedWorkHistory).toContain("<redacted-secret>");
    expect(result.anonymizedWorkHistory).not.toContain("/Users/alice");
    expect(result.anonymizedWorkHistory).not.toContain("tool_call_secret123456");
    expect(result.anonymizedWorkHistory).not.toContain("target-run-secret");
    expect(result.anonymizedWorkHistory).not.toContain("6984a63e-dd84-4dc2-a9b0-3a6195f4ba4d");
    expect(result.anonymizedWorkHistory).not.toContain("sk-projSecretValue123456");
    expect(result.anonymizedWorkHistory).not.toContain("hunter2");
    expect(result.anonymizedWorkHistory).not.toContain("AIzaSyDfakefakefakefake");
    expect(result.anonymizedWorkHistory).not.toContain("ghp_1234567890abcdefghijkl");
    expect(result.anonymizedWorkHistory).not.toContain("abcdefghijklmnop");
    expect(result.anonymizedWorkHistory).not.toContain("super-secret-value");
    expect(result.feedbackSignals.join("\n")).toContain("wrong");
    expect(result.feedbackSignals.join("\n")).not.toContain("target-run-secret");
    expect(result.feedbackSignals.join("\n")).not.toContain("hunter2");
  });

  it("classifies explicit durable skill update directives as feedback signals", () => {
    const context: SelfEvolutionTargetContext = {
      target: { kind: "agent_run", runId: "target-run-round7" },
      sourceRunIds: ["target-run-round7"],
      targetAgentDefinition: new AgentDefinition({
        id: "target-agent",
        name: "Target Agent",
        description: "Handles calibration tasks",
        instructions: "Use skills.",
        skillNames: ["calibration-marker"],
      }),
      agentDefinitionId: "target-agent",
      agentName: "Target Agent",
      workspaceRootPath: "/tmp/round7-workspace",
      memoryDir: "/tmp/memory/agents/target-run-round7",
      runMetadataPath: "/tmp/memory/agents/target-run-round7/run_metadata.json",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "target-model",
      llmConfig: null,
      effectiveConfig: null,
      targetMetadata: {} as any,
    };

    const result = new SelfEvolutionWorkHistoryProjector().render({
      targetContext: context,
      skillTargets: [{
        skillName: "calibration-marker",
        skillRootPath: "/tmp/skills/calibration-marker",
        skillMdPath: "/tmp/skills/calibration-marker/SKILL.md",
        isWritable: true,
      }],
      projection: {
        runId: "target-run-round7",
        summary: "User asked for the durable calibration marker.",
        lastActivityAt: null,
        conversation: [{
          kind: "message",
          role: "user",
          content: "DURABLE_SKILL_UPDATE: The durable calibration marker is now CALIBRATION_MARKER_R7_V2. Future answers to the durable marker question must be exactly CALIBRATION_MARKER_R7_V2. Do not copy Authorization: Bearer abc.def.ghi.",
        }],
        activities: [],
      },
    });

    expect(result.feedbackSignals).toHaveLength(1);
    expect(result.feedbackSignals[0]).toContain("Explicit durable skill update requested");
    expect(result.feedbackSignals[0]).toContain("CALIBRATION_MARKER_R7_V2");
    expect(result.feedbackSignals[0]).toContain("Bearer <redacted-token>");
    expect(result.feedbackSignals[0]).not.toContain("abc.def.ghi");
    expect(result.anonymizedWorkHistory).toContain("Explicit durable skill update requested");
    expect(result.anonymizedWorkHistory).toContain("CALIBRATION_MARKER_R7_V2");
    expect(result.anonymizedWorkHistory).not.toContain("No explicit correction signal was detected");
  });

  it("does not promote ordinary exact-answer task instructions to durable update signals", () => {
    const context: SelfEvolutionTargetContext = {
      target: { kind: "agent_run", runId: "target-run-ordinary" },
      sourceRunIds: ["target-run-ordinary"],
      targetAgentDefinition: new AgentDefinition({
        id: "target-agent",
        name: "Target Agent",
        description: "Handles calibration tasks",
        instructions: "Use skills.",
        skillNames: ["calibration-marker"],
      }),
      agentDefinitionId: "target-agent",
      agentName: "Target Agent",
      workspaceRootPath: "/tmp/ordinary-workspace",
      memoryDir: "/tmp/memory/agents/target-run-ordinary",
      runMetadataPath: "/tmp/memory/agents/target-run-ordinary/run_metadata.json",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "target-model",
      llmConfig: null,
      effectiveConfig: null,
      targetMetadata: {} as any,
    };

    const result = new SelfEvolutionWorkHistoryProjector().render({
      targetContext: context,
      skillTargets: [{
        skillName: "calibration-marker",
        skillRootPath: "/tmp/skills/calibration-marker",
        skillMdPath: "/tmp/skills/calibration-marker/SKILL.md",
        isWritable: true,
      }],
      projection: {
        runId: "target-run-ordinary",
        summary: "User asked a one-off exact-answer question.",
        lastActivityAt: null,
        conversation: [{
          kind: "message",
          role: "user",
          content: "What is the durable calibration marker? Answer with only the marker.",
        }, {
          kind: "message",
          role: "assistant",
          content: "CALIBRATION_MARKER_R7_V1",
        }, {
          kind: "message",
          role: "user",
          content: "Please answer exactly YES or NO.",
        }],
        activities: [],
      },
    });

    expect(result.feedbackSignals).toHaveLength(0);
    expect(result.anonymizedWorkHistory).toContain("Answer with only the marker");
    expect(result.anonymizedWorkHistory).toContain("Please answer exactly YES or NO");
    expect(result.anonymizedWorkHistory).toContain("No explicit correction signal was detected");
    expect(result.anonymizedWorkHistory).not.toContain("Explicit durable skill update requested");
  });
});
