import fs from "node:fs/promises";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const sourceManifest = path.join(
  rootDir,
  "src",
  "managed-capabilities",
  "messaging-gateway",
  "release-manifest.json",
);

const targetDirs = [
  path.join(rootDir, "dist", "managed-capabilities", "messaging-gateway"),
  path.join(rootDir, "dist-file", "managed-capabilities", "messaging-gateway"),
];

const main = async () => {
  const manifest = await fs.readFile(sourceManifest, "utf8");

  await Promise.all(
    targetDirs.map(async (targetDir) => {
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(
        path.join(targetDir, "release-manifest.json"),
        manifest,
        "utf8",
      );
    }),
  );
};

main().catch((error) => {
  console.error("Failed to copy managed messaging assets.", error);
  process.exitCode = 1;
});
