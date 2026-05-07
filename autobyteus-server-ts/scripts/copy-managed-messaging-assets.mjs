import fs from "node:fs/promises";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");

const fileAssets = [
  {
    source: path.join(
      rootDir,
      "src",
      "managed-capabilities",
      "messaging-gateway",
      "release-manifest.json",
    ),
    target: path.join(
      rootDir,
      "dist",
      "managed-capabilities",
      "messaging-gateway",
      "release-manifest.json",
    ),
  },
];

const directoryAssets = [
  {
    source: path.join(rootDir, "src", "built-in-agents", "templates"),
    target: path.join(rootDir, "dist", "built-in-agents", "templates"),
  },
];

const copyFileAsset = async ({ source, target }) => {
  const content = await fs.readFile(source, "utf8");
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
};

const copyDirectoryAsset = async ({ source, target }) => {
  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.cp(source, target, { recursive: true });
};

const main = async () => {
  await Promise.all([
    ...fileAssets.map(copyFileAsset),
    ...directoryAssets.map(copyDirectoryAsset),
  ]);
};

main().catch((error) => {
  console.error("Failed to copy server runtime assets.", error);
  process.exitCode = 1;
});
