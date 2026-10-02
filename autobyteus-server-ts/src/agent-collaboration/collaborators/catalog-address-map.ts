import { createHash } from "node:crypto";
import {
  assertValidAgentTeamMemberName,
  createAgentTeamAddress,
  getAgentTeamAddressSegments,
  type AgentTeamAddress,
} from "../domain/agent-team-address.js";

export type CatalogDefinitionKind = "agent" | "agent_team";

/** One shared catalog definition, by kind and ID. */
export type CatalogDefinitionRef = Readonly<{ kind: CatalogDefinitionKind; definitionId: string }>;

export type CatalogAddressMapInput = Readonly<{
  /** Every eligible catalog definition (in-run ones included), in catalog order. */
  eligible: readonly Readonly<CatalogDefinitionRef & { name: string }>[];
  /** The in-run address of each definition already in the run, by `catalogDefinitionKey`. */
  inRunAddresses: ReadonlyMap<string, AgentTeamAddress>;
  /** Addresses the run already uses; their first segments are taken. */
  addressesInUse: Iterable<string>;
}>;

const FALLBACK_SEGMENT = "collaborator";
const SEGMENT_KEY = (segment: string): string => segment.toLocaleLowerCase("en-US");

export const catalogDefinitionKey = (ref: CatalogDefinitionRef): string => `${ref.kind}:${ref.definitionId}`;

/** `Product Team` -> `product_team`; characters outside [a-z0-9] become single underscores. */
export const collaboratorSegmentForName = (name: string): string => {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return assertValidAgentTeamMemberName(slug || FALLBACK_SEGMENT, "collaborator address");
};

const hashSuffix = (definitionId: string): string =>
  createHash("sha256").update(definitionId).digest("hex").slice(0, 6);

/**
 * The run's catalog address space (REQ-003), a pure function of the eligible catalog and the
 * addresses in use. A definition already in the run keeps its in-run address. Any other
 * definition gets its name's segment when that segment is unique among the eligible catalog
 * and not used by the run; otherwise `<segment>_<6 hex of sha256(definitionId)>`, applied to
 * every colliding definition. The same inputs always give the same addresses.
 */
export class CatalogAddressMap {
  private readonly addressByKey = new Map<string, AgentTeamAddress>();
  private readonly catalogByAddress = new Map<string, CatalogDefinitionRef>();

  constructor(input: CatalogAddressMapInput) {
    const used = new Set<string>();
    for (const address of input.addressesInUse) {
      const first = getAgentTeamAddressSegments(address as AgentTeamAddress)[0];
      if (first) used.add(SEGMENT_KEY(first));
    }
    const segmentCounts = new Map<string, number>();
    const segments = input.eligible.map((entry) => {
      const segment = collaboratorSegmentForName(entry.name);
      segmentCounts.set(SEGMENT_KEY(segment), (segmentCounts.get(SEGMENT_KEY(segment)) ?? 0) + 1);
      return segment;
    });
    input.eligible.forEach((entry, index) => {
      const key = catalogDefinitionKey(entry);
      const inRun = input.inRunAddresses.get(key);
      if (inRun) {
        this.addressByKey.set(key, inRun);
        return;
      }
      const segment = segments[index]!;
      const collides = (segmentCounts.get(SEGMENT_KEY(segment)) ?? 0) > 1 || used.has(SEGMENT_KEY(segment));
      const address = createAgentTeamAddress([collides ? `${segment}_${hashSuffix(entry.definitionId)}` : segment]);
      this.addressByKey.set(key, address);
      this.catalogByAddress.set(address, Object.freeze({ kind: entry.kind, definitionId: entry.definitionId }));
    });
  }

  /** The address of an eligible definition: its in-run address, or the one it gets when brought in. */
  addressFor(ref: CatalogDefinitionRef): AgentTeamAddress | null {
    return this.addressByKey.get(catalogDefinitionKey(ref)) ?? null;
  }

  /** The eligible definition that is not in the run at `address`; null for any other address. */
  definitionFor(address: string): CatalogDefinitionRef | null {
    return this.catalogByAddress.get(address) ?? null;
  }
}
