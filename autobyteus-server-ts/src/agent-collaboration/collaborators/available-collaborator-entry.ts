/**
 * One listed collaborator as an agent reads it (autobyteus-261 DEC-404, DEC-405): its name, kind, address, and
 * its description only when it has one (the autobyteus-260 rule: no field without a value). The one shape of
 * this node's list, of a peer's answer on the wire and of the list an agent gets for a peer.
 */
export type AvailableCollaboratorEntry = Readonly<{
  name: string;
  kind: "agent" | "agent_team";
  address: string;
  description?: string;
}>;

/** The one builder of an entry: an empty or blank description is left out. */
export const availableCollaboratorEntry = (input: Readonly<{
  name: string;
  kind: "agent" | "agent_team";
  address: string;
  description?: string | null;
}>): AvailableCollaboratorEntry => Object.freeze({
  name: input.name,
  kind: input.kind,
  address: input.address,
  ...(input.description?.trim() ? { description: input.description } : {}),
});
