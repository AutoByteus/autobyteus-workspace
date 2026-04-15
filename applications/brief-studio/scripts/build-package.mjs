import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const applicationRoot = path.resolve(scriptDir, "..");
const workspaceRoot = path.resolve(applicationRoot, "..", "..");
const buildBackendRoot = path.join(applicationRoot, ".build", "backend");
const runtimeBackendRoot = path.join(applicationRoot, "backend");
const distPackageRoot = path.join(applicationRoot, "dist", "importable-package");
const distApplicationRoot = path.join(distPackageRoot, "applications", "brief-studio");

const ensureDirectory = async (targetPath) => {
  await fs.mkdir(targetPath, { recursive: true });
};

const writeTextFile = async (targetPath, content) => {
  await ensureDirectory(path.dirname(targetPath));
  await fs.writeFile(targetPath, content, "utf8");
};

const copyFile = async (sourcePath, targetPath) => {
  await ensureDirectory(path.dirname(targetPath));
  await fs.copyFile(sourcePath, targetPath);
};

const copyTree = async (sourcePath, targetPath) => {
  await ensureDirectory(path.dirname(targetPath));
  await fs.cp(sourcePath, targetPath, { recursive: true });
};

const rewriteImports = (content, replacements) =>
  replacements.reduce(
    (nextContent, [pattern, replacement]) => nextContent.replace(pattern, replacement),
    content,
  );

const refreshRuntimeUiAssets = async () => {
  const uiRoot = path.join(applicationRoot, "ui");
  await copyFile(
    path.join(workspaceRoot, "autobyteus-application-frontend-sdk", "dist", "index.js"),
    path.join(uiRoot, "vendor", "application-frontend-sdk.js"),
  );
};

const copyCompiledBackend = async (sourceDir, targetRoot) => {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    if (entry.isDirectory()) {
      await copyCompiledBackend(sourcePath, targetRoot);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".js")) {
      continue;
    }

    const relativePath = path.relative(buildBackendRoot, sourcePath);
    const targetPath = relativePath === "index.js"
      ? path.join(targetRoot, "entry.mjs")
      : path.join(targetRoot, relativePath);
    const content = await fs.readFile(sourcePath, "utf8");
    await writeTextFile(
      targetPath,
      rewriteImports(content, [
        [
          /from ["']@autobyteus\/application-backend-sdk["']/g,
          'from "./vendor/application-backend-sdk.js"',
        ],
      ]),
    );
  }
};

const writeBackendBundleManifest = async (targetApplicationRoot) => {
  const manifest = {
    contractVersion: "1",
    entryModule: "backend/dist/entry.mjs",
    moduleFormat: "esm",
    distribution: "self-contained",
    targetRuntime: {
      engine: "node",
      semver: ">=22 <23",
    },
    sdkCompatibility: {
      backendDefinitionContractVersion: "1",
      frontendSdkContractVersion: "1",
    },
    supportedExposures: {
      queries: true,
      commands: true,
      routes: false,
      graphql: false,
      notifications: true,
      eventHandlers: true,
    },
    migrationsDir: "backend/migrations",
  };

  await writeTextFile(
    path.join(targetApplicationRoot, "backend", "bundle.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
};

const writePackageReadme = async () => {
  await writeTextFile(
    path.join(distPackageRoot, "README.md"),
    [
      "# Brief Studio importable package",
      "",
      "Generated from `applications/brief-studio`. Import this package root into AutoByteus:",
      "",
      "- `applications/brief-studio/dist/importable-package`",
      "",
    ].join("\n"),
  );
};

const writeDistApplicationReadme = async () => {
  await writeTextFile(
    path.join(distApplicationRoot, "README.md"),
    [
      "# Brief Studio packaging mirror",
      "",
      "This directory is the generated packaging-only mirror for the repo-local app root:",
      "",
      "- `applications/brief-studio/`",
      "",
      "Use this nested application root only when the parent package root is explicitly selected for import/provisioning.",
      "Repo-local discovery should continue to use the direct child root under `applications/`.",
      "",
    ].join("\n"),
  );
};

const copyRunnableRootToPackagingMirror = async () => {
  await copyFile(path.join(applicationRoot, "application.json"), path.join(distApplicationRoot, "application.json"));
  await copyTree(path.join(applicationRoot, "ui"), path.join(distApplicationRoot, "ui"));
  await copyTree(path.join(applicationRoot, "backend"), path.join(distApplicationRoot, "backend"));
  await copyTree(path.join(applicationRoot, "agents"), path.join(distApplicationRoot, "agents"));
  await copyTree(path.join(applicationRoot, "agent-teams"), path.join(distApplicationRoot, "agent-teams"));
  await writeDistApplicationReadme();
};

const main = async () => {
  await fs.rm(distPackageRoot, { recursive: true, force: true });
  await fs.rm(buildBackendRoot, { recursive: true, force: true });
  await fs.rm(runtimeBackendRoot, { recursive: true, force: true });

  await execFileAsync("pnpm", ["exec", "tsc", "-p", "tsconfig.backend.json"], {
    cwd: applicationRoot,
  });

  await refreshRuntimeUiAssets();
  await copyTree(
    path.join(applicationRoot, "backend-src", "migrations"),
    path.join(runtimeBackendRoot, "migrations"),
  );
  await copyCompiledBackend(buildBackendRoot, path.join(runtimeBackendRoot, "dist"));
  await copyFile(
    path.join(workspaceRoot, "autobyteus-application-backend-sdk", "dist", "index.js"),
    path.join(runtimeBackendRoot, "dist", "vendor", "application-backend-sdk.js"),
  );
  await writeBackendBundleManifest(applicationRoot);
  await copyRunnableRootToPackagingMirror();
  await writePackageReadme();
  await fs.rm(buildBackendRoot, { recursive: true, force: true });

  console.log(`Brief Studio importable package generated at ${distPackageRoot}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
