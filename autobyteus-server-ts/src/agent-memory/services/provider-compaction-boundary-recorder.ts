import type { AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import type { ProviderCompactionBoundaryPayload } from "../domain/memory-recording-models.js";
import type { RunMemoryWriter } from "../store/run-memory-writer.js";
import {
  asBoolean,
  asNumber,
  asRecord,
  asString,
  extractTimestamp,
  extractTurnId,
} from "./runtime-memory-event-payload.js";

export class ProviderCompactionBoundaryRecorder {
  private readonly seenBoundaryKeys = new Set<string>();

  constructor(
    private readonly input: {
      writer: RunMemoryWriter;
      resolveTurnId: (candidate: unknown) => string;
    },
  ) {}

  record(event: AgentRunEvent): void {
    const boundary = this.parseProviderCompactionBoundary(event.payload);
    if (!boundary || this.handleExistingBoundary(boundary)) {
      return;
    }
    const turnId = this.input.resolveTurnId(
      boundary.turn_id ?? extractTurnId(event.payload) ?? "provider-boundary",
    );
    const marker = this.input.writer.appendRawTrace({
      traceType: "provider_compaction_boundary",
      turnId,
      content: `Provider-owned context compaction boundary: ${boundary.provider}/${boundary.source_surface}`,
      sourceEvent: event.eventType,
      ts: boundary.provider_timestamp ?? extractTimestamp(event.payload),
      correlationId: boundary.boundary_key,
      toolResult: {
        provider: boundary.provider,
        runtime_kind: boundary.runtime_kind,
        boundary_key: boundary.boundary_key,
        provider_timestamp: boundary.provider_timestamp ?? null,
        trigger: boundary.trigger ?? null,
        status: boundary.status ?? null,
        pre_tokens: boundary.pre_tokens ?? null,
        rotation_eligible: boundary.rotation_eligible,
        semantic_compaction: false,
        source_surface: boundary.source_surface,
        provider_thread_id: boundary.provider_thread_id ?? null,
        provider_session_id: boundary.provider_session_id ?? null,
        provider_event_id: boundary.provider_event_id ?? null,
        provider_response_id: boundary.provider_response_id ?? null,
      },
    });
    if (boundary.rotation_eligible) {
      this.input.writer.rotateActiveRawTracesBeforeBoundary({
        boundaryTraceId: marker.id,
        boundaryKey: boundary.boundary_key,
        boundaryType: "provider_compaction_boundary",
        runtimeKind: boundary.runtime_kind,
        sourceEvent: boundary.source_surface,
      });
    }
    this.seenBoundaryKeys.add(boundary.boundary_key);
  }

  private handleExistingBoundary(boundary: ProviderCompactionBoundaryPayload): boolean {
    const state = this.input.writer.getProviderCompactionBoundaryState(boundary.boundary_key);
    if (state.hasCompleteSegment) {
      this.input.writer.removeActiveRecordsArchivedByBoundary(boundary.boundary_key);
      this.seenBoundaryKeys.add(boundary.boundary_key);
      return true;
    }
    if (state.activeMarkerTraceId) {
      this.retryRotationFromExistingMarker(boundary, state.activeMarkerTraceId);
      this.seenBoundaryKeys.add(boundary.boundary_key);
      return true;
    }
    if (this.seenBoundaryKeys.has(boundary.boundary_key)) {
      return true;
    }
    return false;
  }

  private retryRotationFromExistingMarker(
    boundary: ProviderCompactionBoundaryPayload,
    markerTraceId: string,
  ): void {
    if (!boundary.rotation_eligible) {
      return;
    }
    this.input.writer.rotateActiveRawTracesBeforeBoundary({
      boundaryTraceId: markerTraceId,
      boundaryKey: boundary.boundary_key,
      boundaryType: "provider_compaction_boundary",
      runtimeKind: boundary.runtime_kind,
      sourceEvent: boundary.source_surface,
    });
  }

  private parseProviderCompactionBoundary(
    payload: Record<string, unknown>,
  ): ProviderCompactionBoundaryPayload | null {
    if (payload.kind !== "provider_compaction_boundary") {
      return null;
    }
    const boundaryKey = asString(payload.boundary_key);
    const runtimeKind = asString(payload.runtime_kind);
    const provider = asString(payload.provider);
    const sourceSurface = asString(payload.source_surface);
    const rotationEligible = asBoolean(payload.rotation_eligible);
    if (!boundaryKey || !runtimeKind || !provider || !sourceSurface || rotationEligible === null) {
      return null;
    }
    const toolResult = asRecord(payload.tool_result);
    return {
      kind: "provider_compaction_boundary",
      runtime_kind: runtimeKind,
      provider,
      source_surface: sourceSurface,
      boundary_key: boundaryKey,
      provider_thread_id: asString(payload.provider_thread_id),
      provider_session_id: asString(payload.provider_session_id),
      provider_event_id: asString(payload.provider_event_id),
      provider_response_id: asString(payload.provider_response_id),
      provider_timestamp: asNumber(payload.provider_timestamp),
      turn_id: asString(payload.turn_id) ?? extractTurnId(payload),
      trigger: asString(payload.trigger) ?? asString(toolResult?.trigger),
      status: asString(payload.status) ?? asString(toolResult?.status),
      pre_tokens: asNumber(payload.pre_tokens) ?? asNumber(toolResult?.pre_tokens),
      rotation_eligible: rotationEligible,
      semantic_compaction: false,
    };
  }
}
