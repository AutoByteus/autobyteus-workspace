const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export type RequiredAgentToolUnitKey =
  | "core"
  | "browser"
  | "task_delegation"
  | "agent_communication"
  | "published_artifact"
  | "media"
  | "search";

export type AgentToolUnitReadinessResult = {
  key: RequiredAgentToolUnitKey;
  displayName: string;
  status: "registered";
};

type LoaderSpec = {
  key: RequiredAgentToolUnitKey;
  displayName: string;
  modulePath: string;
  exportName: string;
  dependency?: "publishedArtifactPublicationService";
};

type LoaderArguments = {
  publishedArtifactPublicationService?: unknown;
};

type Loader = (dependency?: unknown) => void | Promise<void>;
type ModuleLoader = (modulePath: string) => Promise<Record<string, unknown>>;

const coreSpec: LoaderSpec = {
  key: "core",
  displayName: "Core Tools",
  modulePath: "autobyteus-ts/tools/register-tools.js",
  exportName: "registerTools",
};

const serverOwnedSpecs: LoaderSpec[] = [
  {
    key: "browser",
    displayName: "Browser Tools",
    modulePath: "../agent-tools/browser/register-browser-tools.js",
    exportName: "registerBrowserTools",
  },
  {
    key: "task_delegation",
    displayName: "Task Delegation Tools",
    modulePath: "../agent-tools/task-delegation/register-task-delegation-tools.js",
    exportName: "registerTaskDelegationTools",
  },
  {
    key: "agent_communication",
    displayName: "Agent Communication Tools",
    modulePath: "../agent-tools/agent-communication/register-agent-communication-tools.js",
    exportName: "registerAgentCommunicationTools",
  },
  {
    key: "published_artifact",
    displayName: "Published Artifact Tools",
    modulePath: "../agent-tools/published-artifacts/register-published-artifact-tools.js",
    exportName: "registerPublishedArtifactTools",
    dependency: "publishedArtifactPublicationService",
  },
  {
    key: "media",
    displayName: "Media Tools",
    modulePath: "../agent-tools/media/register-media-tools.js",
    exportName: "registerMediaTools",
  },
];

const searchSpec: LoaderSpec = {
  key: "search",
  displayName: "Search Tools",
  modulePath: "../agent-tools/search/register-search-tool.js",
  exportName: "registerProvisionedSearchTool",
};

const resolveModuleUrl = (modulePath: string): string =>
  modulePath.startsWith(".") ? new URL(modulePath, import.meta.url).href : modulePath;

const importModule: ModuleLoader = async (modulePath) =>
  import(resolveModuleUrl(modulePath)) as Promise<Record<string, unknown>>;

const loadUnit = async (
  spec: LoaderSpec,
  dependencies: LoaderArguments,
  moduleLoader: ModuleLoader,
): Promise<AgentToolUnitReadinessResult> => {
  let module: Record<string, unknown>;
  try {
    module = await moduleLoader(spec.modulePath);
  } catch (error) {
    throw new Error(
      `Required tool unit '${spec.displayName}' could not load '${spec.modulePath}': ${String(error)}`,
      { cause: error },
    );
  }
  const registrar = module[spec.exportName] as Loader | undefined;
  if (typeof registrar !== "function") {
    throw new Error(
      `Required tool unit '${spec.displayName}' is missing export '${spec.exportName}'.`,
    );
  }
  try {
    await registrar(spec.dependency ? dependencies[spec.dependency] : undefined);
  } catch (error) {
    throw new Error(
      `Required tool unit '${spec.displayName}' registration failed: ${String(error)}`,
      { cause: error },
    );
  }
  logger.info(`Registered required tool unit: ${spec.displayName}`);
  return { key: spec.key, displayName: spec.displayName, status: "registered" };
};

export class AgentToolRegistryReadiness {
  private registration: Promise<AgentToolUnitReadinessResult[]> | null = null;

  constructor(
    private readonly dependencies: LoaderArguments = {},
    private readonly moduleLoader: ModuleLoader = importModule,
  ) {}

  registerRequiredGroups(): Promise<AgentToolUnitReadinessResult[]> {
    this.registration ??= this.registerOnce();
    return this.registration;
  }

  private async registerOnce(): Promise<AgentToolUnitReadinessResult[]> {
    try {
      const core = await loadUnit(coreSpec, this.dependencies, this.moduleLoader);
      const outcomes = await Promise.allSettled(
        serverOwnedSpecs.map((spec) => loadUnit(spec, this.dependencies, this.moduleLoader)),
      );
      const failures = outcomes.flatMap((outcome, index) => outcome.status === "rejected"
        ? [outcome.reason instanceof Error
            ? outcome.reason
            : new Error(`${serverOwnedSpecs[index]!.displayName}: ${String(outcome.reason)}`)]
        : []);
      if (failures.length > 0) {
        throw new AggregateError(failures, "Required server-owned tool registration failed.");
      }
      const serverOwned = outcomes.map((outcome) =>
        (outcome as PromiseFulfilledResult<AgentToolUnitReadinessResult>).value);
      const search = await loadUnit(searchSpec, this.dependencies, this.moduleLoader);
      return [core, ...serverOwned, search];
    } catch (error) {
      logger.error("Required agent tool readiness failed.", error);
      throw error;
    }
  }
}
