import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { CatalogAddressMap } from "../../../../src/agent-collaboration/collaborators/catalog-address-map.js";
import type { AgentTeamAddress } from "../../../../src/agent-collaboration/domain/agent-team-address.js";

const hash6 = (id: string): string => createHash("sha256").update(id).digest("hex").slice(0, 6);

const eligible = [
  { kind: "agent" as const, definitionId: "reviewer-a", name: "Code Reviewer" },
  { kind: "agent" as const, definitionId: "reviewer-b", name: "Code Reviewer" },
  { kind: "agent" as const, definitionId: "writer", name: "Writer" },
  { kind: "agent_team" as const, definitionId: "product", name: "Product Team" },
  { kind: "agent_team" as const, definitionId: "research", name: "Research" },
  { kind: "agent" as const, definitionId: "research-agent", name: "Research" },
];

const map = (input: { inRun?: [string, string][]; inUse?: string[]; entries?: typeof eligible } = {}) => new CatalogAddressMap({
  eligible: input.entries ?? eligible,
  inRunAddresses: new Map((input.inRun ?? []).map(([key, address]) => [key, address as AgentTeamAddress])),
  addressesInUse: input.inUse ?? ["/coordinator"],
});

describe("CatalogAddressMap (REQ-003)", () => {
  it("gives a unique name its plain segment", () => {
    const addresses = map();
    expect(addresses.addressFor({ kind: "agent", definitionId: "writer" })).toBe("/writer");
    expect(addresses.addressFor({ kind: "agent_team", definitionId: "product" })).toBe("/product_team");
  });

  it("suffixes every colliding definition, across kinds, with its definition ID's hash", () => {
    const addresses = map();
    expect(addresses.addressFor({ kind: "agent", definitionId: "reviewer-a" })).toBe(`/code_reviewer_${hash6("reviewer-a")}`);
    expect(addresses.addressFor({ kind: "agent", definitionId: "reviewer-b" })).toBe(`/code_reviewer_${hash6("reviewer-b")}`);
    expect(addresses.addressFor({ kind: "agent_team", definitionId: "research" })).toBe(`/research_${hash6("research")}`);
    expect(addresses.addressFor({ kind: "agent", definitionId: "research-agent" })).toBe(`/research_${hash6("research-agent")}`);
  });

  it("suffixes a name whose segment the run already uses (configured, host or collaborator)", () => {
    expect(map({ inUse: ["/writer"] }).addressFor({ kind: "agent", definitionId: "writer" })).toBe(`/writer_${hash6("writer")}`);
    expect(map({ inUse: ["/Writer/lead"] }).addressFor({ kind: "agent", definitionId: "writer" })).toBe(`/writer_${hash6("writer")}`);
  });

  it("is deterministic: the same catalog gives the same addresses, whatever the order", () => {
    const first = map();
    const again = map({ entries: [...eligible].reverse() });
    for (const entry of eligible) expect(again.addressFor(entry)).toBe(first.addressFor(entry));
  });

  it("keeps the in-run address of a definition already in the run; only catalog addresses map back", () => {
    const addresses = map({ inRun: [["agent:writer", "/team/writer"]], inUse: ["/team"] });
    expect(addresses.addressFor({ kind: "agent", definitionId: "writer" })).toBe("/team/writer");
    expect(addresses.definitionFor("/team/writer")).toBeNull();
    expect(addresses.definitionFor("/product_team")).toEqual({ kind: "agent_team", definitionId: "product" });
  });

  it("maps an unknown address to nothing (the normal not found)", () => {
    const addresses = map();
    expect(addresses.definitionFor("/no_such_team")).toBeNull();
    expect(addresses.definitionFor("/code_reviewer")).toBeNull();
    expect(addresses.addressFor({ kind: "agent", definitionId: "missing" })).toBeNull();
  });
});
