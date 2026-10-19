import { createHash } from "node:crypto";
import { createReadStream, statSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { EmbeddingModelDefinition, EmbeddingModelFile } from "../catalog/embedding-model-definition.js";

export type DownloadProgress = (done: number, total: number) => void;
type Fetch = (url: string, init: { signal: AbortSignal }) => Promise<Response>;

/** A download that receives nothing for this long is abandoned; there is no limit on its total duration. */
const IDLE_TIMEOUT_MS = 60_000;
const DEFAULT_BASE_URL = "https://huggingface.co";

const sha256Of = async (file: string): Promise<string> => {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk as Buffer);
  return hash.digest("hex");
};

/** Thrown when a download was cancelled through its abort signal. */
export class EmbeddingDownloadCancelled extends Error {
  constructor() {
    super("The download was cancelled.");
    this.name = "EmbeddingDownloadCancelled";
  }
}

/**
 * The local copies of catalog models, one folder per model under `<root>/<modelId>/`. A model is ready when every
 * catalog file is present with its pinned size and SHA-256; missing or wrong files are downloaded to `<file>.part`,
 * verified while streaming, then renamed into place. A download can be aborted through a signal: the `.part` file is
 * deleted and nothing unverified is renamed. Folders stay until `remove` (a leftover `.part` from an interrupted
 * process counts on disk until the next download overwrites it or `remove` deletes it). One download per model at a
 * time (a guard; `EmbeddingModelDownloads` owns the download flights).
 */
export class EmbeddingModelFiles {
  private readonly inflight = new Map<string, Promise<string>>();

  constructor(
    private readonly rootDir: string,
    private readonly options: { fetch?: Fetch; baseUrl?: string; idleTimeoutMs?: number } = {},
  ) {}

  modelDir(definition: Pick<EmbeddingModelDefinition, "id">): string {
    return path.join(this.rootDir, definition.id);
  }

  /** Whether every file is present with its pinned size (a cheap check; `ensure` still verifies the checksums). */
  hasAllFiles(definition: EmbeddingModelDefinition): boolean {
    const dir = this.modelDir(definition);
    return definition.files.every((file) => {
      try {
        return statSync(path.join(dir, file.path)).size === file.bytes;
      } catch {
        return false;
      }
    });
  }

  /**
   * Makes the model's files present and verified; resolves to its folder. Progress counts bytes and is reported only
   * while something is downloaded (files already present are verified silently).
   */
  ensure(definition: EmbeddingModelDefinition, onProgress: DownloadProgress = () => undefined, signal?: AbortSignal): Promise<string> {
    let pending = this.inflight.get(definition.id);
    if (!pending) {
      pending = this.ensureFiles(definition, onProgress, signal).finally(() => this.inflight.delete(definition.id));
      this.inflight.set(definition.id, pending);
    }
    return pending;
  }

  /** Deletes the model's folder (its verified files and any leftover `.part`). */
  async remove(definition: Pick<EmbeddingModelDefinition, "id">): Promise<void> {
    await fs.rm(this.modelDir(definition), { recursive: true, force: true });
  }

  /** Removes the model's folder when it holds no file (e.g. after a failed first download); otherwise keeps it. */
  async removeIfEmpty(definition: Pick<EmbeddingModelDefinition, "id">): Promise<void> {
    const dir = this.modelDir(definition);
    const entries = await fs.readdir(dir, { recursive: true, withFileTypes: true }).catch(() => null);
    if (entries && !entries.some((entry) => entry.isFile())) await fs.rm(dir, { recursive: true, force: true });
  }

  /** Bytes of every file under the models folder, including partial downloads. */
  async diskUsage(): Promise<number> {
    const entries = await fs.readdir(this.rootDir, { recursive: true, withFileTypes: true }).catch(() => []);
    const sizes = await Promise.all(entries.filter((entry) => entry.isFile())
      .map((entry) => fs.stat(path.join(entry.parentPath, entry.name)).then((stat) => stat.size, () => 0)));
    return sizes.reduce((sum, size) => sum + size, 0);
  }

  private async ensureFiles(definition: EmbeddingModelDefinition, onProgress: DownloadProgress, signal?: AbortSignal): Promise<string> {
    const dir = this.modelDir(definition);
    const total = definition.files.reduce((sum, file) => sum + file.bytes, 0);
    let done = 0;
    for (const file of definition.files) {
      if (signal?.aborted) throw new EmbeddingDownloadCancelled();
      const target = path.join(dir, file.path);
      if (!(await this.isVerified(target, file))) {
        await this.download(definition, file, target, (bytes) => onProgress(done + bytes, total), signal);
        onProgress(done + file.bytes, total);
      }
      done += file.bytes;
    }
    return dir;
  }

  private async isVerified(target: string, file: EmbeddingModelFile): Promise<boolean> {
    const stat = await fs.stat(target).catch(() => null);
    return Boolean(stat?.isFile() && stat.size === file.bytes && await sha256Of(target) === file.sha256);
  }

  private async download(definition: EmbeddingModelDefinition, file: EmbeddingModelFile, target: string, onBytes: (bytes: number) => void,
    signal?: AbortSignal): Promise<void> {
    const { repo, revision } = definition.source;
    const url = `${this.options.baseUrl ?? DEFAULT_BASE_URL}/${repo}/resolve/${revision}/${file.path}`;
    const host = new URL(url).host;
    const partial = `${target}.part`;
    await fs.mkdir(path.dirname(target), { recursive: true });
    const controller = new AbortController();
    const cancel = () => controller.abort(new EmbeddingDownloadCancelled());
    signal?.addEventListener("abort", cancel, { once: true });
    // A cancel that landed before the listener was added would never fire it: honour it now, before fetching.
    if (signal?.aborted) cancel();
    let idle: ReturnType<typeof setTimeout> | undefined;
    const touch = () => {
      clearTimeout(idle);
      idle = setTimeout(() => controller.abort(new Error(`No data from ${host} for ${Math.round((this.options.idleTimeoutMs ?? IDLE_TIMEOUT_MS) / 1000)} s.`)),
        this.options.idleTimeoutMs ?? IDLE_TIMEOUT_MS);
    };
    try {
      touch();
      const response = await (this.options.fetch ?? fetch)(url, { signal: controller.signal })
        .catch((error: unknown) => { throw new Error(`Could not reach ${host} to download the model: ${(error as Error).message}`); });
      if (!response.ok || !response.body) throw new Error(`Downloading ${file.path} from ${host} failed (HTTP ${response.status}).`);
      const hash = createHash("sha256");
      const handle = await fs.open(partial, "w");
      let bytes = 0;
      try {
        for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
          touch();
          hash.update(chunk);
          await handle.write(chunk);
          bytes += chunk.byteLength;
          onBytes(bytes);
        }
      } finally {
        await handle.close();
      }
      if (bytes !== file.bytes || hash.digest("hex") !== file.sha256) {
        throw new Error(`The downloaded ${file.path} does not match the expected file (size or checksum).`);
      }
      // A cancel that arrives after the last byte still wins: nothing is renamed into place.
      if (signal?.aborted) throw new EmbeddingDownloadCancelled();
      await fs.rename(partial, target);
    } catch (error) {
      await fs.rm(partial, { force: true });
      throw controller.signal.aborted && controller.signal.reason instanceof Error ? controller.signal.reason : error;
    } finally {
      clearTimeout(idle);
      signal?.removeEventListener("abort", cancel);
    }
  }
}
