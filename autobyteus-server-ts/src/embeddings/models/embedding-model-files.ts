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

/**
 * The local copies of catalog models, one folder per model under `<root>/<modelId>/`. A model is ready when every
 * catalog file is present with its pinned size and SHA-256; missing or wrong files are downloaded to `<file>.part`,
 * verified while streaming, then renamed into place. One download per model at a time.
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
  ensure(definition: EmbeddingModelDefinition, onProgress: DownloadProgress = () => undefined): Promise<string> {
    let pending = this.inflight.get(definition.id);
    if (!pending) {
      pending = this.ensureFiles(definition, onProgress).finally(() => this.inflight.delete(definition.id));
      this.inflight.set(definition.id, pending);
    }
    return pending;
  }

  /** Removes the folders of every other model (after a model switch has completed). */
  async removeAllExcept(modelId: string): Promise<void> {
    const entries = await fs.readdir(this.rootDir, { withFileTypes: true }).catch(() => []);
    await Promise.all(entries.filter((entry) => entry.isDirectory() && entry.name !== modelId)
      .map((entry) => fs.rm(path.join(this.rootDir, entry.name), { recursive: true, force: true })));
  }

  private async ensureFiles(definition: EmbeddingModelDefinition, onProgress: DownloadProgress): Promise<string> {
    const dir = this.modelDir(definition);
    const total = definition.files.reduce((sum, file) => sum + file.bytes, 0);
    let done = 0;
    for (const file of definition.files) {
      const target = path.join(dir, file.path);
      if (!(await this.isVerified(target, file))) {
        await this.download(definition, file, target, (bytes) => onProgress(done + bytes, total));
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

  private async download(definition: EmbeddingModelDefinition, file: EmbeddingModelFile, target: string, onBytes: (bytes: number) => void): Promise<void> {
    const { repo, revision } = definition.source;
    const url = `${this.options.baseUrl ?? DEFAULT_BASE_URL}/${repo}/resolve/${revision}/${file.path}`;
    const host = new URL(url).host;
    const partial = `${target}.part`;
    await fs.mkdir(path.dirname(target), { recursive: true });
    const controller = new AbortController();
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
      await fs.rename(partial, target);
    } catch (error) {
      await fs.rm(partial, { force: true });
      throw controller.signal.aborted && controller.signal.reason instanceof Error ? controller.signal.reason : error;
    } finally {
      clearTimeout(idle);
    }
  }
}
