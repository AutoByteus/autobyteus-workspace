import fs from "node:fs";
import path from "node:path";
import { builtinModules } from "node:module";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), "..");
const distDir = path.join(projectRoot, "dist");
const packageJsonPath = path.join(projectRoot, "package.json");

if (!fs.existsSync(distDir)) {
  console.error(`[verify:runtime-deps] dist directory not found: ${distDir}`);
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const runtimeDeps = new Set([
  ...Object.keys(packageJson.dependencies || {}),
  ...Object.keys(packageJson.optionalDependencies || {}),
  ...Object.keys(packageJson.peerDependencies || {}),
]);

const builtins = new Set([...builtinModules, ...builtinModules.map((mod) => `node:${mod}`)]);
const importPattern =
  /\bimport\s+(?:[^'"()]*?\s+from\s+)?["']([^"']+)["']|\bexport\s+[^'"()]*?\s+from\s+["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)|\brequire\s*\(\s*["']([^"']+)["']\s*\)/g;

function collectJsFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsFiles(fullPath));
      continue;
    }
    if (entry.isFile() && fullPath.endsWith(".js")) {
      files.push(fullPath);
    }
  }
  return files;
}

function getPackageName(specifier) {
  if (specifier.startsWith("@")) {
    const [scope, name] = specifier.split("/");
    if (!scope || !name) return specifier;
    return `${scope}/${name}`;
  }
  return specifier.split("/")[0] || specifier;
}

const missing = new Map();

for (const filePath of collectJsFiles(distDir)) {
  const relPath = path.relative(projectRoot, filePath);
  const content = fs.readFileSync(filePath, "utf8");
  let match;
  while ((match = importPattern.exec(content)) !== null) {
    const rawSpecifier = match[1] || match[2] || match[3] || match[4];
    if (!rawSpecifier) continue;
    if (rawSpecifier.startsWith(".") || rawSpecifier.startsWith("/") || rawSpecifier.startsWith("file:")) {
      continue;
    }
    if (builtins.has(rawSpecifier)) continue;

    const packageName = getPackageName(rawSpecifier);
    if (builtins.has(packageName)) continue;
    if (runtimeDeps.has(packageName)) continue;

    const offenders = missing.get(packageName) || new Set();
    offenders.add(`${relPath} -> ${rawSpecifier}`);
    missing.set(packageName, offenders);
  }
}

if (missing.size > 0) {
  console.error("[verify:runtime-deps] Missing runtime dependencies in package.json:");
  for (const [packageName, offenders] of [...missing.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    console.error(`- ${packageName}`);
    for (const offender of [...offenders].sort()) {
      console.error(`  - ${offender}`);
    }
  }
  process.exit(1);
}

console.log("[verify:runtime-deps] OK");
