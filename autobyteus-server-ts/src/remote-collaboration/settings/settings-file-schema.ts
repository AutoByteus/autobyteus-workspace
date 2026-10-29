import path from "node:path";

/** Where this node keeps its remote collaboration settings: `<data>/remote-collaboration/`. */
export type AppDataDirSource = Readonly<{ getAppDataDir(): string }>;

export const remoteCollaborationSettingsPath = (config: AppDataDirSource, fileName: string): string =>
  path.join(config.getAppDataDir(), "remote-collaboration", fileName);
