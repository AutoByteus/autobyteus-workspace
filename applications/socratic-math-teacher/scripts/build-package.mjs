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
const runtimeUiRoot = path.join(applicationRoot, "ui");
const distPackageRoot = path.join(applicationRoot, "dist", "importable-package");
const distApplicationRoot = path.join(distPackageRoot, "applications", "socratic-math-teacher");

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

const copyTreeIfExists = async (sourcePath, targetPath) => {
  try {
    await fs.access(sourcePath);
  } catch {
    return;
  }
  await copyTree(sourcePath, targetPath);
};

const rewriteImports = (content, replacements) =>
  replacements.reduce(
    (nextContent, [pattern, replacement]) => nextContent.replace(pattern, replacement),
    content,
  );

const syncFrontendSdkVendor = async (vendorRoot) => {
  const frontendSdkDistRoot = path.join(
    workspaceRoot,
    "autobyteus-application-frontend-sdk",
    "dist",
  );

  await fs.rm(vendorRoot, { recursive: true, force: true });
  await copyTree(frontendSdkDistRoot, vendorRoot);
  await copyFile(
    path.join(frontendSdkDistRoot, "index.js"),
    path.join(vendorRoot, "application-frontend-sdk.js"),
  );
};

const refreshRuntimeUiAssets = async () => {
  await syncFrontendSdkVendor(path.join(runtimeUiRoot, "vendor"));

  const sourceFrontendRoot = path.join(applicationRoot, "frontend-src");
  const entries = await fs.readdir(sourceFrontendRoot, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceFrontendRoot, entry.name);
    const targetPath = path.join(runtimeUiRoot, entry.name);
    if (entry.isDirectory()) {
      await fs.rm(targetPath, { recursive: true, force: true });
      await copyTree(sourcePath, targetPath);
      continue;
    }
    if (entry.isFile()) {
      await copyFile(sourcePath, targetPath);
    }
  }
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
      backendDefinitionContractVersion: "2",
      frontendSdkContractVersion: "2",
    },
    supportedExposures: {
      queries: false,
      commands: false,
      routes: false,
      graphql: true,
      notifications: true,
      eventHandlers: true,
    },
    migrationsDir: "backend/migrations",
  };

  await writeTextFile(
    path.join(targetApplicationRoot, "backend", "bundle.json"),
    `${JSON.stringify(manifest, null, 2)}
`,
  );
};

const writePackageReadme = async () => {
  await writeTextFile(
    path.join(distPackageRoot, "README.md"),
    [
      "# Socratic Math Teacher importable package",
      "",
      "Generated from `applications/socratic-math-teacher`. Import this package root into AutoByteus:",
      "",
      "- `applications/socratic-math-teacher/dist/importable-package`",
      "",
    ].join("\n"),
  );
};

const writeDistApplicationReadme = async () => {
  await writeTextFile(
    path.join(distApplicationRoot, "README.md"),
    [
      "# Socratic Math Teacher packaging mirror",
      "",
      "This directory is the generated packaging-only mirror for the repo-local app root:",
      "",
      "- `applications/socratic-math-teacher/`",
      "",
      "Use this nested application root only when the parent package root is explicitly selected for import/provisioning.",
      "Repo-local discovery should continue to use the direct child root under `applications/`.",
      "",
    ].join("\n"),
  );
};

const copyRunnableRootToPackagingMirror = async () => {
  await copyFile(path.join(applicationRoot, "application.json"), path.join(distApplicationRoot, "application.json"));
  await copyFile(path.join(applicationRoot, "package.json"), path.join(distApplicationRoot, "package.json"));
  await copyFile(path.join(applicationRoot, "tsconfig.backend.json"), path.join(distApplicationRoot, "tsconfig.backend.json"));
  await copyTree(path.join(applicationRoot, "ui"), path.join(distApplicationRoot, "ui"));
  await copyTree(path.join(applicationRoot, "backend"), path.join(distApplicationRoot, "backend"));
  await copyTreeIfExists(path.join(applicationRoot, "api"), path.join(distApplicationRoot, "api"));
  await copyTreeIfExists(path.join(applicationRoot, "frontend-src"), path.join(distApplicationRoot, "frontend-src"));
  await copyTreeIfExists(path.join(applicationRoot, "backend-src"), path.join(distApplicationRoot, "backend-src"));
  await copyTreeIfExists(path.join(applicationRoot, "scripts"), path.join(distApplicationRoot, "scripts"));
  await copyTreeIfExists(path.join(applicationRoot, "agent-teams"), path.join(distApplicationRoot, "agent-teams"));
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

  console.log(`Socratic Math Teacher importable package generated at ${distPackageRoot}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
