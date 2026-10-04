/**
 * Real Claude Agent SDK compaction frames, copied verbatim from the streaming-input probes
 * (SDK 0.3.280, CLI 2.1.283) in tickets/in-progress/runtime-work-transfer-analysis/probes/.
 * Only the compaction-relevant `system/status` and `system/compact_boundary` frames are kept;
 * each export preserves the observed order.
 */
export type ClaudeFrame = Record<string, unknown>;

/** claude-streaming-manual-frames.jsonl: `/compact` → compacting → success → boundary (manual). */
export const CLAUDE_MANUAL_COMPACTION_FRAMES: readonly ClaudeFrame[] = [
  {
    "type": "system",
    "subtype": "status",
    "status": "compacting",
    "session_id": "8cd7a530-7830-401f-a27d-3fe72963257c",
    "uuid": "a85e8ae9-cc82-478d-a145-118ee3e10f81"
  },
  {
    "type": "system",
    "subtype": "status",
    "status": null,
    "compact_result": "success",
    "session_id": "8cd7a530-7830-401f-a27d-3fe72963257c",
    "uuid": "a6cfb8f4-eab5-4ca2-b8a3-cef6da402635"
  },
  {
    "type": "system",
    "subtype": "compact_boundary",
    "session_id": "8cd7a530-7830-401f-a27d-3fe72963257c",
    "uuid": "2957fbd4-9d68-4db8-8cad-70ff68afa4d2",
    "compact_metadata": {
      "trigger": "manual",
      "pre_tokens": 3350,
      "post_tokens": 1149,
      "cumulative_dropped_tokens": 2201,
      "duration_ms": 12216
    },
    "logical_parent_uuid": "9d9ae323-f98a-4dd9-a554-643eba88c701"
  }
];

/** claude-streaming-auto-frames.jsonl turn 2: compacting → failed "too_few_groups"; the turn continued normally. */
export const CLAUDE_AUTO_FAILED_COMPACTION_FRAMES: readonly ClaudeFrame[] = [
  {
    "type": "system",
    "subtype": "status",
    "status": "compacting",
    "session_id": "051e7c27-0188-4c6e-a8cc-7542e3f1f32e",
    "uuid": "abd3f4d3-a350-4ead-9cb3-bbb255827ad0"
  },
  {
    "type": "system",
    "subtype": "status",
    "status": null,
    "compact_result": "failed",
    "compact_error": "too_few_groups",
    "session_id": "051e7c27-0188-4c6e-a8cc-7542e3f1f32e",
    "uuid": "7402d89f-0528-478a-8e2c-515b636dc7f7"
  }
];

/** claude-streaming-auto-frames.jsonl turn 3: compacting → success → boundary (auto), mid-turn. */
export const CLAUDE_AUTO_COMPACTION_FRAMES: readonly ClaudeFrame[] = [
  {
    "type": "system",
    "subtype": "status",
    "status": "compacting",
    "session_id": "051e7c27-0188-4c6e-a8cc-7542e3f1f32e",
    "uuid": "7a12debe-56a1-4b84-ba8d-c69fd6973df9"
  },
  {
    "type": "system",
    "subtype": "status",
    "status": null,
    "compact_result": "success",
    "session_id": "051e7c27-0188-4c6e-a8cc-7542e3f1f32e",
    "uuid": "b9e9032d-d5a9-40f7-bf56-e9370abc86af"
  },
  {
    "type": "system",
    "subtype": "compact_boundary",
    "uuid": "22921f5d-e183-4a18-9560-33aac82ea929",
    "compact_metadata": {
      "trigger": "auto",
      "pre_tokens": 128715,
      "post_tokens": 1546,
      "cumulative_dropped_tokens": 127169,
      "duration_ms": 16593,
      "preserved_segment": {
        "head_uuid": "84d985fd-8d44-4a47-90ce-3f92ba179481",
        "anchor_uuid": "8ca040cf-81ec-49b9-9a65-bc98102dd845",
        "tail_uuid": "7abd7ad7-5655-4129-853a-80cc5f8f9a0e"
      },
      "preserved_messages": {
        "anchor_uuid": "8ca040cf-81ec-49b9-9a65-bc98102dd845",
        "uuids": [
          "84d985fd-8d44-4a47-90ce-3f92ba179481",
          "bf05ce93-2bc0-4f20-9525-ecf789fa0357",
          "12bcf04c-5519-4ed5-a1bb-868f328348cb",
          "7abd7ad7-5655-4129-853a-80cc5f8f9a0e"
        ],
        "all_uuids": [
          "84d985fd-8d44-4a47-90ce-3f92ba179481",
          "bf05ce93-2bc0-4f20-9525-ecf789fa0357",
          "12bcf04c-5519-4ed5-a1bb-868f328348cb",
          "7abd7ad7-5655-4129-853a-80cc5f8f9a0e"
        ]
      }
    },
    "logical_parent_uuid": "7abd7ad7-5655-4129-853a-80cc5f8f9a0e",
    "session_id": "051e7c27-0188-4c6e-a8cc-7542e3f1f32e"
  }
];

/** claude-streaming-interrupt-frames.jsonl: interrupt during manual compaction → failed "API Error: Request was aborted.". */
export const CLAUDE_INTERRUPTED_COMPACTION_FRAMES: readonly ClaudeFrame[] = [
  {
    "type": "system",
    "subtype": "status",
    "status": "compacting",
    "session_id": "bc1b52fd-5447-4187-97a5-e97dd8af1772",
    "uuid": "914919f9-f6d1-4c91-8c34-99027a60ec0d"
  },
  {
    "type": "system",
    "subtype": "status",
    "status": null,
    "compact_result": "failed",
    "compact_error": "API Error: Request was aborted.",
    "session_id": "bc1b52fd-5447-4187-97a5-e97dd8af1772",
    "uuid": "8fcca1fd-63c3-4cff-bf6c-f51c844825af"
  }
];

/** claude-streaming-long-frames.jsonl: one 23.4 s manual compaction (sonnet, 128K context). */
export const CLAUDE_LONG_MANUAL_COMPACTION_FRAMES: readonly ClaudeFrame[] = [
  {
    "type": "system",
    "subtype": "status",
    "status": "compacting",
    "session_id": "8729b58b-9040-4213-b61d-8b67f51f36c2",
    "uuid": "26d1be01-80c7-4a0b-a2f3-42d2c718a70e"
  },
  {
    "type": "system",
    "subtype": "status",
    "status": null,
    "compact_result": "success",
    "session_id": "8729b58b-9040-4213-b61d-8b67f51f36c2",
    "uuid": "40e7269e-7389-4de7-ae2b-8e30ace655e4"
  },
  {
    "type": "system",
    "subtype": "compact_boundary",
    "session_id": "8729b58b-9040-4213-b61d-8b67f51f36c2",
    "uuid": "9d0d1f94-9b5c-45b4-896c-4bb091c65247",
    "compact_metadata": {
      "trigger": "manual",
      "pre_tokens": 128332,
      "post_tokens": 1582,
      "cumulative_dropped_tokens": 126750,
      "duration_ms": 23416,
      "preserved_segment": {
        "head_uuid": "0dbe24cf-cc87-4ef5-a5cd-991aaf20fc00",
        "anchor_uuid": "b22f42b3-e905-42b4-b93d-5342aa023a79",
        "tail_uuid": "0dbe24cf-cc87-4ef5-a5cd-991aaf20fc00"
      },
      "preserved_messages": {
        "anchor_uuid": "b22f42b3-e905-42b4-b93d-5342aa023a79",
        "uuids": [
          "0dbe24cf-cc87-4ef5-a5cd-991aaf20fc00"
        ],
        "all_uuids": [
          "0dbe24cf-cc87-4ef5-a5cd-991aaf20fc00"
        ]
      }
    },
    "logical_parent_uuid": "0dbe24cf-cc87-4ef5-a5cd-991aaf20fc00"
  }
];

/**
 * Synthetic keepalive in the real frame shape: the CLI re-emits `status: "compacting"` every
 * 30 s while one compaction runs (investigation E68: `setInterval(..., 30000)`; E55 real data).
 */
export const claudeCompactingKeepalive = (sessionId: string, uuid: string): ClaudeFrame => ({
  type: "system",
  subtype: "status",
  status: "compacting",
  session_id: sessionId,
  uuid,
});

/** Rewrites `session_id` so recorded frames match a test session's provider session id. */
export const withClaudeSessionId = (frames: readonly ClaudeFrame[], sessionId: string): ClaudeFrame[] =>
  frames.map((frame) => ({ ...frame, session_id: sessionId }));
