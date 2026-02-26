import { describe, expect, it } from "vitest";
import {
  generateTeamRunId,
  normalizeTeamRunLabel,
} from "../../../src/run-history/utils/team-run-id.js";

describe("team-run-id", () => {
  it("normalizes team label to a readable slug", () => {
    expect(normalizeTeamRunLabel("AI Research Team / West")).toBe("ai-research-team-west");
  });

  it("falls back to unnamed-team when label is empty", () => {
    expect(normalizeTeamRunLabel("   ")).toBe("unnamed-team");
    expect(normalizeTeamRunLabel(null)).toBe("unnamed-team");
  });

  it("trims long labels to a stable max length", () => {
    const normalized = normalizeTeamRunLabel("0123456789012345678901234567890123456789-extra");
    expect(normalized.length).toBeLessThanOrEqual(40);
    expect(normalized).toBe("0123456789012345678901234567890123456789");
  });

  it("generates team run id with team slug prefix and random suffix", () => {
    const teamRunId = generateTeamRunId("Frontend Platform");
    expect(teamRunId).toMatch(/^team_frontend-platform_[a-f0-9]{8}$/);
  });
});
