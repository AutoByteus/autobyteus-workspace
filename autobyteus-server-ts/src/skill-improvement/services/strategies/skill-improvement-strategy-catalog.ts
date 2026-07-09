import {
  DEFAULT_SKILL_IMPROVEMENT_IMPROVER_STRATEGY,
  DEFAULT_SKILL_IMPROVEMENT_TRIGGER_STRATEGY,
} from "../../domain/config.js";
import type { SkillImprovementStrategyCatalog, SkillImprovementStrategyDescriptor } from "../../domain/models.js";

const triggerStrategies: SkillImprovementStrategyDescriptor[] = [
  {
    name: "manual_only",
    label: "Manual only",
    status: "implemented",
    description: "A user explicitly starts Skill Improvement from a run detail surface.",
  },
  {
    name: "scheduled",
    label: "Scheduled",
    status: "not_implemented",
    description: "Future scheduled Skill Improvement trigger. Not executable in the MVP.",
  },
  {
    name: "signal_based",
    label: "Signal based",
    status: "not_implemented",
    description: "Future feedback/failure signal trigger. Not executable in the MVP.",
  },
];

const improverStrategies: SkillImprovementStrategyDescriptor[] = [
  {
    name: "single_agent",
    label: "Single improver agent",
    status: "implemented",
    description: "Launches one visible Retrospective Skill Improver agent run with run_bash access.",
  },
  {
    name: "agent_team",
    label: "Improver team",
    status: "not_implemented",
    description: "Future multi-agent Skill Improvement team strategy. Not executable in the MVP.",
  },
];

export class SkillImprovementStrategyCatalogService {
  getCatalog(): SkillImprovementStrategyCatalog {
    return {
      triggerStrategies: triggerStrategies.map((entry) => ({ ...entry })),
      improverStrategies: improverStrategies.map((entry) => ({ ...entry })),
      defaultTriggerStrategy: DEFAULT_SKILL_IMPROVEMENT_TRIGGER_STRATEGY,
      defaultImproverStrategy: DEFAULT_SKILL_IMPROVEMENT_IMPROVER_STRATEGY,
    };
  }

  isImplementedTrigger(name: string): boolean {
    return triggerStrategies.some((entry) => entry.name === name && entry.status === "implemented");
  }

  isImplementedImprover(name: string): boolean {
    return improverStrategies.some((entry) => entry.name === name && entry.status === "implemented");
  }
}
