const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export async function loadWorkspaces(): Promise<void> {
  logger.info("Loading workspace packages to trigger registration...");

  try {
    await import("../workspaces/filesystem-workspace.js");
    await import("../workspaces/skill-workspace.js");
    await import("../workspaces/temp-workspace.js");
    await import("../workspaces/workspace-manager.js");
    logger.info("Successfully loaded workspace packages.");
  } catch (error) {
    logger.error(`Failed to import and load workspaces: ${String(error)}`);
    throw error;
  }
}
