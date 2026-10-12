import { z } from "zod";
import { AGENT_PACKAGE_DEFINITION_LISTS } from "../domain/agent-package-definition-types.js";

/**
 * The `/ws/agent-package-definitions` change feed (server → client, one JSON message per frame).
 * `connected` greets every (re)connection so a client re-reads its loaded lists;
 * `agent_package_definitions_changed` names the web lists a client should reload.
 */
export const AgentPackageDefinitionChangeMessageSchema = z.union([
  z.strictObject({ type: z.literal("connected") }),
  z.strictObject({
    type: z.literal("agent_package_definitions_changed"),
    changedLists: z.array(z.enum(AGENT_PACKAGE_DEFINITION_LISTS)).min(1),
  }),
]);
export type AgentPackageDefinitionChangeMessage = z.infer<typeof AgentPackageDefinitionChangeMessageSchema>;

/** The exact writer: one validated JSON frame. */
export const serializeAgentPackageDefinitionChangeMessage = (message: AgentPackageDefinitionChangeMessage): string =>
  JSON.stringify(AgentPackageDefinitionChangeMessageSchema.parse(message));
