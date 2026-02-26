import type { Task } from '../../task-management/task.js';

export class ActivationPolicy {
  private teamId: string;
  private activatedAgents: Set<string> = new Set();

  constructor(teamId: string) {
    this.teamId = teamId;
    console.debug(`ActivationPolicy initialized for team '${this.teamId}'.`);
  }

  reset(): void {
    console.info(
      `Team '${this.teamId}': ActivationPolicy state has been reset. All agents are now considered inactive.`
    );
    this.activatedAgents.clear();
  }

  getActivatedAgents(): Set<string> {
    return new Set(this.activatedAgents);
  }

  determineActivations(runnableTasks: Task[]): string[] {
    if (!runnableTasks || runnableTasks.length === 0) {
      return [];
    }

    const agentsWithRunnableTasks = new Set(
      runnableTasks.map((task) => task.assignee_name).filter(Boolean)
    );

    const newAgentsToActivate = Array.from(agentsWithRunnableTasks).filter(
      (agent) => !this.activatedAgents.has(agent)
    );

    if (newAgentsToActivate.length) {
      for (const agent of newAgentsToActivate) {
        this.activatedAgents.add(agent);
      }
      console.info(
        `Team '${this.teamId}': Policy determined ${newAgentsToActivate.length} new agent(s) to activate: ` +
        `${newAgentsToActivate}. Total activated agents is now ${this.activatedAgents.size}.`
      );
    }

    return newAgentsToActivate;
  }
}
