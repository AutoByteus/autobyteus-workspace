import fs from "node:fs/promises";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";

export const resolveExternalChannelStorageDir = (): string =>
  path.join(appConfigProvider.config.getAppDataDir(), "external-channel");

export const resolveExternalChannelStoragePath = (...segments: string[]): string =>
  path.join(resolveExternalChannelStorageDir(), ...segments);

export const prepareExternalChannelStorage = async (filePath: string): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
};
