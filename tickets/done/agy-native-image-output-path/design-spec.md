# Design Spec — AGY native `generate_image` output path

## Solution And Approval Basis
- Package `agy-native-image-output-path`, SR-004 (SR-003 design aligned to ARCH-REV-001). Requirements `requirements-doc.md` **Approved** 2026-09-28 (user: "Okay, then go ahead…"), DEC-001 = B-by-parity, DEC-002 = show arguments (see requirements Approval section).
- Evidence: `investigation-notes.md` E-001..E-016. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path`, branch `codex/agy-native-image-output-path`, base `origin/personal@fcd3e83a4`, target `personal`.

## Current-State Read
`AgyStreamProcess` (stdout NDJSON) → `AgyAgentRunBackend.handleMessage` (serialized async queue) → `AgyStreamEventConverter.convert` (sync, owns all AGY→canonical interpretation) → canonical `TOOL_EXECUTION_*` events → shared processors (`FileChangeEventProcessor`, history, stream) → Activity card / Artifacts. For `generate_image` the converter forces `arguments: {}` and success `result: {provider_state:"DONE", output:null}` (E-001). AGY stream omits the path (E-002/003); AGY persists it in `brain/<conv>/.system_generated/steps/<step_index>/output.txt` (E-004..E-006, E-011/012).

## Task Size And Architectural Risk (Mandatory)
- `task_size`: **Small** — one new adapter-local reader file, one modified converter, one-line backend wiring, tests. No shared contract, route, UI or persistence change.
- `architectural_risk`: **High** — (1) new dependency on an undocumented provider-internal file layout (E-010: layout ≈7 weeks old, changed once); (2) security surface: the server reads a file under `~/.gemini` and the resolved image becomes servable through the existing `/runs/:runId/file-change-content` route (E-014). Both are bounded by design below, but they are material security/external-contract impacts per the classification standard.
- Escalation trigger: any need to scan transcripts, copy bytes, delay turn completion, change shared file-change/route code, or read beyond the single step file ⇒ Design Impact.

## Architecture Investigation Evidence
E-013 converter/test call sites; E-014 artifact path canonicalization keeps outside-workspace absolute paths and content route serves only projected entries; E-015 AutoByteus `MediaToolResult = { file_path }`; E-016 generic `extractKnownGeneratedResultPath(result.file_path)` already yields a `generated_output` FILE_CHANGE. See `investigation-notes.md`.

## Intended Change
On native `generate_image` DONE without provider error, the AGY converter asks an AGY-owned step-output reader for the image path of `(conversationId, step_index)`. When resolved, canonical success result is `{ provider_state: "DONE", output: "<bounded AGY output text>", file_path: "<abs path>" }` — `output` is the same key every other AGY tool uses for provider output text (REQ-001), `file_path` is the key AutoByteus's own media tools use; the unchanged shared file-change pipeline then creates the Artifacts entry. Otherwise the result stays `{ provider_state: "DONE", output: null }` and a content-free warning is logged. `generate_image` parameters are published like every other AGY native tool.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | Trigger | Production path | Lifecycle boundary | Spine |
| --- | --- | --- | --- | --- |
| BEH-001 / REQ-001, REQ-004, REQ-005, AC-001, AC-004, AC-005 | User asks AGY agent for an image (SCN-001) | AGY stdout DONE → backend queue → converter → step-output reader → canonical SUCCEEDED `file_path` → FileChangeEventProcessor → Activity + Artifacts | Within the tool's DONE step; no turn delay | DS-001 |
| REQ-002/003, AC-002/003 | Missing/drifted/unsafe step output (SCN-002) | reader returns null → converter fallback result | same | DS-001 local |
| BEH-002 | Provider ERROR/denial | unchanged safe failure branch | same | unchanged |

## Task Design Health Assessment (Mandatory)
- Change posture: behavior change (feature enrichment) within an existing adapter.
- Root cause classification: `No Design Issue Found` for ownership — the AGY converter is already the single owner of AGY→canonical translation; the missing path is a provider-contract gap plus an intentional prior exclusion. The only structural need is an off-spine owner for provider-storage reading, so the converter stays a pure translator.
- Refactor needed now: no (beyond removing the `generate_image` special cases listed below).

## Persisted Data / State Transition Decision
`Not Affected` / `Directly Usable — No Migration`: new events carry an extra `file_path`; historical events keep `output: null` and replay unchanged. AGY brain files are read-only and never written. No FILE_CHANGE backfill for old runs (acceptable: historical behavior was explicitly path-less).

## Data-Flow Spine Inventory
| ID | Scope | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | AGY `step_update` tool DONE (`generate_image`) | Activity card result + Artifacts entry | `AgyStreamEventConverter` | The user-visible path outcome |
| DS-002 | Bounded local | `(conversationId, stepIndex)` | validated absolute path or `null` | `AgyStepOutputReader` (new) | Provider-storage lookup, containment, bounds |

## Primary Execution Spine
`AGY CLI stdout → AgyStreamProcess → AgyAgentRunBackend (queue) → AgyStreamEventConverter → [AgyStepOutputReader] → canonical TOOL_EXECUTION_SUCCEEDED → FileChangeEventProcessor → run history/stream → Activity card & Artifacts tab`

## Spine Narratives
DS-001: The converter sees the terminal `generate_image` step, emits STARTED (with the provider parameters) if not already emitted, and — only for DONE without explicit error — calls the injected `resolveNativeImagePath(stepIndex)`. The resolution's `path` is placed in `result.file_path` and its `outputText` in `result.output`. The resolver call is guarded: any thrown exception is caught in the converter and treated as reason `RESOLVER_FAILED` (fallback), so no exception can escape `convert` and stop the run via the backend queue catch (REQ-003). Shared processors are untouched and treat it exactly like AutoByteus's own `generate_image` result.

DS-002 (inside reader): validate UUID conversation id and non-negative integer step → build `<brainRoot>/<conv>/.system_generated/steps/<step>/output.txt` → open with `O_RDONLY|O_NOFOLLOW`, `fstat` regular file, read ≤16 KiB → match line `Generated image is saved at <path>` (strip one trailing `.`) → require absolute path, `realpath(file)` inside `realpath(<brainRoot>/<conv>)`, `lstat` regular non-symlink file → return `{ path: realpath, outputText: <decoded ≤16 KiB text, trimmed>, reason: null }`; any failure → `{ path: null, outputText: null, reason }`. The whole function body is wrapped so it never throws.

## Ownership Map
| Node | Owns |
| --- | --- |
| `AgyStreamEventConverter` | AGY step interpretation, canonical event shape, fallback choice, drift warning |
| `AgyStepOutputReader` (new, `stream/agy-step-output-reader.ts`) | Knowledge of AGY brain layout, path/size/symlink/containment policy, output-text parsing |
| `AgyAgentRunBackend` | Wiring: supplies `(stepIndex) => readAgyNativeImagePath(conversationId, stepIndex)` to the converter |
| Shared `FileChangeEventProcessor`, content route, UI | Unchanged consumers of canonical `file_path` |

## Removal / Decommission Plan (Mandatory)
- Remove `const args = nativeImage ? {} : …` special case (use provider parameters for all tools).
- Remove hard-coded native success `output: null` and its comment "Its native DONE does not provide a path".
- Adjust unit test "redacts native image denial…": its ACTIVE parameters are now public by approved DEC-002; keep assertions that provider `error`/`output` on ERROR/denial stay redacted.
- Replace the unit test "reports native image DONE without an output path or app-owned artifact" and update the e2e expectation `result toEqual {provider_state:"DONE", output:null}`.

## Off-Spine Concerns
`AgyStepOutputReader` serves the converter only. Diagnostic warning uses `console.warn` with code `AGY_NATIVE_IMAGE_PATH_UNRESOLVED run=<id> step=<n> reason=<code>` (no path/content), matching existing AGY `console.warn` diagnostics.

## Dependency Rules
- Allowed: backend → reader (wiring only); converter → injected function type; reader → `node:fs`, `node:path`, `node:os`.
- Forbidden: shared file-change processor, content route, run history or UI learning AGY brain layout; converter importing `fs`; reader reading any file other than the single step `output.txt` and `lstat`/`realpath` of the reported image; transcript reading; copying bytes; delaying turn completion.

## Interface Boundary Mapping
```ts
// stream/agy-step-output-reader.ts
export type AgyNativeImagePathResolution =
  | { path: string; outputText: string; reason: null }
  | { path: null; outputText: null; reason: "INVALID_IDENTITY" | "OUTPUT_MISSING" | "OUTPUT_UNSAFE" | "OUTPUT_TOO_LARGE"
      | "PATH_NOT_FOUND_IN_OUTPUT" | "PATH_OUTSIDE_CONVERSATION" | "IMAGE_MISSING" | "READ_FAILED" };
// Converter additionally uses local reason "RESOLVER_FAILED" for a thrown resolver (warning only).
export const readAgyNativeImagePath = (conversationId: string, stepIndex: number,
  brainRoot = path.join(os.homedir(), ".gemini", "antigravity-cli", "brain")): AgyNativeImagePathResolution;

// converter constructor gains a final optional dependency
resolveNativeImagePath?: (stepIndex: number) => AgyNativeImagePathResolution
```
Synchronous by design: one ≤16 KiB local read once per image generation (itself ~10 s); keeps `convert` synchronous and all current callers/tests unchanged. Absent resolver ⇒ fallback (unit tests stay deterministic).

## Existing Capability Reuse Check
Reused unchanged: canonical `file_path` result key (`MediaToolResult`), `FileChangeEventProcessor` generated-output projection, file-change content route, Activity result rendering. No new shared helper; `~/.gemini` root appears also in `agy-mcp-config-materializer.ts` — two independent uses, extraction not warranted now.

## Final File Responsibility Mapping
| Change | File | Responsibility |
| --- | --- | --- |
| Add | `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-step-output-reader.ts` | DS-002 |
| Modify | `…/antigravity/stream/agy-stream-event-converter.ts` | publish params; enrich DONE; fallback + warning |
| Modify | `…/antigravity/backend/agy-agent-run-backend.ts` | pass resolver bound to `runtimeContext.conversationId` |
| Add | `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-step-output-reader.test.ts` | temp-dir brain fixtures |
| Modify | `…/antigravity/agy-stream-event-converter.test.ts` | new/replaced image cases |
| Modify | `autobyteus-server-ts/tests/e2e/runtime/agy-native-image-codex-skill.e2e.test.ts` | live expectation `file_path` exists under the conversation brain dir |

## Concrete Examples
Resolved:
```json
{ "tool_name": "generate_image", "arguments": { "ImageName": "golden_retriever_dog", "Prompt": "…" },
  "result": { "provider_state": "DONE",
    "output": "Using prompt: A happy, beautiful Golden Retriever …\n\nGenerated image is saved at /Users/normy/.gemini/antigravity-cli/brain/010c6db0-…/golden_retriever_dog_1790572457860.jpg.\n\n Do not output the path of this image …",
    "file_path": "/Users/normy/.gemini/antigravity-cli/brain/010c6db0-…/golden_retriever_dog_1790572457860.jpg" } }
```
Fallback: `"result": { "provider_state": "DONE", "output": null }` + one warning line. Key check (E-016): `output` alone and `file_path` do not match the `*output*path*`/`destination` explicit-key rule; `file_path` is picked up by `extractKnownGeneratedResultPath` ⇒ exactly one `generated_output` entry. Bad shape (rejected): scraping the path from the assistant's reply text, globbing `brain/<conv>/<ImageName>_*.jpg`, or reading `transcript.jsonl`.

## Backward-Compatibility Rejection Log
No version branches for pre-2026-08-11 AGY layouts; they simply resolve to the generic fallback. No dual result shapes beyond resolved/unresolved.

## Change Sequence
1. Reader + its unit tests. 2. Converter changes + tests (resolved result contains `output` text and `file_path`; each fallback reason; **throwing resolver ⇒ SUCCESS with `output:null`, no exception**; ERROR/denial unchanged; parallel steps get distinct paths; MCP `call_mcp_tool` unaffected). 3. Backend wiring. 4. FileChangeEventProcessor unit test asserting AGY-shaped success produces one `generated_output` entry (no source change). 5. Live e2e update: expect `file_path` exists under the conversation brain dir and `output` contains that path; run gated live test with real `agy` 1.2.12.

## Key Tradeoffs / Risks
- Undocumented layout may drift → safe fallback + warning + live e2e as detector. Accepted by user (SR-002).
- Serving a `~/.gemini` file via content route: limited to realpath-contained image reported by AGY for this run's own conversation; route only serves projected entries.
- Prompt text now visible on the card like other tool parameters (approved DEC-002). Error/denial still redact provider error/output.

## Guidance For Implementation
Keep the reader ≤ ~80 lines, pure sync, no caching, never throws (wrap `open/fstat/read/realpath/lstat`); converter also guards the resolver call. Do not touch shared processors/routes/UI. Keep warning content-free.
