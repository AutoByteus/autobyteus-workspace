import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { readJsonFile, updateJsonFile } from "../../persistence/file/store-utils.js";

/** `remote-access/allowed-local-networks.json`: the local networks the owner allowed phones on. */
type AllowedLocalNetworksFile = {
  networkIds: string[];
};

type AppConfigLike = {
  getAppDataDir(): string;
};

const readNetworkIds = (file: Partial<AllowedLocalNetworksFile> | null | undefined): string[] =>
  Array.isArray(file?.networkIds) ? file.networkIds.filter((id): id is string => typeof id === "string") : [];

export class AllowedLocalNetworkStore {
  constructor(private readonly config: AppConfigLike = { getAppDataDir: () => appConfigProvider.config.getAppDataDir() }) {}

  getFilePath(): string {
    return path.join(this.config.getAppDataDir(), "remote-access", "allowed-local-networks.json");
  }

  async isAllowed(networkId: string): Promise<boolean> {
    const file = await readJsonFile<AllowedLocalNetworksFile>(this.getFilePath(), { networkIds: [] });
    return readNetworkIds(file).includes(networkId);
  }

  async setAllowed(networkId: string, allowed: boolean): Promise<void> {
    await updateJsonFile<AllowedLocalNetworksFile>(this.getFilePath(), { networkIds: [] }, (file) => {
      const others = readNetworkIds(file).filter((id) => id !== networkId);
      return { networkIds: allowed ? [...others, networkId] : others };
    });
  }
}

let singleton: AllowedLocalNetworkStore | null = null;

export const getAllowedLocalNetworkStore = (): AllowedLocalNetworkStore => {
  singleton ??= new AllowedLocalNetworkStore();
  return singleton;
};
