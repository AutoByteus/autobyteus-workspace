import {
  assertValidAgentTeamMemberName,
  createAgentTeamAddress,
  getAgentTeamAddressSegments,
  type AgentTeamAddress,
} from "../domain/agent-team-address.js";

const FALLBACK_SEGMENT = "collaborator";

/** `Product Team` -> `product_team`; characters outside [a-z0-9] become single underscores. */
export const collaboratorSegmentForName = (name: string): string => {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return assertValidAgentTeamMemberName(slug || FALLBACK_SEGMENT, "collaborator address");
};

/**
 * One root-level address per new collaborator: the name's segment, then `_2`, `_3`, …
 * against every root-level segment in use (compared case-insensitively, like Team siblings).
 */
export const allocateCollaboratorAddress = (
  name: string,
  addressesInUse: Iterable<string>,
): AgentTeamAddress => {
  const used = new Set<string>();
  for (const address of addressesInUse) {
    const first = getAgentTeamAddressSegments(address as AgentTeamAddress)[0];
    if (first) used.add(first.toLocaleLowerCase("en-US"));
  }
  const base = collaboratorSegmentForName(name);
  for (let suffix = 1; ; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}_${suffix}`;
    if (!used.has(candidate.toLocaleLowerCase("en-US"))) return createAgentTeamAddress([candidate]);
  }
};
