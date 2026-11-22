import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { AgentOrgContainerFile, AgentOrgUnit } from "../domain/agent-org-container-file.js";
import type { AgentOrgUnitRuns } from "./agent-org-unit-runs.js";

/**
 * A live Org container (org-teams-follow-definition): the Org run after its units became runs of their own. It hosts no
 * agent execution; it keeps its file (units, former units, Org rules) and drives its units' lifecycle through their own
 * run services. A unit is restored when it is first needed (a message, a command, the view), not when the Org reopens.
 */
export class AgentOrgContainer {
  private live = true;

  constructor(private file: AgentOrgContainerFile, private readonly units: AgentOrgUnitRuns) {}

  get orgRunId(): string { return this.file.rootOrg.orgRunId; }
  getFile(): AgentOrgContainerFile { return this.file; }
  /** The container's file after a committed write (it followed its definition, or a leaving unit was released). */
  replaceFile(file: AgentOrgContainerFile): void {
    if (file.rootOrg.orgRunId !== this.orgRunId) throw new Error(`AgentOrg '${this.orgRunId}' cannot take the file of '${file.rootOrg.orgRunId}'.`);
    this.file = file;
  }
  isLive(): boolean { return this.live; }
  listUnits(): readonly AgentOrgUnit[] { return this.file.rootOrg.units; }
  /** The unit at an Org address: an agent unit at its address, a Team unit at its address or any address inside it. */
  unitAt(address: AgentTeamAddress | string): AgentOrgUnit | null {
    return this.file.rootOrg.units.find((unit) => unit.address === address
      || (unit.kind === "agent_team" && address.startsWith(`${unit.address}/`))) ?? null;
  }
  unitOfRun(runId: string): AgentOrgUnit | null {
    return this.file.rootOrg.units.find((unit) => unit.runId === runId) ?? null;
  }

  /**
   * DS-003: Stop stops every unit's run, and every unit still leaving the Org (each through its own service, each attempted
   * even when another fails); the container is no longer live once all stopped. `false` when a unit did not stop (the
   * container stays live, a retry re-runs the stops).
   */
  async stop(): Promise<boolean> {
    if (!this.live) return true;
    const units = [...this.file.rootOrg.units, ...this.file.rootOrg.formerUnits.filter((unit) => unit.leaving)];
    const results = await Promise.allSettled(units.map((unit) => this.units.stopUnit(unit)));
    if (results.some((result) => result.status === "rejected" || !result.value)) return false;
    this.live = false;
    return true;
  }
}
