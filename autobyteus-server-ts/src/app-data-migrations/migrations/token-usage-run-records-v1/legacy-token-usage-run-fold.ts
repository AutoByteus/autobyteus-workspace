import type { TokenUsageRunRecord } from "../../../token-usage/domain/token-usage-run-record.js";
import {
  MAX_CUMULATIVE_SERIES_PER_RUN,
  MAX_RECENT_IDEMPOTENCY_DIGESTS,
  compareAdmissionMarkers,
  compareCheckpointRecency,
  digestTokenUsageIdentity,
  type AdmissionMarker,
  type RecentTokenUsageIdentityDigest,
  type SnapshotSeriesCheckpoint,
} from "../../../token-usage/domain/token-usage-snapshot-checkpoint.js";
import {
  applyTokenUsageContribution,
  createEmptyRunRecord,
} from "../../../token-usage/projections/token-usage-run-record-state.js";
import { normalizeTokenUsageQualityFlags } from "../../../token-usage/repositories/sql/token-usage-run-record-codec.js";
import {
  MAX_LEGACY_MISSING_PRICE_DIMENSIONS,
  legacyRowId,
  legacyRowToCurrentPayload,
  legacySourceTokens,
  type LegacyTokenUsageLedgerRow,
} from "./legacy-token-usage-row.js";

type IdentityCandidate = RecentTokenUsageIdentityDigest & { observedAt: string };

const orderIdentity = (left: IdentityCandidate, right: IdentityCandidate): number =>
  left.observedAt.localeCompare(right.observedAt) ||
  (left.ordinal < right.ordinal ? -1 : left.ordinal > right.ordinal ? 1 : left.digest.localeCompare(right.digest));

export class LegacyTokenUsageRunFold {
  private record: TokenUsageRunRecord | null = null;
  private checkpoints: SnapshotSeriesCheckpoint[] = [];
  private identities: IdentityCandidate[] = [];
  private compactedCheckpoints = false;

  add(row: LegacyTokenUsageLedgerRow): void {
    const payload = legacyRowToCurrentPayload(row);
    const marker: AdmissionMarker = {
      observedAt: payload.observed_at,
      generation: 0,
      ordinal: legacyRowId(row),
    };
    this.record ??= createEmptyRunRecord(payload, marker);
    this.record = applyTokenUsageContribution({
      record: this.record,
      payload,
      marker,
      incrementReport: true,
      incrementRevision: true,
    });
    if (this.record.pricingSummary.missingPriceDimensions.length > MAX_LEGACY_MISSING_PRICE_DIMENSIONS) {
      throw new Error("Legacy token usage merged missing-price dimensions exceed the target bound.");
    }
    this.addIdentity("event", payload.usage_event_id, marker);
    this.addIdentity("idempotency", payload.idempotency_key, marker);
    this.addCheckpoint(row, marker);
  }

  finish(): TokenUsageRunRecord {
    if (!this.record) throw new Error("Cannot finish an empty legacy token usage run fold.");
    const qualityFlags = this.compactedCheckpoints
      ? [...this.record.qualityFlags, "legacy_snapshot_checkpoints_compacted"]
      : this.record.qualityFlags;
    return {
      ...this.record,
      snapshotSeriesState: [...this.checkpoints].sort(compareCheckpointRecency),
      recentIdempotencyDigests: this.identities
        .sort(orderIdentity)
        .map(({ digest, generation, ordinal }) => ({ digest, generation, ordinal })),
      qualityFlags: normalizeTokenUsageQualityFlags(qualityFlags),
    };
  }

  private addIdentity(
    kind: "event" | "idempotency",
    value: string,
    marker: AdmissionMarker,
  ): void {
    const digest = digestTokenUsageIdentity(kind, value);
    const byDigest = new Map(this.identities.map((candidate) => [candidate.digest, candidate]));
    const existing = byDigest.get(digest);
    const candidate = { digest, generation: 0 as const, ordinal: marker.ordinal, observedAt: marker.observedAt };
    if (!existing || orderIdentity(existing, candidate) < 0) byDigest.set(digest, candidate);
    this.identities = [...byDigest.values()].sort(orderIdentity).slice(-MAX_RECENT_IDEMPOTENCY_DIGESTS);
  }

  private addCheckpoint(row: LegacyTokenUsageLedgerRow, marker: AdmissionMarker): void {
    if (row.usage_scope !== "cumulative_snapshot" || !row.snapshot_series_key?.trim()) return;
    const sourceTokens = legacySourceTokens(row);
    if (!sourceTokens) {
      if (this.record) {
        this.record = {
          ...this.record,
          qualityFlags: [...this.record.qualityFlags, "legacy_cumulative_checkpoint_unavailable"],
        };
      }
      return;
    }
    const seriesDigest = digestTokenUsageIdentity("series", row.snapshot_series_key);
    const incoming: SnapshotSeriesCheckpoint = { seriesDigest, sourceTokens, lastAdmission: marker };
    const existingIndex = this.checkpoints.findIndex((candidate) => candidate.seriesDigest === seriesDigest);
    if (existingIndex >= 0) {
      if (compareAdmissionMarkers(this.checkpoints[existingIndex]!.lastAdmission, marker) < 0) {
        this.checkpoints[existingIndex] = incoming;
      }
      return;
    }
    if (this.checkpoints.length < MAX_CUMULATIVE_SERIES_PER_RUN) {
      this.checkpoints.push(incoming);
      return;
    }
    this.compactedCheckpoints = true;
    const ordered = [...this.checkpoints, incoming].sort(compareCheckpointRecency);
    this.checkpoints = ordered.slice(-MAX_CUMULATIVE_SERIES_PER_RUN);
  }
}
