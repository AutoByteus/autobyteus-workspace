import type { EmbeddingModelDefinition } from "../catalog/embedding-model-definition.js";
import { EmbeddingDownloadCancelled, type DownloadProgress, type EmbeddingModelFiles } from "./embedding-model-files.js";

/** A model's files: absent, being downloaded, all present, or absent after the last attempt failed. */
export type EmbeddingModelFileState =
  | { state: "notDownloaded" }
  | { state: "downloading"; done: number; total: number }
  | { state: "downloaded" }
  | { state: "failed"; reason: string };

type Files = Pick<EmbeddingModelFiles, "ensure" | "remove" | "hasAllFiles">;
type Flight = {
  promise: Promise<string>;
  done: number;
  total: number;
  controller: AbortController;
  /** A download ahead can be cancelled; the active model's preparation cannot (it joins and pins the flight). */
  cancellable: boolean;
  cancelled: boolean;
  listeners: Set<DownloadProgress>;
};

const reasonOf = (error: unknown): string => error instanceof Error ? error.message : String(error);

/**
 * The one owner of model downloads (internal to the embedding layer): one flight per model, shared by a download
 * ahead and the active model's preparation, with its progress, the last failure reason and cancellation. A cancelled
 * download deletes the model's folder, so nothing of it is kept.
 */
export class EmbeddingModelDownloads {
  private readonly flights = new Map<string, Flight>();
  private readonly failures = new Map<string, string>();

  constructor(private readonly files: Files) {}

  /**
   * Makes the model's files present (joining a running flight). `cancellable: false` pins the flight: it can no longer
   * be cancelled. Rejects with the download's failure, or `EmbeddingDownloadCancelled`.
   */
  async ensure(definition: EmbeddingModelDefinition, options: { cancellable: boolean; onProgress?: DownloadProgress }): Promise<string> {
    let flight = this.flights.get(definition.id);
    if (flight?.cancelled) {
      // A cancelled flight is cleaning up; a new request starts afresh once it has.
      await flight.promise.catch(() => undefined);
      flight = this.flights.get(definition.id);
    }
    if (!flight) flight = this.startFlight(definition, options.cancellable);
    if (!options.cancellable) flight.cancellable = false;
    if (options.onProgress) {
      const listener = options.onProgress;
      flight.listeners.add(listener);
      // A listener that joins a running download hears the bytes that already arrived (none means only verifying).
      if (flight.done > 0) listener(flight.done, flight.total);
      void flight.promise.catch(() => undefined).finally(() => flight!.listeners.delete(listener));
    }
    return flight.promise;
  }

  /** Starts a download ahead in the background (its outcome shows in `fileState`). */
  start(definition: EmbeddingModelDefinition): void {
    void this.ensure(definition, { cancellable: true }).catch(() => undefined);
  }

  /** Cancels a cancellable flight; false when there is none (or it belongs to the active model's preparation). */
  cancel(modelId: string): boolean {
    const flight = this.flights.get(modelId);
    if (!flight || !flight.cancellable || flight.cancelled) return false;
    flight.cancelled = true;
    flight.controller.abort();
    return true;
  }

  /** The active model's preparation stopped needing this flight (a model switch): it becomes cancellable again. */
  release(modelId: string): void {
    const flight = this.flights.get(modelId);
    if (flight && !flight.cancelled) flight.cancellable = true;
  }

  isRunning(modelId: string): boolean {
    return this.flights.has(modelId);
  }

  progress(modelId: string): { done: number; total: number } | null {
    const flight = this.flights.get(modelId);
    return flight ? { done: flight.done, total: flight.total } : null;
  }

  fileState(definition: EmbeddingModelDefinition): EmbeddingModelFileState {
    const flight = this.flights.get(definition.id);
    if (flight) return { state: "downloading", done: flight.done, total: flight.total };
    if (this.files.hasAllFiles(definition)) return { state: "downloaded" };
    const reason = this.failures.get(definition.id);
    return reason ? { state: "failed", reason } : { state: "notDownloaded" };
  }

  /** Deletes a model's files; false while it downloads (the caller refuses then). */
  async remove(definition: EmbeddingModelDefinition): Promise<boolean> {
    if (this.flights.has(definition.id)) return false;
    this.failures.delete(definition.id);
    await this.files.remove(definition);
    return true;
  }

  private startFlight(definition: EmbeddingModelDefinition, cancellable: boolean): Flight {
    this.failures.delete(definition.id);
    const total = definition.files.reduce((sum, file) => sum + file.bytes, 0);
    const controller = new AbortController();
    const flight: Flight = { promise: Promise.resolve(""), done: 0, total, controller, cancellable, cancelled: false, listeners: new Set() };
    flight.promise = (async () => {
      try {
        return await this.files.ensure(definition, (done, all) => {
          flight.done = done;
          flight.total = all;
          for (const listener of flight.listeners) listener(done, all);
        }, controller.signal);
      } catch (error) {
        if (flight.cancelled) {
          await this.files.remove(definition).catch((removal: unknown) =>
            console.warn("EMBEDDING_CANCELLED_DOWNLOAD_CLEANUP_FAILED", { model: definition.id, error: reasonOf(removal) }));
          throw new EmbeddingDownloadCancelled();
        }
        this.failures.set(definition.id, reasonOf(error));
        throw error;
      } finally {
        this.flights.delete(definition.id);
      }
    })();
    this.flights.set(definition.id, flight);
    return flight;
  }
}
