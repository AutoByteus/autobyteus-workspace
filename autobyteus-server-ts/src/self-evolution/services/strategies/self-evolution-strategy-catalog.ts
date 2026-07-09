import {
  DEFAULT_SELF_EVOLUTION_EVOLVER_STRATEGY,
  DEFAULT_SELF_EVOLUTION_TRIGGER_STRATEGY,
} from "../../domain/config.js";
import type { SelfEvolutionStrategyCatalog, SelfEvolutionStrategyDescriptor } from "../../domain/models.js";

const triggerStrategies: SelfEvolutionStrategyDescriptor[] = [
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

const evolverStrategies: SelfEvolutionStrategyDescriptor[] = [
  {
    name: "single_agent",
    label: "Single evolver agent",
    status: "implemented",
    description: "Launches one visible Retrospective Skill Improver agent run with run_bash access.",
  },
  {
    name: "agent_team",
    label: "Evolver team",
    status: "not_implemented",
    description: "Future multi-agent Skill Improvement team strategy. Not executable in the MVP.",
  },
];

export class SelfEvolutionStrategyCatalogService {
  getCatalog(): SelfEvolutionStrategyCatalog {
    return {
      triggerStrategies: triggerStrategies.map((entry) => ({ ...entry })),
      evolverStrategies: evolverStrategies.map((entry) => ({ ...entry })),
      defaultTriggerStrategy: DEFAULT_SELF_EVOLUTION_TRIGGER_STRATEGY,
      defaultEvolverStrategy: DEFAULT_SELF_EVOLUTION_EVOLVER_STRATEGY,
    };
  }

  isImplementedTrigger(name: string): boolean {
    return triggerStrategies.some((entry) => entry.name === name && entry.status === "implemented");
  }

  isImplementedEvolver(name: string): boolean {
    return evolverStrategies.some((entry) => entry.name === name && entry.status === "implemented");
  }
}
