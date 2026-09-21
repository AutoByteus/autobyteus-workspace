import { describe, expect, it } from "vitest";
import {
  buildTeamLocalAgentDefinitionId,
  parseTeamLocalDefinitionId,
} from "../../../../src/agent-team-definition/utils/team-local-definition-id.js";

describe("team-local Agent definition identity", () => {
  it("round-trips one Agent owned by an exact Team", () => {
    const id = buildTeamLocalAgentDefinitionId("bundle-team:pkg:app:main-team", "planner");
    expect(id).toBe("team-local-agent:bundle-team%3Apkg%3Aapp%3Amain-team:planner");
    expect(parseTeamLocalDefinitionId(id)).toEqual({
      subject: "agent",
      ownerTeamId: "bundle-team:pkg:app:main-team",
      localDefinitionId: "planner",
    });
  });

  it("rejects empty and path-like parts", () => {
    expect(() => buildTeamLocalAgentDefinitionId(" ", "reviewer")).toThrow("ownerTeamId is required");
    expect(() => buildTeamLocalAgentDefinitionId("team-1", " ")).toThrow("localDefinitionId is required");
    expect(() => buildTeamLocalAgentDefinitionId("team-1", "../reviewer")).toThrow("safe local definition segment");
  });

  it("does not admit retired Team-local Team identities", () => {
    expect(parseTeamLocalDefinitionId("team-local-team:team-1:review-cell")).toBeNull();
    expect(parseTeamLocalDefinitionId("team-local-agent:team-1:..%2Freviewer")).toBeNull();
  });

  it("returns null for malformed or non-local identities", () => {
    expect(parseTeamLocalDefinitionId("team-local:team-1:reviewer")).toBeNull();
    expect(parseTeamLocalDefinitionId("team-local-agent:team-1")).toBeNull();
    expect(parseTeamLocalDefinitionId("team-local-agent:team-1:reviewer:extra")).toBeNull();
    expect(parseTeamLocalDefinitionId("agent-1")).toBeNull();
  });
});
