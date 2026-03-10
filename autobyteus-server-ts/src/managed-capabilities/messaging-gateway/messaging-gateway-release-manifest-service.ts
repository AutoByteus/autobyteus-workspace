import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ManagedMessagingReleaseDescriptor,
  ManagedMessagingReleaseManifest,
} from "./types.js";

const manifestDir = path.dirname(fileURLToPath(import.meta.url));
const defaultManifestPath = path.join(manifestDir, "release-manifest.json");
const srcManifestPath = path.resolve(
  manifestDir,
  "..",
  "..",
  "..",
  "src",
  "managed-capabilities",
  "messaging-gateway",
  "release-manifest.json",
);

export class MessagingGatewayReleaseManifestService {
  constructor(
    private readonly options: {
      manifestUrl?: string | null;
      manifestPath?: string | null;
      fetchImpl?: typeof fetch;
    } = {},
  ) {}

  async resolveArtifact(input: {
    serverVersion: string;
    platformKey?: string;
  }): Promise<ManagedMessagingReleaseDescriptor> {
    const manifest = await this.loadManifest();
    const platformKey = input.platformKey ?? "node-generic";
    const matched = manifest.releases.find(
      (release) =>
        release.serverVersion === input.serverVersion &&
        release.platformKey === platformKey,
    );
    if (!matched) {
      throw new Error(
        `No managed messaging gateway release descriptor matches server version '${input.serverVersion}' and platform '${platformKey}'.`,
      );
    }
    return matched;
  }

  private async loadManifest(): Promise<ManagedMessagingReleaseManifest> {
    const explicitUrl = normalizeOptionalString(this.options.manifestUrl);
    if (explicitUrl) {
      return this.loadManifestFromUrl(explicitUrl);
    }

    const explicitPath = normalizeOptionalString(this.options.manifestPath);
    const filePath = explicitPath
      ? path.resolve(explicitPath)
      : resolveDefaultManifestPath();
    return this.loadManifestFromFile(filePath);
  }

  private async loadManifestFromFile(
    filePath: string,
  ): Promise<ManagedMessagingReleaseManifest> {
    const raw = await fsp.readFile(filePath, "utf8");
    return parseManifest(raw, `file:${filePath}`);
  }

  private async loadManifestFromUrl(
    url: string,
  ): Promise<ManagedMessagingReleaseManifest> {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const response = await fetchImpl(url, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(
        `Managed messaging manifest download failed with HTTP ${response.status} ${response.statusText}.`,
      );
    }
    const raw = await response.text();
    return parseManifest(raw, url);
  }
}

const parseManifest = (
  raw: string,
  sourceLabel: string,
): ManagedMessagingReleaseManifest => {
  const parsed = JSON.parse(raw) as ManagedMessagingReleaseManifest;
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray(parsed.releases)
  ) {
    throw new Error(
      `Managed messaging manifest at '${sourceLabel}' is invalid.`,
    );
  }
  validateReleaseDescriptors(parsed, sourceLabel);
  return parsed;
};

const RELEASE_TAG_VERSION_PATTERN = /^v(?<version>\d+\.\d+\.\d+(?:[-.][0-9A-Za-z.]+)?)$/;

const validateReleaseDescriptors = (
  manifest: ManagedMessagingReleaseManifest,
  sourceLabel: string,
): void => {
  for (const release of manifest.releases) {
    const expectedVersion = getReleaseTagVersion(release.releaseTag);
    if (expectedVersion && release.artifactVersion !== expectedVersion) {
      throw new Error(
        `Managed messaging manifest at '${sourceLabel}' is invalid: release tag '${release.releaseTag}' expects artifact version '${expectedVersion}' but manifest declares '${release.artifactVersion}'.`,
      );
    }
  }
};

const getReleaseTagVersion = (releaseTag: string): string | null => {
  if (typeof releaseTag !== "string") {
    return null;
  }
  const match = RELEASE_TAG_VERSION_PATTERN.exec(releaseTag.trim());
  return match?.groups?.version ?? null;
};

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const resolveDefaultManifestPath = (): string => {
  if (fs.existsSync(defaultManifestPath)) {
    return defaultManifestPath;
  }

  if (fs.existsSync(srcManifestPath)) {
    return srcManifestPath;
  }

  return defaultManifestPath;
};
