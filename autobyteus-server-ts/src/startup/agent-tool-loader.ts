const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type LoaderSpec = {
  name: string;
  modulePath: string;
  exportName: string;
};

const loaderSpecs: LoaderSpec[] = [
  {
    name: "Browser Tools",
    modulePath: "../agent-tools/browser/register-browser-tools.js",
    exportName: "registerBrowserTools",
  },
  {
    name: "Task Delegation Tools",
    modulePath: "../agent-tools/task-delegation/register-task-delegation-tools.js",
    exportName: "registerTaskDelegationTools",
  },
  {
    name: "Agent Communication Tools",
    modulePath: "../agent-tools/agent-communication/register-agent-communication-tools.js",
    exportName: "registerAgentCommunicationTools",
  },
  {
    name: "Published Artifact Tools",
    modulePath: "../agent-tools/published-artifacts/register-published-artifact-tools.js",
    exportName: "registerPublishedArtifactTools",
  },
  {
    name: "Media Tools",
    modulePath: "../agent-tools/media/register-media-tools.js",
    exportName: "registerMediaTools",
  },
  {
    name: "Search Tools",
    modulePath: "../agent-tools/search/register-search-tool.js",
    exportName: "registerProvisionedSearchTool",
  },
];

type Loader = (dependency?: unknown) => void;
type LoaderArguments = {
  publishedArtifactPublicationService?: unknown;
};

export type AgentToolGroupReadinessResult = {
  name: string;
  status: "registered";
};

async function loadToolGroup(
  spec: LoaderSpec,
  arguments_: LoaderArguments,
): Promise<AgentToolGroupReadinessResult> {
  const moduleUrl = new URL(spec.modulePath, import.meta.url).href;
  const module = await import(moduleUrl);
  const loader = module[spec.exportName] as Loader | undefined;
  if (typeof loader !== "function") {
    throw new Error(`Tool loader '${spec.name}' is missing export '${spec.exportName}'.`);
  }
  loader(
    spec.name === "Published Artifact Tools"
      ? arguments_.publishedArtifactPublicationService
      : undefined,
  );
  logger.info(`Loaded required tool group: ${spec.name}`);
  return { name: spec.name, status: "registered" };
}

export class AgentToolRegistryReadiness {
  constructor(private readonly dependencies: LoaderArguments = {}) {}

  async registerRequiredGroups(): Promise<AgentToolGroupReadinessResult[]> {
    logger.info("Loading seven required agent tool groups...");
    const outcomes = await Promise.allSettled(
      loaderSpecs.map((spec) => loadToolGroup(spec, this.dependencies)),
    );
    const failures = outcomes.flatMap((outcome, index) =>
      outcome.status === "rejected"
        ? [`${loaderSpecs[index]!.name}: ${String(outcome.reason)}`]
        : []);
    if (failures.length > 0) {
      const message = `Required agent tool registration failed: ${failures.join("; ")}`;
      logger.error(message);
      throw new Error(message);
    }
    return outcomes.map((outcome) =>
      (outcome as PromiseFulfilledResult<AgentToolGroupReadinessResult>).value);
  }
}

export async function loadAllAgentTools(): Promise<void> {
  await new AgentToolRegistryReadiness().registerRequiredGroups();
}
