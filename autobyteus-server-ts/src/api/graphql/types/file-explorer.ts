import { Arg, Mutation, Query, Resolver } from "type-graphql";
import { getWorkspaceManager } from "../../../workspaces/workspace-manager.js";
import type { FileSystemWorkspace } from "../../../workspaces/filesystem-workspace.js";
import { serializeChangeEvent } from "../../../file-explorer/file-system-changes.js";

const logger = {
  error: (...args: unknown[]) => console.error(...args),
};

const jsonError = (message: string): string => JSON.stringify({ error: message });

const toMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

@Resolver()
export class FileExplorerResolver {
  private get workspaceManager() {
    return getWorkspaceManager();
  }

  private async resolveWorkspace(workspaceId: string): Promise<FileSystemWorkspace | null> {
    try {
      return await this.workspaceManager.getOrCreateWorkspace(workspaceId);
    } catch {
      return null;
    }
  }

  @Query(() => String)
  async fileContent(
    @Arg("workspaceId", () => String) workspaceId: string,
    @Arg("filePath", () => String) filePath: string,
  ): Promise<string> {
    const workspace = await this.resolveWorkspace(workspaceId);
    if (!workspace) {
      return jsonError("Workspace not found");
    }

    const lease = await workspace.acquireFileExplorer("graphql-file-content");
    try {
      return await lease.fileExplorer.readFileContent(filePath);
    } catch (error) {
      const message = toMessage(error);
      if (
        message.toLowerCase().includes("file not found") ||
        message.toLowerCase().includes("permission") ||
        message.toLowerCase().includes("access denied")
      ) {
        return jsonError(message);
      }

      logger.error(`Error reading file content: ${message}`);
      return jsonError("An unexpected error occurred while reading the file");
    } finally {
      await lease.release();
    }
  }

  @Query(() => [String])
  async searchFiles(
    @Arg("workspaceId", () => String) workspaceId: string,
    @Arg("query", () => String) query: string,
  ): Promise<string[]> {
    const workspace = await this.resolveWorkspace(workspaceId);
    if (!workspace) {
      return [];
    }

    const lease = await workspace.acquireFileExplorer("graphql-search");
    try {
      return await lease.fileExplorer.searchFiles(query);
    } catch (error) {
      logger.error(`Error searching files: ${toMessage(error)}`);
      return [];
    } finally {
      await lease.release();
    }
  }

  @Query(() => String)
  async folderChildren(
    @Arg("workspaceId", () => String) workspaceId: string,
    @Arg("folderPath", () => String) folderPath: string,
  ): Promise<string> {
    const workspace = await this.resolveWorkspace(workspaceId);
    if (!workspace) {
      return jsonError("Workspace not found");
    }

    const lease = await workspace.acquireFileExplorer("graphql-folder-children");
    try {
      const folderNode = await lease.fileExplorer.loadFolderChildren(folderPath);
      return JSON.stringify(folderNode.toShallowDict(1));
    } catch (error) {
      const message = toMessage(error);
      if (
        message.includes("Folder not found") ||
        message.includes("Path is a file") ||
        message.includes("Path is not a folder") ||
        message.includes("Access denied")
      ) {
        return jsonError(message);
      }

      logger.error(`Error fetching folder children: ${message}`);
      return jsonError("An unexpected error occurred while fetching folder children");
    } finally {
      await lease.release();
    }
  }

  @Mutation(() => String)
  async writeFileContent(
    @Arg("workspaceId", () => String) workspaceId: string,
    @Arg("filePath", () => String) filePath: string,
    @Arg("content", () => String) content: string,
  ): Promise<string> {
    const workspace = await this.resolveWorkspace(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const lease = await workspace.acquireFileExplorer("graphql-write-file");
    try {
      const changeEvent = await lease.fileExplorer.writeFileContent(filePath, content);
      return serializeChangeEvent(changeEvent);
    } finally {
      await lease.release();
    }
  }

  @Mutation(() => String)
  async deleteFileOrFolder(
    @Arg("workspaceId", () => String) workspaceId: string,
    @Arg("path", () => String) targetPath: string,
  ): Promise<string> {
    const workspace = await this.resolveWorkspace(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const lease = await workspace.acquireFileExplorer("graphql-delete-file");
    try {
      const changeEvent = await lease.fileExplorer.removeFileOrFolder(targetPath);
      return serializeChangeEvent(changeEvent);
    } finally {
      await lease.release();
    }
  }

  @Mutation(() => String)
  async moveFileOrFolder(
    @Arg("workspaceId", () => String) workspaceId: string,
    @Arg("sourcePath", () => String) sourcePath: string,
    @Arg("destinationPath", () => String) destinationPath: string,
  ): Promise<string> {
    const workspace = await this.resolveWorkspace(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const lease = await workspace.acquireFileExplorer("graphql-move-file");
    try {
      const changeEvent = await lease.fileExplorer.moveFileOrFolder(sourcePath, destinationPath);
      return serializeChangeEvent(changeEvent);
    } finally {
      await lease.release();
    }
  }

  @Mutation(() => String)
  async renameFileOrFolder(
    @Arg("workspaceId", () => String) workspaceId: string,
    @Arg("targetPath", () => String) targetPath: string,
    @Arg("newName", () => String) newName: string,
  ): Promise<string> {
    const workspace = await this.resolveWorkspace(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const lease = await workspace.acquireFileExplorer("graphql-rename-file");
    try {
      const changeEvent = await lease.fileExplorer.renameFileOrFolder(targetPath, newName);
      return serializeChangeEvent(changeEvent);
    } finally {
      await lease.release();
    }
  }

  @Mutation(() => String)
  async createFileOrFolder(
    @Arg("workspaceId", () => String) workspaceId: string,
    @Arg("path", () => String) targetPath: string,
    @Arg("isFile", () => Boolean) isFile: boolean,
  ): Promise<string> {
    const workspace = await this.resolveWorkspace(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const lease = await workspace.acquireFileExplorer("graphql-create-file");
    try {
      const changeEvent = await lease.fileExplorer.addFileOrFolder(targetPath, isFile);
      return serializeChangeEvent(changeEvent);
    } finally {
      await lease.release();
    }
  }
}
