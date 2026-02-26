import type { AgentTeam } from './agent-team.js';

export abstract class BaseAgentTeam {
  name: string;
  protected _wrappedTeam: AgentTeam | null;

  constructor(name: string, wrappedTeamInstance: AgentTeam | null = null) {
    this.name = name;
    this._wrappedTeam = wrappedTeamInstance;

    if (this._wrappedTeam) {
      console.info(
        `BaseAgentTeam '${this.name}' initialized, wrapping an instance of '${this._wrappedTeam.constructor.name}'.`
      );
    } else {
      console.info(
        `BaseAgentTeam '${this.name}' initialized without a pre-wrapped instance. Subclass should handle team setup.`
      );
    }
  }

  get wrappedTeam(): AgentTeam | null {
    return this._wrappedTeam;
  }

  abstract start(): Promise<void> | void;
  abstract stop(timeout?: number): Promise<void> | void;
  abstract get isRunning(): boolean;

  toString(): string {
    let runningStatus = 'N/A (not implemented by subclass)';
    try {
      runningStatus = String(this.isRunning);
    } catch {
      runningStatus = 'N/A (not implemented by subclass)';
    }

    const wrappedName = this._wrappedTeam ? this._wrappedTeam.constructor.name : 'NoneInternal';
    return `<${this.constructor.name} name='${this.name}', wraps='${wrappedName}', isRunning=${runningStatus}>`;
  }
}
