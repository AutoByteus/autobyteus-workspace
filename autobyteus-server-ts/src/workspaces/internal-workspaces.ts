import path from "node:path";
import { appConfigProvider } from "../config/app-config-provider.js";
import { canonicalizeWorkspaceRootPath } from "./workspace-path-utils.js";

/** The folder under the app data folder that holds internal agents' workspaces. */
export const INTERNAL_WORKSPACES_DIR_NAME = "internal-workspaces";

/**
 * The one owner of "internal workspace" (autobyteus-32 REQ-008, DS-008): a workspace whose root is under
 * `<appData>/internal-workspaces/`. An internal agent that the server runs (the Model Router agent) works in its own
 * folder there; the Workspaces list leaves these out while internal agents are hidden. Nothing here knows any agent.
 */
export class InternalWorkspaces {
  constructor(private readonly appDataDir: () => string = () => appConfigProvider.config.getAppDataDir()) {}

  root(): string {
    return canonicalizeWorkspaceRootPath(path.join(this.appDataDir(), INTERNAL_WORKSPACES_DIR_NAME));
  }

  /** The workspace folder of an internal agent definition. */
  pathFor(agentDefinitionId: string): string {
    return path.join(this.root(), agentDefinitionId);
  }

  isInternal(rootPath: string): boolean {
    const root = this.root();
    const candidate = canonicalizeWorkspaceRootPath(rootPath);
    return candidate !== root && candidate.startsWith(`${root}${path.sep}`);
  }
}
