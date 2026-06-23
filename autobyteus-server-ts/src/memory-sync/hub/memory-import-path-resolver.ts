import { appConfigProvider } from "../../config/app-config-provider.js";
import { getLocalFileMemoryImportStore } from "./local-file-memory-import-store.js";

export type MemoryImportPathResolution = {
  sourceNodeId: string;
  importRootDir: string;
};

export const resolveMemoryImportRootDir = (sourceNodeId: string): string =>
  getLocalFileMemoryImportStore().getImportRootDir(sourceNodeId);

export const getLocalMemoryRootDir = (): string => appConfigProvider.config.getMemoryDir();
