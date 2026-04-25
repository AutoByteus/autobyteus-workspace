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

const toPosixRelativeImportPath = (fromRelativePath, toRelativePath) => {
  const fromDirectory = path.posix.dirname(fromRelativePath);
  const relativePath = path.posix.relative(fromDirectory, toRelativePath);
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
};

const collectFiles = async (rootPath) => {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath));
      continue;
    }
    if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
};

const rewriteBrowserVendorImports = async (vendorRoot) => {
  const files = await collectFiles(vendorRoot);
  for (const filePath of files) {
    if (!filePath.endsWith(".js") && !filePath.endsWith(".d.ts")) {
      continue;
    }
    const content = await fs.readFile(filePath, "utf8");
    const rewrittenContent = rewriteImports(content, [
      [
        /@autobyteus\/application-sdk-contracts/g,
        "./application-sdk-contracts/index.js",
      ],
    ]);
    if (rewrittenContent !== content) {
      await fs.writeFile(filePath, rewrittenContent, "utf8");
    }
  }
};

const readModuleSpecifiers = (content) => {
  const specifiers = [];
  const moduleSpecifierPattern = /(?:import|export)\s+(?:[^"'`]*?\s+from\s+)?["']([^"']+)["']/g;
  for (const match of content.matchAll(moduleSpecifierPattern)) {
    specifiers.push(match[1]);
  }
  return specifiers;
};

const isBareBrowserSpecifier = (specifier) => {
  const normalized = specifier.trim();
  return (
    normalized.length > 0
    && !normalized.startsWith(".")
    && !normalized.startsWith("/")
    && !normalized.startsWith("http://")
    && !normalized.startsWith("https://")
    && !normalized.startsWith("data:")
  );
};

const assertBrowserModulesSelfContained = async (uiRoot) => {
  const files = await collectFiles(uiRoot);
  for (const filePath of files) {
    if (!filePath.endsWith(".js")) {
      continue;
    }
    const content = await fs.readFile(filePath, "utf8");
    const bareSpecifiers = readModuleSpecifiers(content).filter(isBareBrowserSpecifier);
    if (bareSpecifiers.length > 0) {
      throw new Error(
        `Browser UI module '${path.relative(uiRoot, filePath)}' contains unsupported bare module specifiers: ${bareSpecifiers.join(", ")}`,
      );
    }
  }
};

const assertRelativeModuleSpecifiersExist = async (entryFilePath) => {
  const content = await fs.readFile(entryFilePath, "utf8");
  const relativeSpecifiers = readModuleSpecifiers(content).filter((specifier) => specifier.startsWith("."));

  for (const specifier of relativeSpecifiers) {
    const resolvedPath = path.resolve(path.dirname(entryFilePath), specifier);
    try {
      await fs.access(resolvedPath);
    } catch {
      throw new Error(
        `Backend vendor entry '${path.basename(entryFilePath)}' is missing required relative dependency '${specifier}'.`,
      );
    }
  }
};

const assertBackendModulesSelfContained = async (backendDistRoot) => {
  const files = await collectFiles(backendDistRoot);
  for (const filePath of files) {
    if (!filePath.endsWith(".js") && !filePath.endsWith(".mjs")) {
      continue;
    }
    await assertRelativeModuleSpecifiersExist(filePath);
  }
};

const syncBackendSdkVendor = async (vendorRoot) => {
  const backendSdkDistRoot = path.join(
    workspaceRoot,
    "autobyteus-application-backend-sdk",
    "dist",
  );

  await ensureDirectory(vendorRoot);
  const entries = await fs.readdir(backendSdkDistRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (!entry.name.endsWith(".js") && !entry.name.endsWith(".js.map")) {
      continue;
    }
    await copyFile(
      path.join(backendSdkDistRoot, entry.name),
      path.join(vendorRoot, entry.name),
    );
  }
  await copyFile(
    path.join(backendSdkDistRoot, "index.js"),
    path.join(vendorRoot, "application-backend-sdk.js"),
  );
  await assertRelativeModuleSpecifiersExist(path.join(vendorRoot, "application-backend-sdk.js"));
};

const syncFrontendSdkVendor = async (vendorRoot) => {
  const frontendSdkDistRoot = path.join(
    workspaceRoot,
    "autobyteus-application-frontend-sdk",
    "dist",
  );
  const contractsDistRoot = path.join(
    workspaceRoot,
    "autobyteus-application-sdk-contracts",
    "dist",
  );

  await fs.rm(vendorRoot, { recursive: true, force: true });
  await copyTree(frontendSdkDistRoot, vendorRoot);
  await copyTree(
    contractsDistRoot,
    path.join(vendorRoot, "application-sdk-contracts"),
  );
  await copyFile(
    path.join(frontendSdkDistRoot, "index.js"),
    path.join(vendorRoot, "application-frontend-sdk.js"),
  );
  await rewriteBrowserVendorImports(vendorRoot);
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

  await assertBrowserModulesSelfContained(runtimeUiRoot);
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
    const targetRelativePath = relativePath === "index.js"
      ? "entry.mjs"
      : relativePath.split(path.sep).join(path.posix.sep);
    const backendSdkImportPath = toPosixRelativeImportPath(
      targetRelativePath,
      "vendor/application-backend-sdk.js",
    );
    const content = await fs.readFile(sourcePath, "utf8");
    await writeTextFile(
      targetPath,
      rewriteImports(content, [
        [
          /from ["']@autobyteus\/application-backend-sdk["']/g,
          `from "${backendSdkImportPath}"`,
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
      frontendSdkContractVersion: "3",
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
  await syncBackendSdkVendor(path.join(runtimeBackendRoot, "dist", "vendor"));
  await assertBackendModulesSelfContained(path.join(runtimeBackendRoot, "dist"));
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
