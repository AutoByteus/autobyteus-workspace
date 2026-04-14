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
    name: "Tool Management Tools",
    modulePath: "../agent-tools/tool-management/register-tool-management-tools.js",
    exportName: "registerToolManagementTools",
  },
  {
    name: "Skills Tools",
    modulePath: "../agent-tools/skills/register-skills-tools.js",
    exportName: "registerSkillsTools",
  },
  {
    name: "Browser Tools",
    modulePath: "../agent-tools/browser/register-browser-tools.js",
    exportName: "registerBrowserTools",
  },
  {
    name: "Application Session Tools",
    modulePath: "../application-sessions/tools/register-application-session-tools.js",
    exportName: "registerApplicationSessionTools",
  },
];

type Loader = () => void;

async function loadToolGroup(spec: LoaderSpec): Promise<void> {
  try {
    const moduleUrl = new URL(spec.modulePath, import.meta.url).href;
    const module = await import(moduleUrl);
    const loader = module[spec.exportName] as Loader | undefined;
    if (typeof loader !== "function") {
      logger.warn(`Tool loader '${spec.name}' missing export '${spec.exportName}'. Skipping.`);
      return;
    }
    loader();
    logger.info(`Loaded tool group: ${spec.name}`);
  } catch (error) {
    const err = error as Error & { code?: string };
    if (err.code === "ERR_MODULE_NOT_FOUND") {
      logger.warn(`Tool loader '${spec.name}' not available yet. Skipping.`);
      return;
    }
    logger.error(`Failed to load tool group '${spec.name}': ${String(error)}`);
  }
}

export async function loadAllAgentTools(): Promise<void> {
  logger.info("Loading agent tool definitions...");
  await Promise.all(loaderSpecs.map(loadToolGroup));
}
