import type { AgentTeamDefinition } from "../domain/agent-team-definition.js";
import {
  FlatTeamDefinitionResolver,
  type FlatTeamDefinitionLookup,
} from "./flat-team-definition-resolver.js";
import { CollaborationHandoffCompiler } from "../../agent-collaboration/definition/collaboration-handoff-compiler.js";

export type { FlatTeamDefinitionLookup } from "./flat-team-definition-resolver.js";

export const validateFlatTeamDefinition = async (input: {
  rootDefinition: AgentTeamDefinition;
  lookup: FlatTeamDefinitionLookup;
}): Promise<string[]> => {
  try {
    const graph = await new FlatTeamDefinitionResolver().resolve(input);
    new CollaborationHandoffCompiler().compileTeam(graph);
    return [];
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
};

export const assertValidFlatTeamDefinition = async (input: {
  rootDefinition: AgentTeamDefinition;
  lookup: FlatTeamDefinitionLookup;
}): Promise<void> => {
  const graph = await new FlatTeamDefinitionResolver().resolve(input);
  new CollaborationHandoffCompiler().compileTeam(graph);
};
