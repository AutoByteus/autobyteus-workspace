import { z } from "zod";

/**
 * The `/ws/definition-catalog` change feed (server → client, one JSON message per frame).
 * `connected` greets every (re)connection so a client re-reads its loaded catalogs;
 * `definitions_changed` names the subjects whose lists a client should reload.
 */
export const DEFINITION_CATALOG_CHANGE_SUBJECTS = ["agent", "agent_team", "agent_org", "agent_package"] as const;

export const DefinitionCatalogChangeMessageSchema = z.union([
  z.strictObject({ type: z.literal("connected") }),
  z.strictObject({
    type: z.literal("definitions_changed"),
    subjects: z.array(z.enum(DEFINITION_CATALOG_CHANGE_SUBJECTS)).min(1),
  }),
]);
export type DefinitionCatalogChangeMessage = z.infer<typeof DefinitionCatalogChangeMessageSchema>;

/** The exact writer: one validated JSON frame. */
export const serializeDefinitionCatalogChangeMessage = (message: DefinitionCatalogChangeMessage): string =>
  JSON.stringify(DefinitionCatalogChangeMessageSchema.parse(message));
