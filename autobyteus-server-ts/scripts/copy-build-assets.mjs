import fs from "node:fs/promises";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");

const directoryAssets = [
  {
    source: path.join(rootDir, "src", "built-in-agents", "templates"),
    target: path.join(rootDir, "dist", "built-in-agents", "templates"),
  },
];

const copyDirectoryAsset = async ({ source, target }) => {
  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.cp(source, target, { recursive: true });
};

const main = async () => {
  await Promise.all(directoryAssets.map(copyDirectoryAsset));
};

main().catch((error) => {
  console.error("Failed to copy server runtime assets.", error);
  process.exitCode = 1;
});
