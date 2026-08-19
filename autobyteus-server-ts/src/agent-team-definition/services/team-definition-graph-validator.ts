import type { AgentTeamDefinition } from "../domain/models.js";
import {
  TeamDefinitionGraphResolver,
  type TeamDefinitionGraphLookup,
} from "./team-definition-graph-resolver.js";
import { TeamHandoffCompiler } from "./team-handoff-compiler.js";

export type { TeamDefinitionGraphLookup } from "./team-definition-graph-resolver.js";

export const validateTeamDefinitionGraph = async (input: {
  rootDefinition: AgentTeamDefinition;
  lookup: TeamDefinitionGraphLookup;
}): Promise<string[]> => {
  try {
    const graph = await new TeamDefinitionGraphResolver().resolve(input);
    new TeamHandoffCompiler().compile(graph);
    return [];
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
};

export const assertValidTeamDefinitionGraph = async (input: {
  rootDefinition: AgentTeamDefinition;
  lookup: TeamDefinitionGraphLookup;
}): Promise<void> => {
  const graph = await new TeamDefinitionGraphResolver().resolve(input);
  new TeamHandoffCompiler().compile(graph);
};
