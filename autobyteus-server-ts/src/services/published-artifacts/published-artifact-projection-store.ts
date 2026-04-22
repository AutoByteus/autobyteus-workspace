import fs from "node:fs/promises";
import path from "node:path";
import {
  EMPTY_PUBLISHED_ARTIFACT_PROJECTION,
  normalizePublishedArtifactPath,
  normalizePublishedArtifactType,
  type PublishedArtifactProjection,
} from "./published-artifact-types.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const canonicalProjectionPathForMemoryDir = (memoryDir: string): string =>
  path.join(path.resolve(memoryDir), "published_artifacts.json");

const isMissingFileError = (error: unknown): boolean =>
  typeof error === "object"
  && error !== null
  && "code" in error
  && (error as { code?: unknown }).code === "ENOENT";

const normalizeProjection = (
  projection: PublishedArtifactProjection | null | undefined,
): PublishedArtifactProjection => ({
  version: 1,
  summaries: Array.isArray(projection?.summaries)
    ? projection.summaries.map((summary) => ({
        ...summary,
        path: normalizePublishedArtifactPath(summary.path),
        type: normalizePublishedArtifactType(summary.type),
        status: "available",
        description: summary.description ?? null,
      }))
    : [],
  revisions: Array.isArray(projection?.revisions)
    ? projection.revisions.map((revision) => ({
        ...revision,
        path: normalizePublishedArtifactPath(revision.path),
        type: normalizePublishedArtifactType(revision.type),
        description: revision.description ?? null,
      }))
    : [],
});

export class PublishedArtifactProjectionStore {
  async readProjection(memoryDir: string): Promise<PublishedArtifactProjection> {
    const projectionPath = canonicalProjectionPathForMemoryDir(memoryDir);
    try {
      const raw = await fs.readFile(projectionPath, "utf-8");
      return normalizeProjection(JSON.parse(raw) as PublishedArtifactProjection);
    } catch (error) {
      if (!isMissingFileError(error)) {
        logger.warn(
          `PublishedArtifactProjectionStore: failed reading projection '${projectionPath}': ${String(error)}`,
        );
      }
      return normalizeProjection(EMPTY_PUBLISHED_ARTIFACT_PROJECTION);
    }
  }

  async writeProjection(memoryDir: string, projection: PublishedArtifactProjection): Promise<void> {
    const projectionPath = canonicalProjectionPathForMemoryDir(memoryDir);
    await fs.mkdir(path.dirname(projectionPath), { recursive: true });
    await fs.writeFile(
      projectionPath,
      JSON.stringify(normalizeProjection(projection), null, 2),
      "utf-8",
    );
  }
}

let cachedPublishedArtifactProjectionStore: PublishedArtifactProjectionStore | null = null;

export const getPublishedArtifactProjectionStore = (): PublishedArtifactProjectionStore => {
  if (!cachedPublishedArtifactProjectionStore) {
    cachedPublishedArtifactProjectionStore = new PublishedArtifactProjectionStore();
  }
  return cachedPublishedArtifactProjectionStore;
};
