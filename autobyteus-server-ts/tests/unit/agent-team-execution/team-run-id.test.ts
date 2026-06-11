import { describe, expect, it } from "vitest";
import { generateTeamRunIdForDefinitionName } from "../../../src/agent-team-execution/domain/team-run-id.js";

describe("team-run-id", () => {
  it("normalizes team definition names to readable lowercase run-id slugs", () => {
    expect(
      generateTeamRunIdForDefinitionName(
        "  Build Squad / Review #1  ",
        "abcdef0123456789abcdef0123456789",
      ),
    ).toBe("build_squad_review_1_abcdef0123456789abcdef0123456789");
  });

  it("falls back to team slug when definition name has no usable characters", () => {
    expect(generateTeamRunIdForDefinitionName("!!!", "abcdef0123456789abcdef0123456789")).toBe(
      "team_abcdef0123456789abcdef0123456789",
    );
  });

  it("combines the team definition-name slug with a UUID token", () => {
    expect(
      generateTeamRunIdForDefinitionName("Build Squad", "abcdef0123456789abcdef0123456789"),
    ).toBe("build_squad_abcdef0123456789abcdef0123456789");
  });
});
