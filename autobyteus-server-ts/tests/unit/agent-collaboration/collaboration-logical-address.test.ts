import { describe, expect, it } from "vitest";
import {
  assertAgentTeamAddress,
  createAgentTeamAddress,
  getAgentTeamAddressBasename,
  getAgentTeamAddressSegments,
  getParentAgentTeamAddress,
  isAgentTeamAddressAncestor,
} from "../../../src/agent-collaboration/domain/agent-team-address.js";
import { resolveRecipientAddressExpression } from "../../../src/agent-collaboration/domain/recipient-address-expression.js";

describe("canonical collaboration address derivation", () => {
  it("derives every structural view from one canonical absolute address", () => {
    const address = assertAgentTeamAddress("/research_team/research_lead");

    expect(getAgentTeamAddressSegments(address)).toEqual([
      "research_team",
      "research_lead",
    ]);
    expect(getAgentTeamAddressBasename(address)).toBe("research_lead");
    expect(getParentAgentTeamAddress(address)).toBe("/research_team");
    expect(isAgentTeamAddressAncestor("/research_team", address)).toBe(true);
    expect(isAgentTeamAddressAncestor(address, address)).toBe(false);
  });

  it("canonicalizes relative request expressions immediately against a derived Team address", () => {
    expect(resolveRecipientAddressExpression("./field_team", assertAgentTeamAddress("/research_team"))).toBe(
      "/research_team/field_team",
    );
    expect(resolveRecipientAddressExpression("/design_team/designer", assertAgentTeamAddress("/research_team"))).toBe(
      "/design_team/designer",
    );
  });

  it("preserves root derivations and rejects non-canonical stored identities", () => {
    expect(createAgentTeamAddress([])).toBe("/");
    expect(getAgentTeamAddressSegments("/")).toEqual([]);
    expect(getAgentTeamAddressBasename("/")).toBeNull();
    expect(getParentAgentTeamAddress("/")).toBeNull();
    expect(() => assertAgentTeamAddress("./research_lead")).toThrow(
      expect.objectContaining({ code: "COLLABORATION_ADDRESS_INVALID" }),
    );
  });
});
