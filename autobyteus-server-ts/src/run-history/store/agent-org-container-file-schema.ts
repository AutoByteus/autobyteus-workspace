import { getParentAgentTeamAddress, isAgentTeamAddressAncestor, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { normalizeCollaborationHandoffs } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { AgentOrgContainerFile, AgentOrgContainerRoot, AgentOrgUnit } from "../../agent-org-execution/domain/agent-org-container-file.js";
import {
  canonicalNonRootAddress,
  deepFreeze,
  isoTimestamp,
  objectRecord,
  parseApplicationBinding,
  parseLaunchConfiguration,
  requiredArray,
  requiredString,
  requireKeys,
} from "./run-execution-tree-shared-record-schemas.js";

const parseUnit = (value: unknown, label: string): AgentOrgUnit => {
  const unit = objectRecord(value, label);
  requireKeys(unit, ["address", "kind", "runId", "definitionId"], label);
  if (unit.kind !== "agent" && unit.kind !== "agent_team") throw new Error(`${label}.kind must be 'agent' or 'agent_team'.`);
  const address = canonicalNonRootAddress(unit.address, `${label}.address`);
  if (getParentAgentTeamAddress(address) !== "/") throw new Error(`${label}.address '${address}' is not a direct Org address.`);
  return { address, kind: unit.kind, runId: requiredString(unit.runId, `${label}.runId`), definitionId: requiredString(unit.definitionId, `${label}.definitionId`) };
};

const parseRoot = (value: unknown): AgentOrgContainerRoot => {
  const root = objectRecord(value, "rootOrg");
  requireKeys(root, ["address", "orgDefinitionId", "orgDefinitionName", "orgRunId", "defaultLaunchConfiguration", "units", "formerUnits"], "rootOrg");
  if (root.address !== "/") throw new Error("rootOrg.address must be '/'.");
  return {
    address: "/",
    orgDefinitionId: requiredString(root.orgDefinitionId, "rootOrg.orgDefinitionId"),
    orgDefinitionName: requiredString(root.orgDefinitionName, "rootOrg.orgDefinitionName"),
    orgRunId: requiredString(root.orgRunId, "rootOrg.orgRunId"),
    defaultLaunchConfiguration: parseLaunchConfiguration(root.defaultLaunchConfiguration, "rootOrg.defaultLaunchConfiguration"),
    units: requiredArray(root.units, "rootOrg.units").map((unit, index) => parseUnit(unit, `rootOrg.units[${index}]`)),
    formerUnits: requiredArray(root.formerUnits, "rootOrg.formerUnits").map((unit, index) => parseUnit(unit, `rootOrg.formerUnits[${index}]`)),
  };
};

/** Current units have unique addresses; every unit run (current or former) is one run; rules start inside a current unit. */
const validateInvariants = (file: AgentOrgContainerFile): void => {
  const addresses = new Set<string>();
  for (const unit of file.rootOrg.units) {
    if (addresses.has(unit.address)) throw new Error(`Duplicate Org unit address '${unit.address}'.`);
    addresses.add(unit.address);
  }
  const runIds = new Set<string>();
  for (const unit of [...file.rootOrg.units, ...file.rootOrg.formerUnits]) {
    if (runIds.has(unit.runId)) throw new Error(`Duplicate Org unit run '${unit.runId}'.`);
    runIds.add(unit.runId);
  }
  const unitOf = (address: string) => file.rootOrg.units.find((unit) => unit.address === address
    || (unit.kind === "agent_team" && isAgentTeamAddressAncestor(unit.address, address as AgentTeamAddress)));
  for (const handoff of file.handoffs) {
    if (!unitOf(handoff.from)) throw new Error(`Org rule sender '${handoff.from}' is not in a unit of the Org.`);
  }
};

/**
 * Reads an Org container file tolerantly (known fields required and validated, unknown keys ignored) and returns the exact
 * current shape; a released Org tree v1 (`rootOrg.members`, no `units`) is refused here (the conversion reads it).
 */
export const validateAgentOrgContainerPayload = (value: unknown, expectedOrgRunId?: string): AgentOrgContainerFile => {
  const payload = objectRecord(value, "AgentOrg container");
  requireKeys(payload, ["subjectKind", "createdAt", "archivedAt", "applicationBinding", "handoffs", "rootOrg"], "AgentOrg container");
  if (payload.subjectKind !== "agent_org") throw new Error("AgentOrg container subjectKind must be 'agent_org'.");
  const file: AgentOrgContainerFile = {
    subjectKind: "agent_org",
    createdAt: isoTimestamp(payload.createdAt, "createdAt"),
    archivedAt: payload.archivedAt === null ? null : isoTimestamp(payload.archivedAt, "archivedAt"),
    applicationBinding: parseApplicationBinding(payload.applicationBinding),
    handoffs: normalizeCollaborationHandoffs(payload.handoffs),
    rootOrg: parseRoot(payload.rootOrg),
  };
  if (expectedOrgRunId && file.rootOrg.orgRunId !== expectedOrgRunId) {
    throw new Error(`AgentOrg container '${file.rootOrg.orgRunId}' does not match '${expectedOrgRunId}'.`);
  }
  validateInvariants(file);
  return deepFreeze(file);
};
