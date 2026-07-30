import type {
  AgentToolMcpSessionManager,
} from "../../agent-tools/mcp/agent-tool-mcp-session-service.js";
import { ClaudeAgentRunBackendFactory } from "../backends/claude/backend/claude-agent-run-backend-factory.js";
import { ClaudeSessionManager } from "../backends/claude/session/claude-session-manager.js";
import { CodexAgentRunBackendFactory } from "../backends/codex/backend/codex-agent-run-backend-factory.js";
import { CodexThreadBootstrapper } from "../backends/codex/backend/codex-thread-bootstrapper.js";
import { AgentRunManager } from "../services/agent-run-manager.js";
import {
  AgentTeamDefinitionService,
} from "../../agent-team-definition/services/agent-team-definition-service.js";
import {
  MixedTeamRunBackendFactory,
} from "../../agent-team-execution/backends/mixed/mixed-team-run-backend-factory.js";
import {
  MixedTeamManager,
} from "../../agent-team-execution/backends/mixed/mixed-team-manager.js";
import {
  AgentTeamRunManager,
} from "../../agent-team-execution/services/agent-team-run-manager.js";
import {
  MemberTeamContextBuilder,
} from "../../agent-team-execution/services/member-team-context-builder.js";

export class GeneralProcessRunSupervisor {
  private readonly agentRunManager: AgentRunManager;
  private readonly agentTeamRunManager: AgentTeamRunManager;
  private closePromise: Promise<void> | null = null;

  constructor(
    agentToolsSessionManager: AgentToolMcpSessionManager,
  ) {
    const codexThreadBootstrapper = new CodexThreadBootstrapper(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      agentToolsSessionManager,
    );
    const claudeSessionManager = new ClaudeSessionManager(
      undefined,
      undefined,
      agentToolsSessionManager,
    );
    this.agentRunManager = AgentRunManager.initializeProcessInstance({
      codexBackendFactory: new CodexAgentRunBackendFactory(
        undefined,
        codexThreadBootstrapper,
      ),
      claudeBackendFactory: new ClaudeAgentRunBackendFactory(
        claudeSessionManager,
      ),
      agentToolMcpSessionManager: agentToolsSessionManager,
    });
    const memberTeamContextBuilder =
      new MemberTeamContextBuilder(
        AgentTeamDefinitionService.getInstance(),
      );
    try {
      this.agentTeamRunManager =
        AgentTeamRunManager.initializeProcessInstance({
          mixedTeamRunBackendFactory:
            new MixedTeamRunBackendFactory({
              memberTeamContextBuilder,
              createTeamManager:
                (context, subTeamRunFactory) =>
                  new MixedTeamManager(context, {
                    subTeamRunFactory,
                    agentRunManager: this.agentRunManager,
                    agentToolMcpSessionManager:
                      agentToolsSessionManager,
                    memberTeamContextBuilder,
                  }),
            }),
        });
    } catch (error) {
      AgentRunManager.releaseProcessInstance(
        this.agentRunManager,
      );
      throw error;
    }
  }

  close(): Promise<void> {
    this.closePromise ??= this.closeInternal();
    return this.closePromise;
  }

  private async closeInternal(): Promise<void> {
    try {
      await this.agentTeamRunManager.stopAllTeamRuns();
    } finally {
      try {
        await this.agentRunManager.stopAllAgentRuns();
      } finally {
        AgentTeamRunManager.releaseProcessInstance(
          this.agentTeamRunManager,
        );
        AgentRunManager.releaseProcessInstance(
          this.agentRunManager,
        );
      }
    }
  }
}
