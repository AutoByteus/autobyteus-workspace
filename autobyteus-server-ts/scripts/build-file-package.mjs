import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const packageJsonPath = path.join(projectRoot, "package.json");
const distDir = path.join(projectRoot, "dist");
const outputPath = path.join(distDir, "package.file.json");

const prismaPackages = new Set(["@prisma/client", "repository_prisma", "prisma"]);

const omitPrismaDeps = (deps) => {
  if (!deps || typeof deps !== "object") {
    return deps;
  }
  const next = { ...deps };
  for (const key of prismaPackages) {
    delete next[key];
  }
  return next;
};

const run = async () => {
  const raw = await fs.readFile(packageJsonPath, "utf-8");
  const source = JSON.parse(raw);

  const fileProfilePackage = {
    ...source,
    scripts: {
      ...(source.scripts ?? {}),
      build: "pnpm run build:file",
    },
    dependencies: omitPrismaDeps(source.dependencies),
    devDependencies: omitPrismaDeps(source.devDependencies),
  };

  await fs.mkdir(distDir, { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(fileProfilePackage, null, 2)}\n`, "utf-8");
  console.info(`Wrote file-profile package manifest: ${outputPath}`);
};

run().catch((error) => {
  console.error(`Failed to build file-profile package manifest: ${String(error)}`);
  process.exit(1);
});
