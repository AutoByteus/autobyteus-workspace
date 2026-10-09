# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-004`
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` SR-004 — SR-001 basis plus DEC-006 (user, 2026-10-09: text required; attachment-only drafts cannot be sent). Earlier: SR-003 — SR-001 approved 2026-10-08 (DEC-001 A, DEC-002 A) plus DEC-003 A (attach-only sends admitted on every runtime) approved by the user 2026-10-08 ("agree. go ahead").
- Behavior-defining supplements and their approval references: None
- Design status: `Ready` (SR-004 revision governs — see "SR-004 Revision" at the end; the "SR-003 Revision" section is superseded and must not be implemented. Prior note — SR-003 revision: adds the AgentRun admission step to DS-001, widens admission per DEC-003, and a one-line Codex mapper adjustment; see "SR-003 Revision" below, which supersedes earlier sections where they differ)
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-image-context-input/tickets/in-progress/agy-image-context-input/investigation-notes.md`
- Authorities read (design reading gate; 2026-10-08): `.claude/skills/solution-designer/references/architecture-design.md`, `.claude/skills/solution-designer/design-principles.md`, project `DESIGN.md` (repo root of the worktree); `autobyteus-server-ts/AGENTS.md` (testing commands). No closer `DESIGN*.md` under `autobyteus-server-ts`. `design-examples.md` not used.
- Project design-principle conflicts or discrepancies: None.

## Current-State Read

User attachments travel `UI composer → SEND_MESSAGE (context_file_paths / image_urls) → stream handler builds ContextFile[] → AgentRun → AgentRunProviderInputNormalizer (resolves /rest/... locators to absolute local paths) → runtime backend`. Each runtime backend owns turning `AgentInputUserMessage` into its provider's input shape: Codex `codex/thread/codex-user-input-mapper.ts`, Claude `claude/session/claude-user-message-builder.ts`, ACP `acp/input/acp-prompt-builder.ts`. The AGY backend has no such step: `AgyAgentRunBackend.dispatchUserInput` passes `dispatch.message.content` straight to `AgyStreamProcess.sendUserMessage(content: string)` (`agy-agent-run-backend.ts:76`), so `contextFiles` are dropped (BEH-001/002/003). AGY's headless input contract is text-only (probe A); AGY's always-allowed native `view_file` opens local images for the model (probes B, C, D). Team-member runs use the same AgentRun → backend path; delegated/inter-agent reference files are already text (BEH-004).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small` (SR-004; was `Medium` in SR-003, `Small` in SR-002)
- SR-003 rationale: the change now also modifies the runtime-independent AgentRun input admission contract (`agent-run-input-admission-state.ts`), which gates every runtime's input, and the Codex input mapper. Source scope is still small (2 production files beyond IR-001), but the shared-contract blast radius across all runtimes is a material contract change under the risk standard, so the package is `Medium` / `High` and goes to independent architecture review.
- SR-002 size rationale (historical): One new pure function file in the AGY backend's own folder, a one-line call-site change in `agy-agent-run-backend.ts`, one new unit test file, one extended unit test, one opt-in live test, two doc paragraphs. No other runtime, API, frontend, or persistence file changes.
- Architectural risk: `Low` (SR-004; was `High` in SR-003, `Low` in SR-002)
- SR-004 rationale: the shared AgentRun admission contract is no longer touched. The delta is the already-implemented AGY builder (IR-001) plus a frontend-only Send-availability rule in the existing `hasSendableDraft` owner and its 4 callers. No API, persistence, server contract, security, concurrency or deployment change.
- Risk rationale and supporting evidence: Existing ownership absorbs the change (the backend already owns provider input shaping for its runtime; the pattern exists for Codex/Claude/ACP). AGY wire contract stays a text string (`sendUserMessage(content: string)` unchanged). No persistence, security boundary, concurrency, lifecycle or deployment change. Attachment paths become visible to the AGY agent, which already holds `--dangerously-skip-permissions` and already receives such paths through delegated `Reference files:` text; Codex/ACP already expose the same paths.
- Escalation trigger: If implementation finds that dispatches can reach the AGY backend with un-normalized `/rest/...` locators in a supported path, or that AGY must receive anything other than a text string, return a Design Impact.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `backends/antigravity/backend/agy-agent-run-backend.ts:76` | Sends `dispatch.message.content` only | Single fix point at the backend's dispatch | — |
| Code | `agent-execution/domain/agent-run.ts:330`, `input/agent-run-provider-input-normalizer.ts` | URIs already resolved to absolute local paths before backends | Builder does no path resolution | — |
| Code | `backends/acp/input/acp-prompt-builder.ts`, `codex/thread/codex-user-input-mapper.ts`, `claude/session/claude-user-message-builder.ts` | Per-runtime input builders; shared `appendContextFileReferenceSection` and `resolveContextImageSource` | Follow same pattern; reuse both shared helpers | — |
| Probe A | `probe-evidence/probeA.out` | Non-text block ends session | Text-only output (REQ-003) | — |
| Probes B, C | `probe-evidence/probeB.out`, `probeC.out` | Path + `view_file` gives real vision; paths outside workspace readable | Path-based image delivery | — |
| Probe D | `probe-evidence/probeD-gemini-3.8-flash-low.out` | With "her" + `Attached images (open each with view_file to see it):` the agent's first step was `view_file` on the image and it described the screenshot | Adopt this wording (DEC-001 A) | Claude-in-AGY not probed (account quota exhausted, `probeD-claude-sonnet-5-5-low.out`) |
| Code | `tests/unit/agent-execution/backends/antigravity/agy-turn-lifecycle.test.ts` (`FakeProcess.sent`) | Backend tests capture sent text | Backend AC-005 test extends this fixture | — |
| Code | `tests/unit/.../antigravity/agy-production-live.test.ts` (`AGY_LIVE=1`) | Opt-in live test pattern with real capsule + process | Live image test (AC-006) follows it | Model output is non-deterministic |

## Intended Change

Add an AGY-owned input text builder that turns `AgentInputUserMessage` into the single text string AGY accepts, and call it from `AgyAgentRunBackend.dispatchUserInput` instead of sending raw `content`.

Target text shape (example):

```
her

Attached images (open each with view_file to see it):
- /Users/u/.autobyteus/server-data/.../ctx_13d2e97292bc__10.png
Attached image URL: https://example.com/cat.png
[An attached image could not be attached: inline data URL images are not supported by Antigravity.]

Reference files:
- /Users/u/.autobyteus/server-data/.../notes.pdf
```

Rules:
1. Text = `message.content` (trailing whitespace trimmed).
2. Image context files (`ContextFileType.IMAGE`), classified with `resolveContextImageSource`:
   - `local_path` → listed under the heading `Attached images (open each with view_file to see it):` as `- <absolute path>` (deduplicated, in order).
   - `http_url` → line `Attached image URL: <url>`.
   - `data_url` → line `[An attached image could not be attached: inline data URL images are not supported by Antigravity.]` (never embed the bytes).
   - `null` → nothing (blank URI cannot be constructed; `ContextFile` requires a non-empty uri).
3. Non-image context files: `appendContextFileReferenceSection(text, nonImageFiles)` produces the shared `Reference files:` section for local paths (same helper as Codex/Claude/ACP). A non-image file whose URI is not a local path (e.g. http URL) gets a `Context file: <uri>` line, matching Codex.
4. Blocks are joined with a blank line; empty blocks omitted. Result is non-empty whenever any attachment exists (REQ-004).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger | Existing Behavior / Evidence | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-003, REQ-004 / AC-001, AC-003, AC-005, AC-006 | Attach image (upload/paste/drag) and send, standalone AGY run | Dropped (backend line 76) | Image path in explicit section; agent opens with `view_file` | DS-001 |
| BEH-002 | User | REQ-002 / AC-002, AC-006 | Attach non-image file and send | Dropped | `Reference files:` section | DS-001 |
| BEH-003 | User | REQ-001, REQ-002 / AC-006 | Same, to AGY team member | Dropped (same backend) | Same as BEH-001/002 via the same backend | DS-002 |
| BEH-004 | System | REQ-006 / AC-007 | Delegation / inter-agent `reference_files` | Text section in `content` | Preserved: content passes through unchanged (no context files on these messages) | DS-001 (content-only case) |
| BEH-005 | User | REQ-006 / AC-008 | Attach on Claude/Codex/native | Inline images | Preserved: no change to those backends | N/A |
| BEH-006 | User | REQ-005 / AC-004 | Remote URL / data URL image on AGY | Dropped | Named / noted in text | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `probe-evidence/` | AGY CLI probe outputs A–D | REQ-001, REQ-003 | Evidence for text-only contract and wording | Evidence only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `No` (missing per-runtime mapping in an otherwise healthy structure)
- Structural triggers: Repeated coordination — ruled out: image classification and reference-section logic already live in shared helpers that this design reuses; only runtime-specific composition is new, as for every other runtime. Responsibility overload — ruled out: composition goes in its own file, not into the already event-heavy backend class. Empty indirection — ruled out: the builder owns a real translation (message → AGY text policy). Shared-folder — no new shared code.
- Root cause classification: `Local Implementation Defect` — the AGY backend omitted the provider-input translation every other backend performs.
- Refactor needed now: `No`
- Evidence: backend line 76; sibling builders in `acp/input`, `codex/thread`, `claude/session`.
- Design response: add `antigravity/input/agy-user-message-text.ts`, call it from the backend.
- Refactor rationale: existing owner and boundaries are correct.
- Intentional deferrals and residual risk: Codex's `Context file:` line logic is duplicated in a few lines rather than extracted; extraction would create a shared helper serving two runtimes with different image policies — not worth a shared abstraction now.

## Terminology

- *AGY input text*: the single string written as `message.content` in AGY's stdin `{"event":"user"}` line.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete path: the raw `dispatch.message.content` send at `agy-agent-run-backend.ts:76` is replaced, not kept as a fallback.

## Persisted Data / State Transition Decision

- Decision: `Not Affected` — only the transient provider stdin payload changes; stored user messages, history and attachments are untouched.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, 002, 004, 006 | User sends message with attachments in a standalone AGY run | AGY model views the image via `view_file` | `AgyAgentRunBackend` (provider input) | The broken path |
| DS-002 | Primary End-to-End | BEH-003 | User sends to an AGY team member | Same as DS-001 | Team member's `AgyAgentRunBackend` | Same fix applies |

## Primary Execution Spine(s)

- DS-001: `Composer (upload/paste) → AgentStreamHandler (ContextFile[]) → AgentRun + ProviderInputNormalizer (absolute paths) → AgyAgentRunBackend.dispatchUserInput → buildAgyUserMessageText → AgyStreamProcess.sendUserMessage → agy CLI → view_file → model`
- DS-002: `Team composer → AgentTeamStreamHandler → member AgentRun + normalizer → AgyAgentRunBackend … (as DS-001)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The normalized message reaches the AGY backend, which converts it to AGY's text-only input: typed text, an explicit attached-images section of absolute paths, and the shared reference-files section. AGY's agent opens images with `view_file`. | AgentRun, AgyAgentRunBackend, AgyStreamProcess | AgyAgentRunBackend | `buildAgyUserMessageText` (translation), shared reference-section and image-source helpers |
| DS-002 | Identical after the member AgentRun. | same | same | same |

## Spine Actors / Main-Line Nodes

AgentRun (unchanged), AgyAgentRunBackend (call-site change), AgyStreamProcess (unchanged), agy CLI (external).

## Ownership Map

- `AgyAgentRunBackend`: turn lifecycle and which text is sent; now obtains the text from the AGY input builder.
- `agy-user-message-text.ts`: owns the AGY-specific policy for rendering a user message and its context files as text.
- `AgyStreamProcess`: stdin framing only; unchanged string contract.

## Thin Entry Facades / Public Wrappers

N/A — none.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| Raw `dispatch.message.content` argument at `agy-agent-run-backend.ts:76` | Drops attachments | `buildAgyUserMessageText(dispatch.message)` | In This Change | No fallback |

## Return Or Event Spine(s)

N/A — AGY output/event conversion unchanged; the `view_file` tool step is projected by the existing converter as a normal tool activity.

## Bounded Local / Internal Spines

N/A.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `buildAgyUserMessageText` | DS-001, DS-002 | AgyAgentRunBackend | Message → AGY text | AGY input is text-only | Backend class grows formatting policy |
| `appendContextFileReferenceSection` (autobyteus-ts) | DS-001 | builder | Shared `Reference files:` rendering | Cross-runtime consistency | — |
| `resolveContextImageSource` (`agent-execution/shared`) | DS-001 | builder | Image URI classification | Shared policy | — |

## Ownership Boundaries

The backend remains the authoritative entry for AGY input. The builder is internal to the AGY backend folder; nothing outside `backends/antigravity` imports it (tests excepted).

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers | Forbidden Bypass Shape | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `AgyAgentRunBackend.dispatchUserInput` | `buildAgyUserMessageText`, `AgyStreamProcess.sendUserMessage` | AgentRun | AgentRun or others formatting AGY text or calling `sendUserMessage` directly | N/A |

## Dependency Rules

- `antigravity/input/agy-user-message-text.ts` may depend on `autobyteus-ts` message types, `context-file-reference-section`, `ContextFileType`, and `agent-execution/shared/context-image-source.ts`.
- It must not do file I/O, path resolution, or depend on other runtimes' backends.
- `AgyStreamProcess` keeps a `string` parameter; it must not learn about context files.

## Interface Boundary Mapping

| Interface | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `buildAgyUserMessageText(message: AgentInputUserMessage): string` | AGY user input text | Render text + context files per the rules above | One normalized message | Pure, synchronous, never throws for valid messages |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `buildAgyUserMessageText` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| AGY input builder | `buildAgyUserMessageText` / `agy-user-message-text.ts` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Capability | Decision | Why | If New, Why |
| --- | --- | --- | --- | --- |
| Reference-files section | `autobyteus-ts/agent/message/context-file-reference-section.ts` | Reuse | Same format all runtimes use | — |
| Image URI classification | `agent-execution/shared/context-image-source.ts` | Reuse | Shared image policy | — |
| AGY text composition | none for AGY | Create New | Runtime-specific policy (explicit image section) | Other builders emit runtime-specific shapes |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spine | Owner Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `backends/antigravity` | AGY input text | DS-001/002 | AgyAgentRunBackend | Extend | New `input/` folder mirrors `backends/acp/input/` |

## Draft File Responsibility Mapping

| Candidate File | Subsystem | Owner | Concern | Why One File | Reuses Shared? |
| --- | --- | --- | --- | --- | --- |
| `backends/antigravity/input/agy-user-message-text.ts` | antigravity | AgyAgentRunBackend | Message → AGY text | One policy | Yes (both helpers) |
| `backends/antigravity/backend/agy-agent-run-backend.ts` | antigravity | AgyAgentRunBackend | Call builder | Existing | — |

## Reusable Owned Structures Check

| Repeated Logic | Candidate Shared File | Owner | Why Shared | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| `Context file: <uri>` line for non-local non-images (Codex + AGY) | none | — | Not extracted: 3 lines, different surrounding policies | N/A | N/A | A generic all-runtime input builder |

## Shared Structure / Data Model Tightness Check

N/A — no new shared structure.

## Final File Responsibility Mapping

| File | Subsystem | Owner | Concern | Why One File | Reuses Shared? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/input/agy-user-message-text.ts` (Add) | antigravity | AgyAgentRunBackend | Message → AGY input text | Single policy | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/backend/agy-agent-run-backend.ts` (Modify, line 76) | antigravity | AgyAgentRunBackend | Send built text | Existing owner | — |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-user-message-text.test.ts` (Add) | tests | — | AC-001..AC-004 | — | — |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-turn-lifecycle.test.ts` (Modify) | tests | — | AC-005 | — | — |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-image-input-live.test.ts` (Add, `AGY_LIVE=1`) | tests | — | AC-006 live | — | — |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` (Modify) | docs | — | AGY input/context-file section | — | — |
| `autobyteus-server-ts/docs/modules/agent_execution.md` (Modify ~line 715) | docs | — | Note AGY's path-based exception | — | — |

## Applied Patterns

Adapter (message → provider input), mirroring sibling runtimes.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `backends/antigravity/input/` | Folder | AGY backend | Provider-input translation | Mirrors `backends/acp/input/` | Process I/O, event conversion |

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `backends/antigravity/input/` | Off-Spine Concern | Yes | Low | Matches ACP layout; `backend/`, `stream/`, `capsule/` already split by concern |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| AGY input | One text string with path sections (see Intended Change) | `[{type:"text"},{type:"image",…}]` | Non-text blocks kill the AGY session (probe A) |
| Data URL | Short note line | Pasting base64 into text | Bloats prompt, model cannot use it |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep sending raw content when no context files | "Unchanged behavior" | N/A — the builder returns the content unchanged when there are no context files, single path | — |
| Feature flag for old behavior | Rollback | Rejected | Clean replacement |

## Change / Refactor Sequence

1. Add `agy-user-message-text.ts` with unit tests (AC-001..AC-004).
2. Switch backend line 76 to the builder; extend `agy-turn-lifecycle.test.ts` with an image dispatch asserting `process.sent[0]` (AC-005), and a content-only dispatch asserting unchanged text (AC-007 support).
3. Add opt-in live test (AC-006): real capsule + `AgyStreamProcess`, model `gemini-3.8-flash-low`, a generated PNG with a known distinctive property (e.g. solid single color) in a temp folder outside the workspace; send "What colour is this image? Answer in one word." built through `buildAgyUserMessageText`; assert a `view_file` step on that path and the expected colour in the result. Skipped unless `AGY_LIVE=1`.
4. Update docs.
5. Run existing Claude/Codex/ACP/normalizer unit tests unchanged (AC-008).

## Key Tradeoffs

- Path + `view_file` instead of inline image: forced by AGY contract; gives real vision at the cost of one visible tool step (accepted, DEC-002 A).
- Explicit image heading vs. plain `Reference files:` list: chosen for reliability (probe C vs D).

## Risks

- Model may still not open the image with some prompts/models → mitigated by explicit wording; verified live and by user.
- `view_file` limits for unusual/large images unknown → visible tool error; out of scope.
- A `/rest/...` locator the normalizer cannot resolve (attachment deleted) would be listed as a path that fails in `view_file` → visible tool error, same as Codex's behavior; not a supported scenario requiring extra machinery.

## Guidance For Implementation

- Keep the builder pure and synchronous; no `fs` access.
- Heading strings exactly: `Attached images (open each with view_file to see it):`, `Attached image URL: <url>`, `[An attached image could not be attached: inline data URL images are not supported by Antigravity.]`, and shared `Reference files:` / `Context file: <uri>`.
- Handle `message.contextFiles` being `null`/`undefined` (test fixtures pass `{content}` only).
- Do not change `AgyStreamProcess.sendUserMessage`'s signature.
- User verification (desktop app): standalone AGY Daily Assistant with uploaded and pasted image; an AGY team member with an image; a `.txt`/`.pdf` attachment.


## SR-003 Revision — Attach-only sends (DEC-003 A) — SUPERSEDED by SR-004; do not implement

### Trigger and root cause
Code review CRR-001 (API-REV-001, E2E-CF-002): the SR-002 DS-001 path omitted AgentRun's input admission. `AgentRunInputAdmissionState.admit` and `.reserve` (`autobyteus-server-ts/src/agent-execution/input/agent-run-input-admission-state.ts:87-93, 114-120`, since `1e7837929`, 2026-08-13) reject any message whose `content` is empty/whitespace via `requiredString(message.content)`, before any backend runs. The Chat/standalone composer has enabled attach-only Send since `797d49d6a` (2026-09-28), sending `content: ""`. Root cause classification: `Missing Invariant` — the shared admission invariant ("input must carry something to deliver") is encoded as "content must be non-empty", which no longer matches the product's supported input (text **or** attachments). Owner (admission state) is correct; the rule is wrong.

### Corrected primary spine
- DS-001 (revised): `Composer (upload/paste, Send) → AgentStreamHandler (ContextFile[]) → AgentRunCommandCoordinator → AgentRun → AgentRunInputAdmissionState.admit/reserve (text-or-attachment rule) → AgentRunProviderInputNormalizer (absolute paths) → runtime backend dispatchUserInput → runtime input mapping (AGY: buildAgyUserMessageText) → provider`
- DS-003 (new, Primary End-to-End, BEH-007): same as DS-001 up to the backend, for Claude / Codex / native / ACP / Grok standalone runs.

### Admission rule (owner: `AgentRunInputAdmissionState`)
- Accept when `message.content` is a string **and** (`content.trim()` is non-empty **or** `message.contextFiles` has at least one entry).
- Reject otherwise with the existing code `AGENT_RUN_INPUT_INVALID` and message `AgentRun input needs text or at least one context file.`
- Implement once (one private predicate, e.g. `hasDeliverableInput(message)`) used by both `admit` and `reserve`; remove the content-only `requiredString` use for content (keep `requiredString` only if still used elsewhere in the file).
- Do not move this rule into callers (stream handlers, coordinator, GraphQL) — they must keep relying on AgentRun admission.

### Per-runtime handling of `content: ""` + attachments (investigated; AC-010)
| Runtime | Mapping owner | Behavior with empty text + local image / local file | Change |
| --- | --- | --- | --- |
| AGY | `antigravity/input/agy-user-message-text.ts` | Image section / `Reference files:` (non-empty) | None (IR-001) |
| Claude | `claude/session/claude-user-message-builder.ts` | Text block omitted when empty; image block(s) / reference text for files; `hasClaudeUserMessageContent` already true for image-only | None |
| Codex | `codex/thread/codex-user-input-mapper.ts` | Local image/file paths are in the reference section → text non-empty. Only a remote-URL-only image yields an empty text item | **Modify:** omit the leading text item when its text is empty and at least one other input exists |
| Native (AutoByteus) | `autobyteus-ts/agent/message/multimodal-message-builder.ts` → `LLMUserMessage` | Reference section non-empty for local files; `LLMUserMessage` explicitly allows empty content with media | None |
| ACP / Grok | `acp/input/acp-prompt-builder.ts` | Local files → non-empty `Reference files:` text | None. Web-URL-only no-text message throws `ACP_PROMPT_EMPTY` → visible `RUNTIME_COMMAND_FAILED` (accepted residual, out of scope) |

### History and summary (REQ-007, AC-011)
- `RuntimeMemoryEventAccumulator.recordForwardedUserMessage` writes the user trace with `content: ""` plus media/file attachments (no empty-content filter).
- `raw-trace-to-historical-replay-events.ts` replays user traces regardless of empty content, with attachments.
- Run summary: `AgentRunHistoryCatalogService.recordRunSummary` ignores empty summaries; the first later message with text sets it. Preserved, no change.

### File changes (SR-003 additions)
| File | Change | Responsibility |
| --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/input/agent-run-input-admission-state.ts` | Modify | Text-or-attachment admission predicate used by `admit` and `reserve`; updated rejection message |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-user-input-mapper.ts` | Modify | Omit empty leading text item when other inputs exist |
| `autobyteus-server-ts/tests/unit/agent-execution/input/agent-run-input-admission-state.test.ts` | Modify | AC-009 cases (a)(b)(c); update any assertion of the old message |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-user-input-mapper.test.ts` | Modify | Remote-URL-only image, empty text → no text item |
| Claude / ACP / native builder unit tests (`claude-user-message-builder.test.ts`, `acp-permission-bridge-and-prompt.test.ts`, autobyteus-ts multimodal builder test) | Modify/Add | AC-010 empty-text + local image/file cases (behavior already correct; lock it in) |
| Raw-trace replay unit test | Add case | AC-011 empty-content user trace with attachment is replayed |
| `autobyteus-server-ts/tests/e2e/runtime/agy-context-files-transport.e2e.test.ts` (API/E2E-owned, uncommitted) | — | E2E-CF-002 re-run must pass (AC-003) |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Modify | Document the input admission rule (text or at least one context file) |

### Dependency rules (unchanged + added)
- Admission stays inside AgentRun; callers do not pre-validate content.
- Runtime builders must not assume non-empty `content`.

### Design health (SR-003)
- Change posture: Bug Fix (pre-existing cross-runtime defect, approved into scope)
- Root cause: `Missing Invariant` (rule encoded too narrowly at the correct owner)
- Refactor needed now: No — one predicate at the existing owner; one guard in the Codex mapper.
- Structural triggers: duplicated policy — the two identical content checks in `admit`/`reserve` are collapsed into one predicate (removal). Ambiguous boundary — none.

### Removal / compatibility
- Removed: content-only admission checks at lines 87-93 and 114-120 (replaced by the shared predicate). No fallback or flag.
- Persisted data: Not Affected (empty-content user traces are already a valid shape for readers).

### Change sequence (SR-003)
1. Admission predicate + unit tests (AC-009).
2. Codex mapper guard + test.
3. AC-010 per-runtime unit cases; AC-011 replay case.
4. Docs.
5. API/E2E re-runs E2E-CF-002 and affected suites; user verifies attach-only on AGY and one other runtime.

### Risks (SR-003)
- Some provider may reject an image-only turn at its API (e.g. Codex app-server with no text item). Mitigation: Codex keeps a text item whenever it has local paths; only remote-URL-only cases omit it. Validate one Codex attach-only send live in API/E2E or user verification.
- ACP/Grok web-URL-only attach-only: visible error (accepted residual).


## SR-004 Revision — Text required to send (DEC-006)

### Decision
The user chose one consistent rule (2026-10-09): a message cannot be sent with only context files; typed text (or a skill tag, which supplies instruction text) is required. Server admission (`agent-run-input-admission-state.ts`: non-empty `content`) is **unchanged** and remains the authoritative backstop. The SR-003 admission predicate, Codex mapper guard and per-runtime/history test locks are dropped. ARCH-REV-001 findings AR-001/AR-002 concerned attach-only delivery and are moot; N-1 (old rejection message assertion) is moot because the message is unchanged.

### Root cause (BEH-007)
`Missing Invariant` at the frontend owner: `hasSendableDraft` (`autobyteus-web/services/runSubmission/agentPrimaryAction.ts:50-60`) counts context files alone as sendable when `attachmentsAreSendable` is true (Chat and standalone run view since `797d49d6a`), contradicting the server's input contract. Fix at that owner.

### Primary spine (DS-004, BEH-007)
`Composer draft (text, skill tags, context files) → hasSendableDraft → resolveAgentPrimaryAction (hasDraft) → Send button enabled/disabled and store send() guard`.

### Change
- `hasSendableDraft(draft)`: `Boolean(draft.requirement.trim()) || draft.requestedSkillNames.length > 0`. **Remove** the `options.attachmentsAreSendable` parameter and the context-file clause entirely (clean cut; no flag). `contextFilePaths` is removed from `SendableDraft` if no longer used.
- Update every caller to the single-argument form and remove now-wrong comments:
  - `autobyteus-web/stores/activeContextStore.ts:~270` (`send`) and `:~299` (`interruptGeneration`)
  - `autobyteus-web/components/chat/ChatComposer.vue:~111` (comment "Send is enabled by text, a skill tag or a context file" → text or skill tag)
  - `autobyteus-web/components/chat/ChatNewSurface.vue:~210` (`sendBlockedReason`)
  - `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue:~142` (skill-tagging branch; comment)
- Team/org composers: already text-required; unchanged behavior.
- Antigravity: IR-001 (`buildAgyUserMessageText`, commit `8139c6b12`) unchanged and still required (REQ-001..003, REQ-005). Its empty-content handling (rule 4) is harmless and stays.

### Tests
| File | Change |
| --- | --- |
| `autobyteus-web/services/runSubmission/__tests__/agentPrimaryAction.spec.ts` | Add `hasSendableDraft` cases: only context file → false; file + text → true; skill tag only → true; whitespace text + file → false |
| `autobyteus-web/components/chat/__tests__/ChatComposer.spec.ts` (`enables send only for text, a skill tag or a context file`, ~line 57) | Rewrite: a context file alone leaves Send disabled; adding text enables it |
| `autobyteus-web/components/agentInput/__tests__/AgentUserInputTextArea.spec.ts` | Skill-tagging composer: file-only draft keeps Send disabled |
| Any other spec asserting attachment-only Send in Chat/standalone (search `attachmentsAreSendable`, `contextFilePaths` + send) | Update to the new rule |
| `autobyteus-server-ts/tests/e2e/runtime/agy-context-files-transport.e2e.test.ts` E2E-CF-002 (API/E2E-owned, uncommitted) | API/E2E owner revises: attach-only is no longer a supported send; server rejection of empty content is preserved behavior |

### Docs
- `autobyteus-web` docs that describe Chat attachment-only Send, if any (search "context file" + "Send") — update to "text required". `docs/modules/agent_execution.md` needs no admission change.

### Persisted data
Not Affected.

### Backward-compatibility rejection
- Keeping `attachmentsAreSendable` with all callers passing `false`: Rejected — remove the option.

### Removal / decommission
| Item | Replaced By | Scope |
| --- | --- | --- |
| `attachmentsAreSendable` option and context-file clause in `hasSendableDraft` | Text-or-skill rule | In This Change |
| SR-003 design (admission predicate, Codex guard, per-runtime locks) | Not implemented | Withdrawn |

### Change sequence
1. `hasSendableDraft` + callers + frontend tests (AC-003).
2. Keep IR-001 as is; run existing AGY/Claude/Codex/ACP unit suites (AC-008).
3. API/E2E re-validates; E2E-CF-002 revised by its owner.
4. User verification in desktop app: AGY image with text (uploaded + pasted), team member image, `.txt`/`.pdf`; Chat composer Send disabled with only an attachment.
