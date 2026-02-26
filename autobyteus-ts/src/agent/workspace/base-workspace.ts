import { randomUUID } from 'crypto';
import { WorkspaceConfig } from './workspace-config.js';
import type { AgentContextLike } from '../context/agent-context-like.js';

export abstract class BaseAgentWorkspace {
  protected configValue: WorkspaceConfig;
  protected contextValue: AgentContextLike | null = null;
  readonly workspaceId: string;

  constructor(config?: WorkspaceConfig) {
    this.configValue = config ?? new WorkspaceConfig();
    const configuredId = this.configValue.get('workspaceId');
    if (typeof configuredId === 'string' && configuredId.trim()) {
      this.workspaceId = configuredId.trim();
    } else {
      this.workspaceId = randomUUID();
    }
    console.debug(
      `${this.constructor.name} instance initialized with ID ${this.workspaceId}. Context pending injection.`
    );
  }

  setContext(context: AgentContextLike): void {
    if (this.contextValue) {
      console.warn(
        `Workspace for agent '${this.agentId}' is having its context overwritten. This is unusual.`
      );
    }
    this.contextValue = context;
    console.info(`AgentContext for agent '${this.agentId}' injected into workspace.`);
  }

  get agentId(): string | null {
    return this.contextValue ? this.contextValue.agentId : null;
  }

  get config(): WorkspaceConfig {
    return this.configValue;
  }

  abstract getBasePath(): string;

  getName(): string {
    return this.workspaceId;
  }

  toString(): string {
    return `<${this.constructor.name} workspaceId='${this.workspaceId}' agentId='${this.agentId ?? 'N/A'}'>`;
  }
}
