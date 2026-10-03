# Design Spec — Runtime Error Message Reporting

## Status / Scope / Approved Basis
- Package: antigravity-marketing-turn-failure. Current solution round: SR-003.
- Design status: **Ready**. Approved intended-behavior baseline: **SR-002**, clarified in SR-003 to ordinary runtime messages, not hypothetical giant logs.
- Explicit user approval, 2026-10-03: “of course not entire log.” Then: “this is common software engineering practice. lets go i think requirement is clear now”. Latest feedback reinforces concise normal error messages and proportionate engineering. No further approval hold.
- Requirements: /Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-marketing-turn-failure/tickets/in-progress/antigravity-marketing-turn-failure/requirements-doc.md
- Canonical investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-marketing-turn-failure/tickets/in-progress/antigravity-marketing-turn-failure/investigation-notes.md
- Supplements: factual E-001–E-006 and historical records only; no behavior-defining or Product supplements.
- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-marketing-turn-failure; branch codex/antigravity-marketing-turn-failure; recorded refreshed base origin/personal @ fe37e693e6f4f1ed0d2f12ed3d83d9106ea037d1; finalization target origin/personal through delivery gates.

## Current-State Read / Architecture Evidence
Investigation E-006 owns exact sources/commands. Confirmed: shared public error transport and UI already preserve and display normal message strings. The identified message loss is upstream:
1. AGY terminal result explicitly supplies an error string (or message-bearing error record), but its converter emits a fixed generic message.
2. Claude's installed SDK 0.3.280 exposes `SDKResultError.errors: string[]`; the existing terminal resolver ignores that field and can fall back generically despite useful text being present.
Native, Codex and ACP/Grok already have informative error-message paths. Do not rewrite these healthy paths merely because the requirement is general. No frontend transport/type/layout change is required for the core fix.

| E-006 source | Technical observation | Decision |
| --- | --- | --- |
| AGY converter result branch and existing errorText; deployed branch E-003 | Proper owner has raw message and separate diagnostic callback; blanket generic text discards cause | Change local failed-result message selection, not runtime lifecycle |
| Claude session-output-events; deployed SDKResultError type; tracker/session | Message extraction misses actual errors[] contract; tracker already governs terminal failure | Extend existing text resolver, preserving scalar precedence and settlement logic |
| autobyteus-ts/src/llm/errors/provider-error.ts + public indexes | Credential redaction already exported and used for native provider errors | Reuse existing redactProviderSecrets; no copied patterns or new framework |
| AgentRun/pipeline; Agent/Team/collaboration projectors | Message string and lifecycle/error metadata have current public contracts | Reuse unchanged pipeline and projection |
| ErrorSegment.vue / agentStatusHandler.ts | Normal message is rendered as text; no whole-error JSON view | Existing error UI displays corrected message without redesign |

## Intended Change
Pass the runtime's **normal supplied error message** to the existing UI. No recognized-error allowlist, quota/rate-limit mapping, log pipeline, reset parser, invented HTTP code or normal-message truncation.

### AGY terminal result
In `AgyStreamEventConverter.result`, keep current failure predicate, private diagnostic callback, text/tool closure and terminal error code/scope/effect. For public `message`, use the current local `errorText(payload.error)` extraction (string or record.message), trim insignificant outer whitespace and apply exported `redactProviderSecrets`. If no usable text exists, retain the existing “Antigravity could not complete this turn.” fallback.
- Do not append or serialize payload.response, usage, private provider diagnostics or whole error objects.
- Do not modify native-image denial/tool redaction or other tool-success semantics.
- Preserve runtime text such as “Individual quota reached ... Resets in 3h28m50s.” as reported; no timing arithmetic or translation.
- Keep code `AGY_TURN_ERROR`; do not infer `429` from wording. Existing provider metadata contract remains unchanged; no new field required.

### Claude terminal result
Extend `resolveResultErrorText` in the existing `claude-session-output-events.ts` to include non-empty string entries from the SDK's `errors[]`, joined in source order into one normal error message. Preserve existing scalar-field precedence (`result`, `message`, `error_message`, string `error`); use the errors list when those supply no text. Do not stringify malformed/non-text entries. Apply the same existing credential-redaction primitive to selected terminal text.
Keep authentication recognition, result-error codes, turn correlation, interrupted/settlement behavior and missing-message fallback unchanged. Do not start treating an unrelated SDK event as terminal merely because it carries an errors field.

### Existing public/UI paths
No new production changes to healthy Native/Codex/ACP/Grok converters, common event pipeline, Agent/Team/Org DTOs, error handler or shared Vue card. Protect them with focused regressions and prove actual corrected text through public transport and rendered card. A generic status/header remains valid; the explanation below it must be actual runtime text.

## Relevant Behavior And Production-Path Map
| Behavior / approved IDs | Trigger / existing evidence | Target or preserved outcome | Production path / spine |
| --- | --- | --- | --- |
| BEH-001; REQ-001/002; AC-001/002/005 | Ordinary runtime/provider failure; AGY incident E-001–004, message contracts E-005/006 | Preserve normal actual message, including unfamiliar causes, not genericize all failures | Runtime producer extraction -> canonical ERROR -> AgentRun -> public Agent/member projection -> UI; DS-001/002 |
| BEH-002; REQ-004; AC-004/005 | User sends next message after failure; actual same-conversation retry E-001/002 | Existing user-driven dispatch/restore; no automatic recovery or reset | UI send -> AgentRun admission/dispatch -> existing backend/restore -> same provider conversation; DS-003 |
| BEH-003; REQ-002/003; AC-002/003/005 | Supplied normal message, missing/unusable text or credential fragment | Existing redaction/plain-text rendering; generic only when no useful message; private responses remain private | Adapter selection/redaction -> unchanged error projection/rendering; private diagnostics off-spine; DS-001/002/004 |

## Supplemental Context
Retain observed runtime-summary.json, native quota excerpts, deployed snippet and source hashes under evidence/. They ground the incident, not a quota-only design. History/SR-001 and SR-002 files are audit-only, not competing requirements. Canonical full inventory and absolute paths are in investigation-notes.md and solution-result.md. Product/prototype artifacts: N/A — not requested.

## Task Design Health Assessment
- Change posture: **Behavior Change / focused bug fix** in runtime message extraction.
- Current design issue: **Yes**, two local extraction defects relative to now-approved general feedback intent.
- Root cause: **Local Implementation Defect** (AGY blanket suppression; Claude omitted supported message field), not owner/boundary fragmentation.
- Refactor needed now: **No**. Existing converters/resolvers own external-message extraction; UI and projections already serve the intended behavior. Existing redaction export is reusable without changing dependency direction. Two local edits do not overload owners or need a new helper/service.
- Design response: change the affected message selections, remove blanket suppression for usable AGY errors, add supported Claude errors[] extraction; leave public lifecycle and identity untouched.
- Deferrals: comprehensive logging/error-classification/recovery framework intentionally out of scope, not required remediation. Actual external quota availability remains provider-controlled.

## Terminology
“Runtime error message” means runtime/provider error text from its error-message fields, not stdout/stderr logs, stack traces or an entire result/response object. “Fallback” means no useful supplied text; it is not a whitelist for familiar causes.

## Legacy Removal Policy / Removal Plan
Policy: no backward-compatibility wrappers or dual behavior.
| Remove / decommission | Replacement | Scope |
| --- | --- | --- |
| AGY unconditional generic public message for a usable terminal error | Actual message extraction + existing redaction in same converter branch | This change |
| Claude silent omission of supported errors[] | Existing terminal resolver extended to consume string list | This change |
| Existing tests requiring generic text for all meaningful terminal errors | Message-preservation tests plus legitimate missing-message fallback and secret/private-response regressions | This change |
No old feature flag, version switch, compatibility wrapper or parallel error pipeline. Existing missing-message fallback remains required current behavior, not legacy compatibility.

## Persisted Data / State Transition Decision
**Directly Usable — No Migration** for existing presentation/error records; private diagnostics/history/capsules are unchanged.
- Existing string message/detail slots can carry informative future messages; old generic strings remain valid and need no rewriting.
- No storage schema, serialization shape, reader/writer invariant, provider-binding or physical store changes. Inspected incident has 145 raw-trace rows and unchanged Team/conversation identity; do not reset or rebuild them.
- No new persisted error archive; current history availability remains as-is.
- Migration plan/admission gate: N/A — no incompatible data/transformation. Do not introduce migration or startup gating just for a new string value.
- Protects REQ-004 / AC-005. Current explicit public error contracts already accept text messages; private diagnostic callback stays separate.

## Data-Flow Spine Inventory / Narratives
| ID / scope | Start -> end / governing owner | Narrative |
| --- | --- | --- |
| DS-001 Return-Event | AGY/Claude result -> user error card; backend source-event owner then AgentRun | Runtime supplies a normal error; existing adapter selects text, reuses credential redaction and emits the same canonical failed-turn event. AgentRun's serialized pipeline preserves it, and current public transport/UI shows it. |
| DS-002 Return-Event | Canonical Agent ERROR -> hosted Team/Org member error card; collaboration presentation owner | Existing member adapter/projection attaches current execution identity and forwards the same message to Team stream/renderer. No Team-specific message rewrite. |
| DS-003 Primary End-to-End (preserved) | User continuation -> same provider conversation; AgentRun admission and backend lifecycle | A next user message uses current admission/FIFO or exact restore and reaches provider. Whether it fails or succeeds remains provider-governed; this change only explains the result. |
| DS-004 Bounded Local | Runtime result -> field selection -> redaction -> ERROR; existing converter/resolver | Pure field selection, no asynchronous I/O or mutable policy. AGY result still clears its turn; Claude tracker still owns settlement. |

### Primary Execution / Return Chains
- Preserved work/continuation: `Chat input -> current Agent/Team command surface -> AgentRun admission/dispatch -> backend (existing restore when needed) -> provider conversation`.
- Error return: `Provider result -> AGY converter / Claude terminal resolver+tracker -> AgentRun source-event pipeline -> Agent mapper or collaboration member adapter/projector -> streaming error handler -> ErrorSegment.vue`.
- Local selection lives under the existing adapter; it is not a new standalone orchestration layer.

## Main-Line Nodes / Ownership Map
| Node | Ownership |
| --- | --- |
| Runtime provider | Meaning/content of reported error; no AutoByteus inference of quota, code or reset |
| AGY converter / Claude resolver | Select supplied error-message fields; preserve current terminal event semantics; use current redaction |
| Backend/tracker and AgentRun | Existing process/turn lifecycle, identity, serialized dispatch/admission; unchanged |
| Public Agent/member adapters | Existing error DTO and execution identity; preserve normal message; unchanged |
| Error handler / Vue card | Copy message into segment and render inert text; unchanged |

## Off-Spine Concerns
| Concern | Serves | Responsibility / placement |
| --- | --- | --- |
| Existing redactProviderSecrets | Adapter message extraction | Current known credential-fragment redaction; import public autobyteus-ts export, no copied regex or new registry |
| Existing AGY private diagnostic sink | Backend/converter | Original bounded private diagnostic payload; not sourced by UI; unchanged |
| Error metadata and lifecycle finalizer | AgentRun/public projection | Existing code, scope/effect, current turn and status; do not reclassify failures to make message visible |
| Existing error-card text rendering | User feedback | Vue interpolation; do not use raw HTML or whole JSON dump |

## Boundary Encapsulation / Dependencies / Interfaces
- Use existing backend source-event boundary -> AgentRun pipeline -> public adapters; no direct UI access to private provider diagnostics or native conversation DB.
- Server adapters may import `redactProviderSecrets` from the existing public `autobyteus-ts` dependency. Web must not import core/backend/private files; web-boundary rule unchanged.
- Interface `AgyStreamEventConverter.result(payload, turnId)`: one provider conversation already validated by convert; preserves current run/turn identity and canonical error event.
- Interface `resolveClaudeTurnTerminalError(chunk)`: pure result-message resolution; does not own session/lifecycle. Existing tracker supplies correlation/settlement and existing session builder emits canonical error.
- Existing Agent/Team public error interfaces remain message/code/details/scope/effect/turn identity; no ambiguous selectors, new DTOs or route changes.
- Interface/naming checks: responsibilities singular, identity meaning already explicit, selector risk Low. No new public facade; existing mapper/projector remain thin transport boundaries, not new policy owners.

## Capability Reuse / Subsystem Allocation
| Concern | Existing owner | Decision |
| --- | --- | --- |
| AGY actual error field | AGY stream converter | Extend existing branch |
| Claude supported error list | Claude terminal output resolver | Extend existing resolver |
| Credential redaction | Core provider-error export | Reuse unchanged primitive |
| Public error propagation/rendering | Existing Agent/collaboration streaming + shared renderer | Reuse unchanged contracts and UI |
| Tests / docs | Existing server/runtime tests, web error handler/card/probe, runtime module docs | Extend focused coverage/documentation; no new runtime subsystem |

## Draft -> Reusable -> Final File Responsibilities
Draft candidates are the two existing producer files. A separate “runtime error service”, shared transformer, formatter registry or log sanitizer would add indirection without a new owning responsibility, so none is introduced. Existing shared redaction is reused as-is; duplicated regex/type extraction should not be added.

| Path (relative to worktree) | Change / owner / final responsibility |
| --- | --- |
| autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts | **Modify**: public terminal error uses current errorText + existing credential redaction + missing-text fallback; no tool/lifecycle change |
| autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-output-events.ts | **Modify**: recognize actual SDK errors[] in current text precedence and reuse existing credential redaction; no tracker/process rewrite |
| autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/{agy-stream-event-converter,agy-turn-lifecycle,agy-provider-diagnostic-sink}.test.ts | Extend/update affected extraction/privacy/lifecycle expectations; sink only if tests require, not production changes |
| autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/{claude-session,claude-turn-tracker}.test.ts | Protect existing auth/terminal behavior, add actual errors[] cause propagation; direct resolver test may be added beside them if clearer |
| autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs and tests/e2e/runtime/agy-failure-transport.e2e.test.ts | Extend controlled normal runtime-error cases and user-driven retry; keep existing native-image denial and private-response cases |
| Existing Agent/collaboration projection and Codex/ACP/native error tests | Focused message-preservation regressions, not production rewrites |
| autobyteus-web/components/conversation/segments/__tests__/ErrorSegment.spec.ts (new test if needed), existing agentStatusHandler tests and browser error probe/fixture | Verify normal actual message reaches rendered card and stays inert text. Production renderer source unchanged unless a demonstrated rendering defect requires a Design Impact |
| autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md; applicable error note in agent_execution.md | Docs sync to useful ordinary messages, fallback/privacy/lifecycle preserved; delivery owns final sync |

Folder boundary check: retain existing backend/stream and backend/session owner folders; tests colocated with their server/web conventions. No folder/move/delete/new production file. Shared exported redaction remains under current core provider capability; no shared catch-all.
Shared data-model check: no new model; current string message and explicit scope/effect stay tight, no raw-error/response shadow fields or parallel representations.
Applied pattern: existing adapter translation. No new pattern, manager, state machine or layering architecture.

## Concrete Examples / Compatibility Rejection
- AGY error `Individual quota reached ... Resets in 3h28m50s.` -> same useful message text in existing error card; private response is not concatenated.
- Unfamiliar ordinary error `Workspace service temporarily unavailable` -> that actual text, not an allowlist-dependent fallback.
- Claude failed SDK result with `errors: ["Rate limit reached. Try again later."]` and no scalar message -> current error event now contains that reason.
- `token=PRIVATE_AGY_SECRET` -> existing credential redaction, not raw secret exposure; no normal-message cap framework needed.
- Missing useful error message -> current truthful generic fallback.
Rejected: quota lookup table, reset calculator, runtime-version branches, feature flag retaining generic suppression, whole JSON serialization, private-log UI access, global new error transformer. They either violate approved scope, duplicate current owners or add unnecessary compatibility/policy.

## Change Sequence / Guidance
1. Reconfirm approved requirements/worktree and use the existing public redaction export; no live user mutation.
2. Make the two focused producer-extraction edits; preserve event payload identity/lifecycle fields and existing scalar-message precedence.
3. Update obsolete blanket-generic test assertions; add normal-message, missing-message, existing secret/private-response, Claude errors[], unfamiliar error and subsequent-turn controls. Do not add special quota logic just to pass examples.
4. Run implementation-scoped backend checks and rendered message proof. API/E2E specialist verifies controlled real-server public transport (Agent + hosted member), existing UI and cleanup. Follow TESTING.md; never test against localhost:8001/user data.
5. Sync applicable runtime docs, then downstream validation/delivery gates. No release/restart/user-run recovery is claimed by this design.

### Verification Intent (Not Execution Claims)
- Server focused Vitest paths above via `pnpm -C autobyteus-server-ts exec vitest run <paths> --no-watch`.
- Controlled AGY failure transport: `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<absolute worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-failure-transport.e2e.test.ts --no-watch`; extend to hosted Team error path in the test-owned server if not covered.
- Rendered proof through existing error component/handler and browser-equivalent probe; `pnpm -C autobyteus-web test:nuxt <selected tests> --run` and an owned browser fixture. A full real-product journey, if selected, must use a built isolated worktree instance per TESTING.md; screenshots alone are not assertions.
- Representative existing native/Codex/ACP/Grok message projection remains specific; do not execute real quota exhaustion just for proof. Runtime SDK contract was read, not a live Claude error reproduction.
- No tests executed by Solution Designer; Implementation and API/E2E own actual test evidence.

## Tradeoffs / Residual Risks
- General user outcome with two targeted producer fixes is simpler and safer than rewriting already informative paths. Further demonstrable message-loss findings can return as Design Impact under approved REQ-001; don't invent additional scope.
- Normal runtime-message shape comes from current contracts; unexpected non-text fields retain fallback. This is not a future-upstream compatibility promise.
- Existing credential redaction is reused, not a guarantee of detecting every secret. Private responses/logs remain excluded; ordinary user-visible causes are deliberately no longer fully suppressed.
- External quota still prevents execution until provider allows work. No automatic retry or future reset guarantee.

## Task Size And Architectural Risk — Completed Design Classification
- **task_size: Medium.** Two small producer edits within existing runtime-adapter ownership plus focused backend/transport/renderer tests/docs; several files/components, no substantial feature/refactor. Artifact/evidence volume does not drive size.
- **architectural_risk: Low.** Existing message string contract, adapter owner, exported redaction, event/lifecycle pipeline, rendering, dependency direction and persistence remain. No new API/data field, migration, security-control framework, disclosure of full diagnostics, concurrency/recovery rule or deployment change. The deliberate normal-message presentation delta uses an already-established public error channel and existing credential controls; it is not a new raw diagnostic boundary.
- Structural versus payload check: actual source delta is two message-extraction branches; surrounding runtime structure is unchanged. Payload delta is useful error text, current fixtures/tests/docs. No new shared type/runtime owner.
- Escalation: return to Solution Designer for Design Impact/reclassification if implementation requires a new contract/schema, runtime owner, shared security/persistence/lifecycle change, direct private-log exposure or a genuine renderer defect beyond current string display. Behavior/scope changes require renewed explicit approval; don't broaden silently.
- Independent review artifacts: **N/A — not applicable to this completed Medium/Low classification under the current direct implementation route confirmed by get_handoff_rules**. Implementation self-checks and executable validation still apply.
