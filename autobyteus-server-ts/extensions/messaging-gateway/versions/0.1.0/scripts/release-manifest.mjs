import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const gatewayRoot = path.resolve(scriptDir, "..");
const workspaceRoot = path.resolve(gatewayRoot, "..");
const serverPackageJsonPath = path.join(
  workspaceRoot,
  "autobyteus-server-ts",
  "package.json",
);
const desktopPackageJsonPath = path.join(
  workspaceRoot,
  "autobyteus-web",
  "package.json",
);
export const defaultReleaseManifestPath = path.join(
  workspaceRoot,
  "autobyteus-server-ts",
  "src",
  "managed-capabilities",
  "messaging-gateway",
  "release-manifest.json",
);

const defaultRepositorySlug =
  process.env.GITHUB_REPOSITORY ?? "AutoByteus/autobyteus-workspace";

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function normalizeReleaseTag(value) {
  if (typeof value !== "string") {
    throw new Error("Release tag must be a string.");
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error("Release tag cannot be empty.");
  }
  return normalized.startsWith("v") ? normalized : `v${normalized}`;
}

export function serializeManifest(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function sanitizePackageName(name) {
  return name.replace(/^@/, "").replace(/[\\/]/g, "-");
}

export async function resolveReleaseMetadata(options = {}) {
  const [serverManifest, desktopManifest] = await Promise.all([
    readJson(serverPackageJsonPath),
    readJson(desktopPackageJsonPath),
  ]);

  if (!serverManifest.version) {
    throw new Error("autobyteus-server-ts package version is missing.");
  }
  if (!desktopManifest.version) {
    throw new Error("autobyteus-web package version is missing.");
  }

  return {
    serverVersion: serverManifest.version,
    releaseTag: normalizeReleaseTag(options.releaseTag ?? `v${desktopManifest.version}`),
    repositorySlug: defaultRepositorySlug,
  };
}

export function buildArchiveFileName(sourceManifest) {
  return `${sanitizePackageName(sourceManifest.name)}-${sourceManifest.version}-node-generic.tar.gz`;
}

export function buildReleaseManifest(input) {
  const releaseAssetBaseUrl = `https://github.com/${input.repositorySlug}/releases/download/${input.releaseTag}`;
  return {
    schemaVersion: 1,
    releases: [
      {
        serverVersion: input.serverVersion,
        releaseTag: input.releaseTag,
        artifactVersion: input.gatewayManifest.version,
        platformKey: "node-generic",
        archiveType: "tar.gz",
        downloadUrl: `${releaseAssetBaseUrl}/${input.archiveFileName}`,
        sha256Url: `${releaseAssetBaseUrl}/${input.archiveFileName}.sha256`,
        metadataUrl: `${releaseAssetBaseUrl}/${input.archiveFileName}.json`,
        supportedProviders: ["WHATSAPP", "WECOM", "DISCORD", "TELEGRAM"],
        excludedProviders: ["WECHAT"],
      },
    ],
  };
}

export async function syncDefaultReleaseManifest(input) {
  const manifest = buildReleaseManifest(input);
  await writeFile(defaultReleaseManifestPath, serializeManifest(manifest), "utf8");
  return manifest;
}

export async function checkDefaultReleaseManifest(input) {
  const expected = serializeManifest(buildReleaseManifest(input));
  let actual;
  try {
    actual = await readFile(defaultReleaseManifestPath, "utf8");
  } catch {
    throw new Error(
      `Managed messaging release manifest is missing: ${defaultReleaseManifestPath}`,
    );
  }

  if (actual !== expected) {
    let actualReleaseTag = "unknown";
    try {
      const parsed = JSON.parse(actual);
      actualReleaseTag =
        parsed?.releases?.[0]?.releaseTag && typeof parsed.releases[0].releaseTag === "string"
          ? parsed.releases[0].releaseTag
          : "unknown";
    } catch {
      actualReleaseTag = "invalid-json";
    }
    throw new Error(
      `Managed messaging release manifest drift detected. Expected release tag '${input.releaseTag}' but checked-in manifest targets '${actualReleaseTag}'. Run: node autobyteus-message-gateway/scripts/build-runtime-package.mjs --sync-manifest-only --release-tag ${input.releaseTag}`,
    );
  }
}
