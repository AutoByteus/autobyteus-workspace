import { describe, expect, it } from "vitest";
import { SelfEvolutionEffectiveConfigResolver } from "../../src/self-evolution/services/self-evolution-effective-config-resolver.js";

const resolver = new SelfEvolutionEffectiveConfigResolver();

describe("SelfEvolutionEffectiveConfigResolver", () => {
  it("resolves standalone defaults and run launch overrides in order", () => {
    const effective = resolver.resolveForStandalone({
      runLaunchOverride: {
        enabled: true,
        triggerStrategy: "manual_only",
        evolverStrategy: "single_agent",
        evolverAgentDefinitionId: "agent-evolver",
      },
    });

    expect(effective.enabled).toBe(true);
    expect(effective.triggerStrategy).toBe("manual_only");
    expect(effective.evolverStrategy).toBe("single_agent");
    expect(effective.evolverAgentDefinitionId).toBe("agent-evolver");
    expect(effective.sourceTrace.map((entry) => entry.source)).toEqual([
      "default",
      "agent_run_launch",
    ]);
  });

  it("resolves team member precedence through team run and member launch overrides", () => {
    const effective = resolver.resolveForTeamMember({
      teamRunOverride: {
        enabled: true,
        triggerStrategy: "manual_only",
        evolverStrategy: "agent_team",
      },
      teamMemberOverride: {
        evolverStrategy: "single_agent",
        evolverAgentDefinitionId: "member-run-evolver",
      },
    });

    expect(effective.enabled).toBe(true);
    expect(effective.triggerStrategy).toBe("manual_only");
    expect(effective.evolverStrategy).toBe("single_agent");
    expect(effective.evolverAgentDefinitionId).toBe("member-run-evolver");
    expect(effective.sourceTrace.map((entry) => entry.source)).toEqual([
      "default",
      "team_run_launch",
      "team_member_run_launch",
    ]);
  });
});
