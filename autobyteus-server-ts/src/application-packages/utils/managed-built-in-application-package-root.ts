import path from "node:path";

export const getManagedBuiltInApplicationPackageRoot = (
  appDataDir: string,
): string => path.resolve(appDataDir, "application-packages", "platform");
