import path from "node:path";
import type { AppConfig } from "../../config/app-config.js";
import type { RegisteredPackageRoot } from "./agent-package-definition-types.js";

export type PackageRootConfig = Pick<
  AppConfig,
  "getAgentsDir" | "getAgentTeamsDir" | "getAgentOrgsDir" | "getRegisteredAgentPackageRoots"
>;

/**
 * Registered package roots in precedence order: the app-data default package first, then every
 * `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` entry, including entries whose folder is currently missing.
 */
export const listRegisteredPackageRoots = (config: PackageRootConfig): RegisteredPackageRoot[] => {
  const agentsDir = path.resolve(config.getAgentsDir());
  const defaultRoot: RegisteredPackageRoot = Object.freeze({
    rootPath: path.dirname(agentsDir),
    sourceClass: "server_data",
    kindDirs: Object.freeze({
      agents: agentsDir,
      "agent-teams": path.resolve(config.getAgentTeamsDir()),
      "agent-orgs": path.resolve(config.getAgentOrgsDir()),
    }),
  });
  const roots: RegisteredPackageRoot[] = [defaultRoot];
  for (const rootPath of config.getRegisteredAgentPackageRoots()) {
    if (roots.some((root) => root.rootPath === rootPath)) continue;
    roots.push(Object.freeze({
      rootPath,
      sourceClass: "registered_package",
      kindDirs: Object.freeze({
        agents: path.join(rootPath, "agents"),
        "agent-teams": path.join(rootPath, "agent-teams"),
        "agent-orgs": path.join(rootPath, "agent-orgs"),
      }),
    }));
  }
  return roots;
};
