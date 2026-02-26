import { WorkspaceConfig } from 'autobyteus-ts';
import { FileSystemWorkspace } from './filesystem-workspace.js';

const logger = {
  info: (...args: unknown[]) => console.info(...args),
};

export class TempWorkspace extends FileSystemWorkspace {
  static readonly TEMP_WORKSPACE_ID = 'temp_ws_default';

  constructor(rootPath: string) {
    const config = new WorkspaceConfig({
      rootPath: rootPath,
      workspaceId: TempWorkspace.TEMP_WORKSPACE_ID,
    });
    super(config);
    logger.info(
      `Initialized TempWorkspace at ${rootPath} with fixed ID '${TempWorkspace.TEMP_WORKSPACE_ID}'`,
    );
  }

  getName(): string {
    return 'Temp Workspace';
  }
}
