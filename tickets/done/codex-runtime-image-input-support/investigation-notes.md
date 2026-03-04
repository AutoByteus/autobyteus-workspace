# Investigation Notes

## Ticket

`codex-runtime-image-input-support`

## Stage

`1 Investigation + Triage`

## Sources Consulted

- Local code:
  - `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-user-input-mapper.ts`
  - `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts`
  - `autobyteus-server-ts/src/api/graphql/converters/user-input-converter.ts`
  - `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue`
  - `autobyteus-web/stores/fileUploadStore.ts`
  - `autobyteus-server-ts/src/api/rest/upload-file.ts`
  - `autobyteus-server-ts/src/services/media-storage-service.ts`
- Official Codex sources:
  - https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md
  - https://github.com/openai/codex/blob/main/sdk/typescript/README.md
  - https://github.com/openai/codex/blob/main/codex-rs/protocol/src/models.rs

## Key Findings

1. Codex app server supports image inputs on `turn/start` with both:
   - `{"type":"image","url":"https://..."}`
   - `{"type":"localImage","path":"/absolute/path.png"}`
2. Current codex mapper already emits image items, but it chooses mode as:
   - `http(s)` URI => `type: "image"`
   - any other URI => `type: "localImage"`
3. Browser paste/upload flow stores image context files as server URLs (for example `http://localhost:<port>/rest/files/images/<id>.png`).
4. Those URLs are generated from local media storage and are usually not externally reachable by model backends as remote URLs; Codex should instead receive local file paths when the URL points to this server's own media endpoint.
5. Existing text-only codex flow is unaffected.

## Root-Cause Hypothesis

- For codex runtime, locally uploaded images are passed as remote URLs rather than translated into `localImage` paths. This can cause image fetch failure in Codex while autopilot path still works.

## Scope Triage

- Classification: `Small`
- Rationale:
  - Focused to codex image URI normalization in one mapper + targeted unit tests.
  - No API shape redesign required.
  - No frontend schema changes required.

## Unknowns / Risks

- If deployment uses non-localhost externally reachable base URL, mapping to local path is still safe for codex and avoids remote reachability assumptions.
- Need path-traversal-safe conversion for `/rest/files/*` to local filesystem path.

## Re-Entry Round 2 Findings (Live E2E Requirement)

1. Existing validation was limited to unit-level mapper/runtime tests; no live Codex E2E asserted image attachment delivery from real runtime execution.
2. Current live `codex-runtime-graphql.e2e.test.ts` suite has tool lifecycle and projection scenarios but no dedicated image-input scenario.
3. User requirement expansion is explicit: add and run a real `RUN_CODEX_E2E=1` scenario with a concrete image fixture.

### Re-Triage

- Classification remains `Small`.
- Rationale:
  - Add one focused live E2E case plus artifact updates.
  - No architecture or runtime contract redesign required.
