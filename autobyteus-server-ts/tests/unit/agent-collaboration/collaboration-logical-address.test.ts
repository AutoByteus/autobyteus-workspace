import { describe, expect, it } from "vitest";
import {
  assertCanonicalCollaborationAddress,
  formatAbsoluteCollaborationAddress,
  getCollaborationAddressBasename,
  getCollaborationAddressRouteKey,
  getCollaborationAddressSegments,
  getParentCollaborationAddress,
  isCollaborationAddressAncestor,
  resolveRuntimeCollaborationAddress,
} from "../../../src/agent-collaboration/domain/collaboration-logical-address.js";

describe("canonical collaboration address derivation", () => {
  it("derives every structural view from one canonical absolute address", () => {
    const address = assertCanonicalCollaborationAddress("/research_team/research_lead");

    expect(getCollaborationAddressSegments(address)).toEqual([
      "research_team",
      "research_lead",
    ]);
    expect(getCollaborationAddressBasename(address)).toBe("research_lead");
    expect(getParentCollaborationAddress(address)).toBe("/research_team");
    expect(getCollaborationAddressRouteKey(address)).toBe("research_team/research_lead");
    expect(isCollaborationAddressAncestor("/research_team", address)).toBe(true);
    expect(isCollaborationAddressAncestor(address, address)).toBe(false);
  });

  it("canonicalizes relative request expressions immediately against a derived Team address", () => {
    expect(resolveRuntimeCollaborationAddress("./field_team", "/research_team")).toBe(
      "/research_team/field_team",
    );
    expect(resolveRuntimeCollaborationAddress("/design_team/designer", "/research_team")).toBe(
      "/design_team/designer",
    );
  });

  it("preserves root derivations and rejects non-canonical stored identities", () => {
    expect(formatAbsoluteCollaborationAddress([])).toBe("/");
    expect(getCollaborationAddressSegments("/")).toEqual([]);
    expect(getCollaborationAddressBasename("/")).toBeNull();
    expect(getParentCollaborationAddress("/")).toBeNull();
    expect(getCollaborationAddressRouteKey("/")).toBe("");
    expect(() => assertCanonicalCollaborationAddress("./research_lead")).toThrow(
      expect.objectContaining({ code: "COLLABORATION_ADDRESS_INVALID" }),
    );
  });
});
