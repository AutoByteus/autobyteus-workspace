/**
 * The port through which a migration looks up the display name of an agent or team definition. The registry passes
 * one answered by the live definition providers, so a name is resolved exactly as the application resolves it.
 * `null` means no definition has that id.
 */
export type DefinitionNameLookup = {
  agentDefinitionName(agentDefinitionId: string): Promise<string | null>;
  teamDefinitionName(teamDefinitionId: string): Promise<string | null>;
};
