import { Arg, Mutation, Query, Resolver } from "type-graphql";
import { getWorkspaceManager } from "../../../workspaces/workspace-manager.js";
import { serializeChangeEvent } from "../../../file-explorer/file-system-changes.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
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

  @Query(() => String)
  async fileContent(
    @Arg("workspaceId", () => String) workspaceId: string,
    @Arg("filePath", () => String) filePath: string,
  ): Promise<string> {
    try {
      let workspace;
      try {
        workspace = await this.workspaceManager.getOrCreateWorkspace(workspaceId);
      } catch {
        return jsonError("Workspace not found");
      }

      const fileExplorer = await workspace.getFileExplorer();
      return await fileExplorer.readFileContent(filePath);
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
    }
  }

  @Query(() => [String])
  async searchFiles(
    @Arg("workspaceId", () => String) workspaceId: string,
    @Arg("query", () => String) query: string,
  ): Promise<string[]> {
    try {
      let workspace;
      try {
        workspace = await this.workspaceManager.getOrCreateWorkspace(workspaceId);
      } catch {
        return [];
      }

      if (typeof (workspace as { searchFiles?: (value: string) => Promise<string[]> }).searchFiles !== "function") {
        return [];
      }

      return await workspace.searchFiles(query);
    } catch (error) {
      logger.error(`Error searching files: ${toMessage(error)}`);
      return [];
    }
  }

  @Query(() => String)
  async folderChildren(
    @Arg("workspaceId", () => String) workspaceId: string,
    @Arg("folderPath", () => String) folderPath: string,
  ): Promise<string> {
    try {
      let workspace;
      try {
        workspace = await this.workspaceManager.getOrCreateWorkspace(workspaceId);
      } catch {
        return jsonError("Workspace not found");
      }

      const fileExplorer = await workspace.getFileExplorer();

      const ensureFullTree = async () => {
        await fileExplorer.buildWorkspaceDirectoryTree();
        return fileExplorer.getTree();
      };

      let tree = fileExplorer.getTree();
      if (!tree) {
        tree = await ensureFullTree();
      }

      let folderNode = tree?.findNodeByPath(folderPath) ?? null;
      if (!folderNode || (folderNode.childrenLoaded === false && folderNode.children.length === 0)) {
        tree = await ensureFullTree();
        folderNode = tree?.findNodeByPath(folderPath) ?? null;
      }

      if (!folderNode) {
        return jsonError(`Folder not found: ${folderPath}`);
      }

      if (folderNode.isFile) {
        return jsonError(`Path is a file, not a folder: ${folderPath}`);
      }

      return JSON.stringify(folderNode.toShallowDict(1));
    } catch (error) {
      logger.error(`Error fetching folder children: ${toMessage(error)}`);
      return jsonError("An unexpected error occurred while fetching folder children");
    }
  }

  @Mutation(() => String)
  async writeFileContent(
    @Arg("workspaceId", () => String) workspaceId: string,
    @Arg("filePath", () => String) filePath: string,
    @Arg("content", () => String) content: string,
  ): Promise<string> {
    const workspace = this.workspaceManager.getWorkspaceById(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const fileExplorer = await workspace.getFileExplorer();
    const changeEvent = await fileExplorer.writeFileContent(filePath, content);
    return serializeChangeEvent(changeEvent);
  }

  @Mutation(() => String)
  async deleteFileOrFolder(
    @Arg("workspaceId", () => String) workspaceId: string,
    @Arg("path", () => String) targetPath: string,
  ): Promise<string> {
    const workspace = this.workspaceManager.getWorkspaceById(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const fileExplorer = await workspace.getFileExplorer();
    const changeEvent = await fileExplorer.removeFileOrFolder(targetPath);
    return serializeChangeEvent(changeEvent);
  }

  @Mutation(() => String)
  async moveFileOrFolder(
    @Arg("workspaceId", () => String) workspaceId: string,
    @Arg("sourcePath", () => String) sourcePath: string,
    @Arg("destinationPath", () => String) destinationPath: string,
  ): Promise<string> {
    const workspace = this.workspaceManager.getWorkspaceById(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const fileExplorer = await workspace.getFileExplorer();
    const changeEvent = await fileExplorer.moveFileOrFolder(sourcePath, destinationPath);
    return serializeChangeEvent(changeEvent);
  }

  @Mutation(() => String)
  async renameFileOrFolder(
    @Arg("workspaceId", () => String) workspaceId: string,
    @Arg("targetPath", () => String) targetPath: string,
    @Arg("newName", () => String) newName: string,
  ): Promise<string> {
    const workspace = this.workspaceManager.getWorkspaceById(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const fileExplorer = await workspace.getFileExplorer();
    const changeEvent = await fileExplorer.renameFileOrFolder(targetPath, newName);
    return serializeChangeEvent(changeEvent);
  }

  @Mutation(() => String)
  async createFileOrFolder(
    @Arg("workspaceId", () => String) workspaceId: string,
    @Arg("path", () => String) targetPath: string,
    @Arg("isFile", () => Boolean) isFile: boolean,
  ): Promise<string> {
    const workspace = this.workspaceManager.getWorkspaceById(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const fileExplorer = await workspace.getFileExplorer();
    const changeEvent = await fileExplorer.addFileOrFolder(targetPath, isFile);
    return serializeChangeEvent(changeEvent);
  }
}
