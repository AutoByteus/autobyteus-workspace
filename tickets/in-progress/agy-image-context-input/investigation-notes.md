# Investigation Notes

## Investigation Meta

- Package identifier: `agy-image-context-input`
- Request / ticket: Project Task `project_task_ad5f497a-6825-41f1-ab99-5c67b4a619f0` — "Image context files don't reach the model on the Antigravity runtime" (delegated by `/project_task_manager`, run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-image-context-input`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-image-context-input` / `codex/agy-image-context-input`
- Resolved base remote / branch / revision: `origin/personal` @ `048ea6cecb3f1999d4201be5b995157a8007d8e7` (fetched 2026-10-08; `origin/HEAD -> origin/personal`)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: Worktree created from freshly fetched `origin/personal`; ticket folder `tickets/in-progress/agy-image-context-input/`.
- Bootstrap blocker: None
- Current solution revision ID: `SR-002`
- Authorities read (requirements reading gate; file and date): `.claude/skills/solution-designer/references/requirements-engineering.md` (2026-10-08)
- Authorities read (design reading gate; 2026-10-08): `references/architecture-design.md`, `design-principles.md`, project `DESIGN.md`, `autobyteus-server-ts/AGENTS.md`
- Investigation status: Requirements-phase investigation complete; root cause confirmed by code and live AGY CLI probes.

## Initial Request And Clarifications

- Original request: On the AGY runtime, an image attached as a context file (desktop app v1.4.99 beta, Daily Assistant standalone run, message "her") never reaches the model; agent replies "It looks like the image or text didn't come through yet!". Reproduce, find root cause, fix so attached images reach an AGY agent as real image input, or show a clear user-approved message if impossible. Also check non-image files on AGY, and images in team-member and delegated AGY runs. Done when an AGY agent can describe an attached image, covered by tests (incl. an AGY input-mapping test with an image), verified by the user in the desktop app.
- Clarifications received: None yet.
- User-supplied facts and constraints: Screenshot `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_ad5f497a-6825-41f1-ab99-5c67b4a619f0/context/ctx_13d2e97292bc__10.png`.
- Initial ambiguity: Whether AGY can accept images at all (resolved: not inline, yes via file path + native `view_file`).

## Product And Domain Understanding

- Product area: Agent input delivery — user context-file attachments → AgentRun → runtime backend (AGY = Antigravity CLI `agy`, headless `stream-json`).
- Affected actors or systems: Desktop/web user; AGY standalone runs; AGY team-member runs; AGY delegated runs; AGY CLI process.
- Existing user or operational purpose: Users attach images/files to give the agent context ("Context files" under the user message).
- Relevant terminology: *Context file* — `ContextFile{uri,fileType}` on `AgentInputUserMessage.contextFiles`; *Reference files section* — shared text block `Reference files:\n- <abs path>` appended by `appendContextFileReferenceSection`.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-08 | User | Screenshot (above) | Symptom | UI shows image under "Context files"; agent says nothing came through | — |
| 2026-10-08 | Code | `autobyteus-server-ts/src/agent-execution/backends/antigravity/backend/agy-agent-run-backend.ts:76` | AGY dispatch | `await this.process.sendUserMessage(dispatch.message.content)` — only text; `contextFiles` never read | Root cause |
| 2026-10-08 | Code | `.../antigravity/stream/agy-stream-process.ts` `sendUserMessage(content: string)` | AGY stdin shape | Writes `{"event":"user","message":{"content":<string>}}` | — |
| 2026-10-08 | Code | `.../codex/thread/codex-user-input-mapper.ts` | Comparison | Images → `localImage`/`image` inputs; non-images → shared `Reference files:` section | — |
| 2026-10-08 | Code | `.../claude/session/claude-user-message-builder.ts` | Comparison | Images → base64/url image blocks; unreadable → visible text note; non-images → `Reference files:` | — |
| 2026-10-08 | Code | `.../acp/input/acp-prompt-builder.ts` | Comparison (text-only runtime) | ACP (text-only) lists every local context file, images included, in `Reference files:` | Precedent for path-based route |
| 2026-10-08 | Code | `autobyteus-ts/src/agent/message/multimodal-message-builder.ts`, `llm-request-assembler.ts` | Native comparison | Native (AutoByteus) builds multimodal LLM messages with images | — |
| 2026-10-08 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts:330`, `input/agent-run-provider-input-normalizer.ts` | URI form at backend | Every dispatch is normalized; `/rest/...` context-file locators (incl. draft uploads) resolve to absolute local paths before the backend | Applies to standalone, team-member, delegated runs |
| 2026-10-08 | Code | `services/agent-streaming/agent-stream-handler.ts:347-356`, `agent-team-stream-handler.ts:195-196` | Entry surfaces | `context_file_paths` → `ContextFile`, `image_urls` → `ContextFile(IMAGE)` for standalone and team-member sends | — |
| 2026-10-08 | Code | `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue` `onPaste`/`onDrop`; `utils/contextFiles/contextAttachmentSend.ts` | Pasted vs uploaded | Pasted image files and uploads both go through `uploadFiles` → stored locator; images sent as `imageUrls` | Pasted text lines become path/URL locators |
| 2026-10-08 | Code | `agent-collaboration/execution/task/task-execution-input.ts:38`, `agent-communication/services/global-agent-run-message-runtime-builders.ts:42` | Delegated / inter-agent files | `reference_files` are rendered into message **text** as `Reference files:` lines | Already reach AGY as text |
| 2026-10-08 | Code | `.../antigravity/capsule/agy-native-tool-policy.ts`, `agy-run-capsule.ts:46` | Tool availability | AGY agent allowlist always includes `view_file` | — |
| 2026-10-08 | Code | `grep user_input .../antigravity/stream/*.ts` (no hits) | UI echo | AGY `user_input` step is not projected to the UI; provider text changes do not alter displayed user message | — |
| 2026-10-08 | Web | https://antigravity.google/docs/cli/headless/ | AGY input contract | stream-json `content` = string or list of **text** blocks only; any other block type ends the session with an error | Inline images impossible |
| 2026-10-08 | Command | `agy --version` → `1.3.1`; `agy --help` | CLI capability | No image/attachment flag | — |
| 2026-10-08 | Code | `tests/unit/agent-execution/backends/{codex,claude,acp}/...` | Existing coverage | Image input tests exist for Codex, Claude, ACP; none for AGY | AC requires AGY test |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User attaches (upload/paste/drag) an image and sends a message to a standalone AGY run | UI → `SEND_MESSAGE` with `image_urls` → AgentRun normalizes to absolute path → AGY backend sends `content` text only | Image silently dropped; model unaware | backend line 76; screenshot | High |
| BEH-002 | User | Same with a non-image file (text, PDF, …) | Same path | File silently dropped (no path reference either) | backend line 76 | High |
| BEH-003 | User | Same, to a team member running on AGY | Team stream handler → member AgentRun → AGY backend | Same drop as BEH-001/002 | `agent-team-stream-handler.ts:195`; same backend | High |
| BEH-004 | System | Delegated task / inter-agent message with `reference_files` to an AGY run | Files rendered into message text `Reference files:` | Paths reach AGY; agent can `view_file` them | `task-execution-input.ts:38`; probe B/C show path route works | High |
| BEH-005 | User | Same attachment on Claude / Codex / native runs | Runtime-specific mappers | Images delivered inline; non-images as path references | mappers + tests | High (code/test evidence; not re-run live in this round) |
| BEH-006 | User | Viewing the sent message in UI / history | UI renders content + "Context files" thumbnails | Unaffected by provider payload | converter ignores `user_input` | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `agy-agent-run-backend.ts` `dispatchUserInput` | Sends text only | Root cause | Introduce AGY input mapping (message → text) like other runtimes |
| `agy-stream-process.ts` `sendUserMessage(content)` | Raw stdin writer | Keep a string/text-only contract | — |
| `autobyteus-ts/.../context-file-reference-section.ts` | Shared `Reference files:` builder; accepts absolute / `file:` paths, ignores `/rest/`, URLs | Reuse for parity | — |
| `agent-execution/shared/context-image-source.ts` | Classifies image URI: data URL / local path / http URL | Reuse for image classification | — |
| `agy-native-tool-policy.ts` | `view_file` always allowed | Path route always viable | — |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- AGY stdin NDJSON user line (`{"event":"user","message":{"content": string}}`). Readers: `agy` CLI. Evidence: `agy-stream-process.ts`, AGY headless docs.

### Structural Surfaces

- AGY backend input dispatch; shared reference-section helper; shared image-source classifier. No API, persistence, schema, security, or lifecycle surface changes identified.

### Potential Structural Impacts To Investigate

- API or external-contract change: None (AGY contract unchanged; text only).
- Persistence schema or invariant change: None.
- Security or privacy boundary change: Paths of server-stored attachments are exposed to the AGY agent (same as ACP/Codex non-image today); AGY runs with `--dangerously-skip-permissions` already.
- Concurrency or lifecycle change: None.
- Deployment / migration / ownership: None.
- Confirmed: absent.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| Probe A: `agy --new-project --model gemini-3.8-flash-low --input-format stream-json --output-format stream-json --dangerously-skip-permissions` with a `{"type":"image",...}` content block | Inline image to AGY | `result.status=ERROR`, `stream input content block type "image" is not supported (only "text")`, exit 1 | Inline image route impossible; must never send non-text blocks | `probe-evidence/probeA.out`, `probeA.err` |
| Probe B: text "What does this screenshot show?… Reference files:\n- /tmp/agy-img-probe/shot.png" | Path reference | Agent called `view_file{AbsolutePath:…png}` then accurately described the screenshot (quoted "her", "Context files", the DA reply) | Path + `view_file` gives real vision of the image | `probe-evidence/probeB.out` |
| Probe C: text "her\n\nReference files:\n- <real ~/.autobyteus/server-data/... png>", `--add-dir` a different folder | Realistic minimal message, file outside workspace | First action `view_file` on the image succeeded (path outside `--add-dir` readable). Default (non-app) agent then over-explored because "her" is ambiguous | Path outside workspace is readable; minimal text may leave intent ambiguous → explicit image wording is advisable | `probe-evidence/probeC.out` |
| Probe D: "her" + `Attached images (open each with view_file to see it):` + real path; models `gemini-3.8-flash-low` and `claude-sonnet-5-5-low` | Recommended wording | Gemini: first step `view_file` on the image, then described the screenshot. Claude-in-AGY: `RESOURCE_EXHAUSTED` 429 account quota (unrelated to images; plain text also failed) | Explicit wording works on Gemini; Claude-in-AGY unverified (environment limit) | `probe-evidence/probeD-*.out` |
| Desktop-app reproduction | User's report | Screenshot of failure | — | user screenshot |

Note: Live re-runs of Claude/Codex/native image input were not executed in this round; their behavior is established by code and existing unit tests.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (task) | Attached image must reach AGY agent; otherwise a clear, agreed message | Explicit | REQ-001..REQ-006 | DEC-001, DEC-002 |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| AGY CLI headless stream-json input | `agy` 1.3.1; antigravity.google/docs/cli/headless | Text blocks only; other blocks terminate session | docs + probe A | Future CLI may add image blocks (would be a separate improvement) |
| AGY native `view_file` | `agy` 1.3.1 | Loads images into model context when given absolute path | probes B, C | Size/format limits of `view_file` for images unknown |

## Persisted Data And State Facts

- Affected stored or external subject: None. Run history stores the user message and its context-file attachments independently of the provider payload.
- Remaining evidence gap: None.

## Product Design Request Context

- Product Design request in the current input: `Not stated`

## Product Design Findings

- N/A — not applicable

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `tickets/in-progress/agy-image-context-input/probe-evidence/` | Solution Designer | Raw AGY CLI probe outputs | Evidence only | REQ-001, REQ-005 | Final | Not behavior-defining |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | `view_file` limits for very large / unusual image formats (HEIC, TIFF) | Agent might fail to view some images | Agent's tool failure is visible in chat; acceptable | Open (non-blocking) |
| R-001 | Risk | Model may not open the image if the message gives no explicit cue (probe C ambiguity) | Core outcome | DEC-001 explicit wording | Open |
| R-002 | Risk | The `view_file` step appears as a tool call in the conversation | Minor UX difference vs inline runtimes | DEC-002 | Open |

## Architecture Investigation Findings

- Entry → backend path verified: `agent-stream-handler.ts:347` / `agent-team-stream-handler.ts:195` → `AgentRun` (`agent-run.ts:330` normalizes) → `AgyAgentRunBackend.dispatchUserInput` → `AgyStreamProcess.sendUserMessage(string)`.
- Sibling runtime input owners: `backends/acp/input/acp-prompt-builder.ts`, `backends/codex/thread/codex-user-input-mapper.ts`, `backends/claude/session/claude-user-message-builder.ts` — each backend owns its provider-input translation; AGY lacks one (root cause: local implementation defect).
- Test fixtures: `agy-turn-lifecycle.test.ts` `FakeProcess.sent` captures sent text; `agy-production-live.test.ts` shows the `AGY_LIVE=1` opt-in live pattern with real capsule/process.
- Docs to sync: `docs/modules/agent_execution.md` (~line 715, says image context files are sent inline — needs AGY exception), `docs/modules/antigravity_cli_runtime.md` (no input/context-file section yet).
- Claude-in-AGY live probing blocked by account quota until ~2026-10-10; non-blocking.

## Requirement Implications

- Inline image delivery to AGY is impossible under the current CLI contract; the only supported route is text with absolute paths that AGY's native `view_file` opens — proven to give the model real vision.
- Non-image files are also dropped today; parity with other runtimes requires the shared `Reference files:` section.
- Team-member runs share the same broken path; delegated/inter-agent reference files already work.
- A user-facing "can't deliver" message is unnecessary for local attachments; only non-local image sources (http URLs, data URLs) cannot be viewed and need explicit handling.

## Notes For Architecture Design

- Single fix point: AGY backend input dispatch (message → AGY text). Reuse `appendContextFileReferenceSection` / `collectContextFileReferencePaths` and `resolveContextImageSource`.
- Never send non-text blocks to AGY (session-terminating).
- Ensure non-empty text when a message contains only attachments.
