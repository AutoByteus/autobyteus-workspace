import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startGateway } from "./bootstrap/start-gateway.js";

export async function main(): Promise<void> {
  await startGateway();
}

const isExecutedDirectly = (): boolean => {
  const entryArg = process.argv[1];
  if (!entryArg) {
    return false;
  }
  try {
    return (
      realpathSync(fileURLToPath(import.meta.url)) ===
      realpathSync(path.resolve(entryArg))
    );
  } catch {
    return fileURLToPath(import.meta.url) === path.resolve(entryArg);
  }
};

if (isExecutedDirectly()) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
