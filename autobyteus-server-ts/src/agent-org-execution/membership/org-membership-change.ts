import { isDeepStrictEqual } from "node:util";
import { isAgentTeamAddressAncestor, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import { validateAgentOrgContainerPayload } from "../../run-history/store/agent-org-container-file-schema.js";
import type { AgentOrgContainerFile, AgentOrgUnit } from "../domain/agent-org-container-file.js";
import type { AgentOrgContainerPlan, PlannedOrgUnit } from "../container/agent-org-container-plan.js";

/**
 * An Org container's current definition as the container uses it (REQ-009, design DS-006): the units the Org definition
 * mounts, in definition order, each with the launch a new unit is created with, and the Org-level rules compiled from it.
 */
export type OrgDefinitionView = Readonly<{ orgDefinitionId: string; plan: AgentOrgContainerPlan }>;

/** What following the definition changes in one container, before any new unit run exists. */
export type OrgMembershipPlan = Readonly<{
  /** Units the definition has that the container never had: each becomes a run of its own (Offline). */
  toCreate: readonly PlannedOrgUnit[];
  /** Former units back (same address, kind and definition): their runs are kept. */
  rejoined: readonly AgentOrgUnit[];
  /** Current units the definition no longer has (or has with another definition): they leave. */
  left: readonly AgentOrgUnit[];
  /** The Org rules before the change (who was told what). */
  handoffsBefore: readonly CollaborationHandoff[];
  /** The next container file once the new units exist (`created`: run ID by Org address; a unit not created is not added). */
  next(created: ReadonlyMap<string, string>, leaving: ReadonlySet<string>): AgentOrgContainerFile;
}>;

const definitionIdOf = (unit: PlannedOrgUnit): string => unit.kind === "agent_team" ? unit.teamDefinitionId : unit.agentDefinitionId;
const sameUnit = (unit: AgentOrgUnit, planned: PlannedOrgUnit): boolean =>
  unit.address === planned.address && unit.kind === planned.kind && unit.definitionId === definitionIdOf(planned);
const withoutLeaving = ({ leaving: _leaving, ...unit }: AgentOrgUnit): AgentOrgUnit => Object.freeze(unit);

/**
 * DS-006, pure: the container against its definition view. A unit is the same unit when its address, kind and definition
 * match (a Team swapped for another Team at the same address is one leaving and one new unit); a former unit that matches
 * comes back with its run. The Org rules are the view's, kept only where their sender lies in a current unit (a rule from a
 * unit that could not be created waits for it). `null` when nothing changes.
 */
export const planOrgMembershipChange = (file: AgentOrgContainerFile, view: OrgDefinitionView): OrgMembershipPlan | null => {
  const root = file.rootOrg;
  const toCreate: PlannedOrgUnit[] = [];
  const rejoined: AgentOrgUnit[] = [];
  for (const planned of view.plan.units) {
    if (root.units.some((unit) => sameUnit(unit, planned))) continue;
    const former = root.formerUnits.find((unit) => sameUnit(unit, planned));
    if (former) rejoined.push(former);
    else toCreate.push(planned);
  }
  const left = root.units.filter((unit) => !view.plan.units.some((planned) => sameUnit(unit, planned)));
  const rulesChanged = !isDeepStrictEqual(normalized(file.handoffs), normalized(view.plan.orgRules));
  if (!toCreate.length && !rejoined.length && !left.length && !rulesChanged) return null;
  return Object.freeze({
    toCreate: Object.freeze(toCreate), rejoined: Object.freeze(rejoined), left: Object.freeze(left), handoffsBefore: file.handoffs,
    next: (created: ReadonlyMap<string, string>, leaving: ReadonlySet<string>) => {
      const units: AgentOrgUnit[] = [];
      for (const planned of view.plan.units) {
        const current = root.units.find((unit) => sameUnit(unit, planned)) ?? rejoined.find((unit) => sameUnit(unit, planned));
        if (current) { units.push(withoutLeaving(current)); continue; }
        const runId = created.get(planned.address);
        if (runId) units.push(Object.freeze({ address: planned.address, kind: planned.kind, runId, definitionId: definitionIdOf(planned) }));
      }
      const back = new Set(rejoined.map((unit) => unit.runId));
      const formerUnits = [
        ...root.formerUnits.filter((unit) => !back.has(unit.runId)),
        ...left.map((unit) => Object.freeze({ ...withoutLeaving(unit), ...(leaving.has(unit.runId) ? { leaving: true as const } : {}) })),
      ];
      const inUnit = (address: string) => units.some((unit) => unit.address === address
        || (unit.kind === "agent_team" && isAgentTeamAddressAncestor(unit.address, address as AgentTeamAddress)));
      return validateAgentOrgContainerPayload({ ...file, handoffs: view.plan.orgRules.filter((rule) => inUnit(rule.from)),
        rootOrg: { ...root, units, formerUnits } }, root.orgRunId);
    },
  });
};

/** The container with every `leaving` marker cleared for units no longer running (a release write); `null` when none is stale. */
export const releaseStoppedUnits = (file: AgentOrgContainerFile, isRunning: (unit: AgentOrgUnit) => boolean): AgentOrgContainerFile | null => {
  const stale = file.rootOrg.formerUnits.filter((unit) => unit.leaving && !isRunning(unit));
  if (!stale.length) return null;
  return validateAgentOrgContainerPayload({ ...file, rootOrg: { ...file.rootOrg,
    formerUnits: file.rootOrg.formerUnits.map((unit) => stale.includes(unit) ? withoutLeaving(unit) : unit) } }, file.rootOrg.orgRunId);
};

const normalized = (rules: readonly CollaborationHandoff[]) =>
  rules.map((rule) => ({ from: rule.from, to: rule.to, rules: [...rule.rules] }));
