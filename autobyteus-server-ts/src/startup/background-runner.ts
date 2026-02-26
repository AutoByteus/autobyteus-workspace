const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type Task = { name: string; run: () => Promise<void> | void };

type TaskSpec = {
  name: string;
  modulePath: string;
  exportName: string;
};

const taskSpecs: TaskSpec[] = [
  { name: "Cache Pre-loading", modulePath: "./cache-preloader.js", exportName: "runCachePreloading" },
  { name: "Agent Customizations", modulePath: "./agent-customization-loader.js", exportName: "loadAgentCustomizations" },
  { name: "Workspaces", modulePath: "./workspace-loader.js", exportName: "loadWorkspaces" },
  { name: "Agent Tools", modulePath: "./agent-tool-loader.js", exportName: "loadAllAgentTools" },
  { name: "MCP Tool Registration", modulePath: "./mcp-loader.js", exportName: "runMcpToolRegistration" },
];

async function loadTask(spec: TaskSpec): Promise<Task | null> {
  try {
    const moduleUrl = new URL(spec.modulePath, import.meta.url).href;
    const module = await import(moduleUrl);
    const run = module[spec.exportName] as Task["run"] | undefined;
    if (typeof run !== "function") {
      logger.warn(`Background task '${spec.name}' missing export '${spec.exportName}'. Skipping.`);
      return null;
    }
    return { name: spec.name, run };
  } catch (error) {
    const err = error as Error & { code?: string };
    if (err.code === "ERR_MODULE_NOT_FOUND") {
      logger.warn(`Background task '${spec.name}' not available yet. Skipping.`);
      return null;
    }
    logger.error(`Failed to load background task '${spec.name}': ${String(error)}`);
    return null;
  }
}

async function runAllBackgroundTasks(): Promise<void> {
  const tasks = (await Promise.all(taskSpecs.map(loadTask))).filter(Boolean) as Task[];
  if (tasks.length === 0) {
    logger.info("No background tasks available to run.");
    return;
  }

  const results = await Promise.allSettled(
    tasks.map(async (task) => {
      await task.run();
      logger.info(`Background task '${task.name}' completed successfully.`);
    }),
  );

  let failed = 0;
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const task = tasks[index];
      failed += 1;
      logger.error(`Background task '${task?.name ?? "unknown"}' failed: ${String(result.reason)}`);
    }
  });

  if (failed > 0) {
    logger.warn(`Background tasks completed with ${failed} failure(s).`);
  }
}

export async function scheduleBackgroundTasks(): Promise<void> {
  logger.info("Scheduling non-critical startup tasks to run in the background...");
  void runAllBackgroundTasks().catch((error) => {
    logger.error(`Failed to run background tasks: ${String(error)}`);
  });
}
