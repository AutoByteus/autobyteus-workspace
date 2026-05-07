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
  {
    source: path.join(
      rootDir,
      "src",
      "agent-execution",
      "compaction",
      "default-compactor-agent",
      "agent.md",
    ),
    target: path.join(
      rootDir,
      "dist",
      "agent-execution",
      "compaction",
      "default-compactor-agent",
      "agent.md",
    ),
  },
  {
    source: path.join(
      rootDir,
      "src",
      "agent-execution",
      "compaction",
      "default-compactor-agent",
      "agent-config.json",
    ),
    target: path.join(
      rootDir,
      "dist",
      "agent-execution",
      "compaction",
      "default-compactor-agent",
      "agent-config.json",
    ),
  },
  {
    source: path.join(
      rootDir,
      "src",
      "agent-definition",
      "default-agents",
      "super-assistant",
      "agent.md",
    ),
    target: path.join(
      rootDir,
      "dist",
      "agent-definition",
      "default-agents",
      "super-assistant",
      "agent.md",
    ),
  },
  {
    source: path.join(
      rootDir,
      "src",
      "agent-definition",
      "default-agents",
      "super-assistant",
      "agent-config.json",
    ),
    target: path.join(
      rootDir,
      "dist",
      "agent-definition",
      "default-agents",
      "super-assistant",
      "agent-config.json",
    ),
  },
];

const copyFileAsset = async ({ source, target }) => {
  const content = await fs.readFile(source, "utf8");
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
};

const main = async () => {
  await Promise.all(fileAssets.map(copyFileAsset));
};

main().catch((error) => {
  console.error("Failed to copy server runtime assets.", error);
  process.exitCode = 1;
});
