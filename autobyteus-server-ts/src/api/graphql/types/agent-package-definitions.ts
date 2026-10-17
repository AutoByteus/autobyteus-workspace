import { Mutation, Resolver } from "type-graphql";
import { getStudioAgentDefinitionService } from "../studio-application-api-services.js";

const logger = {
  error: (...args: unknown[]) => console.error(...args),
};

@Resolver()
export class AgentPackageDefinitionsResolver {
  /**
   * The Reload buttons on the Agents, Teams and Orgs pages: a full reload of every registered
   * agent package, which also tells other connected clients to reload their lists.
   */
  @Mutation(() => Boolean)
  async reloadAgentPackageDefinitions(): Promise<boolean> {
    try {
      await getStudioAgentDefinitionService().reloadAgentPackageDefinitions();
      return true;
    } catch (error) {
      logger.error(`Error reloading agent package definitions: ${String(error)}`);
      throw new Error("Unable to reload agent package definitions at this time.");
    }
  }
}
