# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` SR-001, approved by the user on 2026-10-08 ("Okay, go ahead, approved."), with DEC-001 = A (separate explicit image section) and DEC-002 = A (no extra UI notice).
- Behavior-defining supplements and their approval references: None
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-image-context-input/tickets/in-progress/agy-image-context-input/investigation-notes.md`
- Authorities read (design reading gate; 2026-10-08): `.claude/skills/solution-designer/references/architecture-design.md`, `.claude/skills/solution-designer/design-principles.md`, project `DESIGN.md` (repo root of the worktree); `autobyteus-server-ts/AGENTS.md` (testing commands). No closer `DESIGN*.md` under `autobyteus-server-ts`. `design-examples.md` not used.
- Project design-principle conflicts or discrepancies: None.

## Current-State Read

User attachments travel `UI composer → SEND_MESSAGE (context_file_paths / image_urls) → stream handler builds ContextFile[] → AgentRun → AgentRunProviderInputNormalizer (resolves /rest/... locators to absolute local paths) → runtime backend`. Each runtime backend owns turning `AgentInputUserMessage` into its provider's input shape: Codex `codex/thread/codex-user-input-mapper.ts`, Claude `claude/session/claude-user-message-builder.ts`, ACP `acp/input/acp-prompt-builder.ts`. The AGY backend has no such step: `AgyAgentRunBackend.dispatchUserInput` passes `dispatch.message.content` straight to `AgyStreamProcess.sendUserMessage(content: string)` (`agy-agent-run-backend.ts:76`), so `contextFiles` are dropped (BEH-001/002/003). AGY's headless input contract is text-only (probe A); AGY's always-allowed native `view_file` opens local images for the model (probes B, C, D). Team-member runs use the same AgentRun → backend path; delegated/inter-agent reference files are already text (BEH-004).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale and supporting evidence: One new pure function file in the AGY backend's own folder, a one-line call-site change in `agy-agent-run-backend.ts`, one new unit test file, one extended unit test, one opt-in live test, two doc paragraphs. No other runtime, API, frontend, or persistence file changes.
- Architectural risk: `Low`
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
