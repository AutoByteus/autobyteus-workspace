# Design Review Report — `grok-build-runtime-support`

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/requirements-doc.md` (Approved, SR-005 baseline + SR-006 wording + SR-008 clarifications + SR-009 REQ-017/AC-015 deferral + SR-011 user-approved AC-004 amendment, CR-006)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/design-spec.md` (SR-011, status Ready)
- Supplemental Task Artifacts Reviewed: `evidence/grok-acp-probes/*` (wire logs `handshake`, `prompt`, `permission`, `mcp`, `mcp2`, `load`, `cancel`; probe harness; `sdk-replay.mjs`), `evidence/acp-registry-2026-09-26.json`, `evidence/dsh-acp-0.0.1-rc.1-README.md`
- Relevant Solution Revision IDs: SR-005, SR-006, SR-007, SR-008, SR-009, SR-010, SR-011
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: `3`
- Trigger: Solution Designer round-3 handoff "Architecture Design Complete" (SR-011), which follows code-review failure-origin review CRR-002 on API/E2E API-REV-001 (CR-002, CR-004, CR-005, CR-006, CR-007), 2026-09-26
- Prior Review Round Reviewed: Round 2 (`ARCH-REV-002`, Pass; AR-005 editorial open). Round 1 (`ARCH-REV-001`, Fail) resolved in round 2
- Latest Authoritative Round: `3`
- Current-State Evidence Basis:
  - Round 3: worktree at `2b31b046d` (implementation commit on `e06080b00`; API/E2E test files uncommitted). I re-read:
    - SR-009, SR-010 and SR-011;
    - the amended requirements (AC-004, REQ-005 rationale, REQ-017/AC-015 deferral, approval note);
    - ARC-26..ARC-29;
    - design-spec SR-011 (DS-001, DS-002, the factory, bridge, capability, launch-profile and session-profile rows, the "SR-011 Revision" table);
    - `code-review-report.md` section "API/E2E Failure-Origin Review (Round 2, CRR-002)".
  - I verified the CR-004 surfacing path in code: `agent-run-manager.ts:144-176,369-387`, `errors.ts`, and `standalone-agent-run-lifecycle-service.ts:262-290`.
  - I checked the implemented contract `backends/acp/acp-agent-session-profile.ts` against the CR-002 text sync (`mcpReadiness`, `AcpExtEffect`), and the session states `prompting`/`cancelling` in `acp-agent-session.ts`.
  - Round 2: the worktree is at `origin/personal` @ `e06080b00` (verified with `git log -1`; only the ticket folder is untracked). I re-read the revised requirements (REQ-011, REQ-016, AC-004, AC-009, AC-013, DEC-006), ARC-20..ARC-25, design-spec SR-008 (including the "SR-008 Review Resolution" table) and the SR-008 entry.
  - I re-derived the ordering of per-call usage frames against the prompt result from the `prompt`, `permission`, `mcp2` and `cancel` logs. I re-checked Grok docs `05-configuration.md:228-230` (ask_user_question waits up to 1800 s) and `:378-384` (`GROK_WORKFLOWS`), and confirmed that `tickets/done/claude-ask-user-question-disallow` exists.
  - Round 1 basis (still valid; ARC-25 and my own round-1 delta check show no seam change): `agent-run-manager.ts`, `agent-run-backend.ts`, AGY factory and backend, `antigravity-model-catalog.ts`, `claude-sdk-client.ts`, `token-cost-calculator.ts`, `token-usage-component-basis.ts`, `supported-model-definitions.ts`, `system-instruction-capture-service.ts`, wire logs and local Grok 1.0.41 docs.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: new ACP protocol client and dependency, new shared subsystem boundary (REQ-018), bidirectional JSON-RPC child per run, permission mapping, persisted provider-id binding. Unchanged in SR-008.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes (REQ-001..REQ-018 as clarified in SR-008, SR-009 and SR-011).
- Round-3 approval basis (Solution Designer/user authority; recorded, not adjudicated here):
  - CR-006: the AC-004 deny amendment was explicitly approved by the user (SR-011 quote).
  - CR-005: the REQ-017/AC-015 application-launch outcome was deferred at the user's direction, relayed by `/api_e2e_engineer` (SR-009). The known STC-002 gap is stated in AC-015.
  - CR-007: the REQ-005 rationale was clarified by precedent under the user's standing direction; the requirement text is unchanged. Precedent verified by the Solution Designer in ARC-27 (Codex `on-request` + sandbox, Claude `default`).
- Relevant existing behavior and evidence confirmed: Yes. The round-1 evidence stands, and ARC-25 plus the round-1 delta inspection show no seam change on `e06080b00`.
- Scope guardrail confirmed: Yes.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` (no blocking findings remain).
- Remaining material ambiguity, if any: None blocking.
  - SR-008 wording clarifications. REQ-011/AC-009 (one record per model call, same totals and pricing intent) and AC-004 (canonical `run_bash`) are consistent with the round-1 classification "Changes approved behavior: No".
  - REQ-016/AC-013 now name `workflow`. This follows from the approved "native subagent spawning is disabled" (P-01).
  - REQ-016/AC-013 also name `ask_user_question`. This is precedent-derived under the user's standing SR-003 direction to resolve such decisions from existing runtime implementations. The Claude precedent is `AskUserQuestion` in Claude's disallowed list and ticket `claude-ask-user-question-disallow`. The addition is recorded as the only intended-behavior change in SR-008, and the Solution Designer reports it to the user with a revert-before-implementation path if the user objects. Approval authority belongs to the Solution Designer and user; this review does not adjudicate it and records it as a residual item.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | User | Pass | Pass | Pass | Confirmed | — (AR-001 resolved) |
| BEH-004 | User | Pass | Pass | Pass | Confirmed | — (AR-003 resolved; CR-006 deny classification verified, see DS-002/DS-008 note) |
| BEH-005 | User/System | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | System | Pass | Pass | Pass | Confirmed | — (AR-002 resolved; stale map-row text, AR-005) |
| BEH-008 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-009 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-010 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-011 | Operational | Pass | Pass | Pass (run start); restore wording overclaims | Confirmed | AR-006 (non-blocking) |
| BEH-012 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-013 | User | Pass (launch outcome deferred by user, SR-009) | Pass | Pass (wiring only) | Confirmed | — (STC-002 separate ticket) |
| (REQ-018) | Structural | Pass | Pass | Pass | Confirmed | — (AR-004 resolved) |
| (REQ-014) | Preserved | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/grok-acp-probes/*.log.jsonl` | Pass | Pass | Pass | Pass | Pass | — (ARC-20..ARC-23 now carry the per-call semantics) |
| Probe harness / `sdk-replay.mjs` | Pass | Pass | Pass | Pass | Pass | — |
| ACP registry snapshot, DSH README | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature; `No Design Issue Found` | — |
| Root-cause classification is explicit and evidence-backed | Pass | Runtime-keyed seams (ARC-01/02/16/18); delta ARC-25 | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | No refactor; deferrals (0)–(3) incl. new DSH prompt-delivery limit | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Deferrals would touch existing runtimes (REQ-014) | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 create | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 turn | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 stream | Return-Event | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 approval | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 interrupt | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 restore | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 catalog/availability | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-008 session state machine | Bounded Local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-009 `autobyteus` catalog | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

Round-2 DS-002/DS-008 check: per-call usage effects apply only in `prompting`/`cancelling`. In all four recorded tool-using turns, every `response_completed` frame precedes `turn_completed`, `prompt_complete` and the prompt result:

- `prompt`: lines 116, 161 < 166
- `permission`: 81, 145 < 150
- `mcp2`: 87, 119, 135, 223 < 228
- `cancel`: no completed call before the cancelled result

So turn-scoped application loses no reported call. Replay-time usage frames are dropped in `opening(load)` (ARC-23), and a `tool_call` without `status` counts as `pending` (P-04 carried into the design).

Round-3 DS-002/DS-008 check (CR-006):
- Grok's `stopReason:"cancelled"` is classified by the session's own state:
  - `cancelling`, entered only by a user interrupt through `AcpAgentSession.cancel` → TURN_INTERRUPTED;
  - `prompting` with a user `reject_once` answered in this turn (per-turn flag, reset at turn start, set only by a user decision reported by the bridge, never by bridge `cancelled` answers) → TURN_COMPLETED;
  - `prompting` without a denial → TURN_INTERRUPTED.
- The interrupt check comes first, so a denial followed by an interrupt in the same turn stays interrupted.
- The classification uses only state the shared session owns, so it stays runtime-neutral (AC-016).
- No synthetic prompt is sent.
- Evidence: ARC-28, live API/E2E runs 3/4.
- The ERROR-terminal rule (JSON-RPC error → one turn-terminal ERROR, no extra TURN_COMPLETED) matches the shared domain contract. `agent-run.ts:364-375` and `agent-run-error-evidence.ts` treat an `ERROR` with `error_scope:"turn"`, `error_effect:"terminal"` and `turn_id` as that turn's terminal.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AcpAgentRunBackend` | Pass | Pass | Pass | Pass | — |
| `AcpAgentRunBackendFactory` | Pass | Pass | Pass | Pass | — |
| `AcpClientConnection` / `AcpAgentProcess` | Pass | Pass | Pass | Pass | Pre-registration buffering now owned by the connection |
| `GrokBuildModelCatalog` / `GrokBuildCapability` | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `acp/*` → SDK and shared services | Pass | Pass | Pass | Pass | Capabilities read standard fields only |
| `grok/*` → `acp/*` | Pass | Pass | Pass | Pass | — |
| Existing runtimes ↛ ACP | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `AcpAgentLaunchProfile` | Pass | Pass | Pass | Low | Pass |
| `AcpAgentSessionProfile` (`interpretExtNotification → AcpExtEffect[]`, `projectToolCall`) | Pass | Pass | Pass (`sessionId`, `turnId`, `callOrdinal`, `toolCallId`) | Low | Pass. The session owns ordinals, replay suppression and effect timing; the profile stays pure |
| `AcpAgentRunBackend.approveToolInvocation` | Pass | Pass | Pass | Low | Pass |
| `GrokBuildModelCatalog.listModels/findExactCurrent` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared prompt/tools/MCP/skills/capture/token payload and pricing | Pass | Pass | N/A | Pass | — |
| JSON-RPC stdio transport | Pass | Pass | Pass | Pass | — |
| Built-in tool restriction | Pass | Pass | N/A | Pass | Documented env switches (ARC-24), same mechanism as `GROK_SUBAGENTS` |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `runtime-management/acp`, `runtime-management/grok`, `backends/acp`, `backends/grok`, seams, web, `autobyteus-ts` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Profile contracts, `AcpToolCallProjection`, `AcpExtEffect` | Pass | Pass | Pass | Pass | `AcpExtEffect` is a closed, tight union (`usage` / `mcp_status`) |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AcpAgentRunContext` | Pass | Pass | Pass | N/A | Pass | — |
| `AcpToolCallProjection` | Pass | Pass | Pass | N/A | Pass | — |
| `AcpAgentCapabilities` | Pass | Pass | Pass | N/A | Pass | Standard fields only (AR-004 resolved) |
| `AcpExtEffect` | Pass | Pass | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `acp/*` | Pass | Pass | Pass | Pass | — |
| `backends/acp/*` | Pass | Pass | Pass | Pass | — |
| `backends/grok/grok-build-call-usage.ts` (renamed from `…turn-usage`) | Pass | Pass | N/A | Pass | — |
| `backends/grok/grok-build-session-profile.ts` | Pass | Pass | N/A | Pass | `_meta` = `rules`, `yoloMode` only |
| Other Grok and seam files | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `runtime-management/{acp,grok}`, `backends/acp/{backend,session,events,input}`, `backends/grok` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `grok-4.6` row, schema text, test pins | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Grok catalog row; headless fallback; rules re-injection | No | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Run metadata | Directly Usable — No Migration | Pass | Pass | N/A | Pass | — |
| Token-usage records | Directly Usable — No Migration | Pass | Pass | N/A | Pass | New `grok_acp_call` ingestion kind; open strings |
| `grok-4.6` selections | Directly Usable (reselection policy) | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–9 | Pass | Pass | Pass | Pass |
| Step 5 (env-switch confirmation) | Pass | N/A | N/A | Pass. Failure branch is stop-and-return, consistent with escalation (a) and AC-013 |
| Base currency | Pass | N/A | N/A | Pass (`e06080b00`, ARC-25) |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `session/new`, team tool call, shell, edit, per-call usage, launch args/env | Yes | Pass | Pass | Pass | The usage example shows two per-call records summing to the turn |

## Material Premise Validation (Only When Needed)

All round-1 premises were re-checked against SR-008. Their witnesses, set out in full in the round-1 result and summarized in `ARCH-REV-001`, are unchanged and restated concisely here. The design's own records are investigation-notes ARC-20..ARC-24.

- `P-01` — the model launches child agents via `workflow`: `Reachable`. It is now prevented by `GROK_WORKFLOWS=0`, and step 5 confirms the effect with a stop-and-return failure branch.
- `P-02` — a turn's aggregate input crosses the 200k tier while each call is within it: `Reachable`. It is now handled by per-call records, where the tier is selected per request from `input + cache` (ARC-21).
- `P-03` — MCP ready status arrives before the `session/new` response: `Not Reachable`. The connection-level buffering statement was added without new machinery.
- `P-04` — the idle timer fires during approval deliberation: `Not Reachable`. The pending-default rule is now explicit in DS-008.
- `P-05` — a cancelled turn loses the usage of completed calls: re-classified from `Unclear` to `Not Reachable` under the per-call design. Completed calls emit `response_completed` before the prompt result and are recorded while `cancelling` (ARC-22 and the ordering evidence above). A call aborted in flight is never reported by Grok; REQ-011/AC-009 now state that limit.

### `P-06` — Reopening a Grok run while the host `grok` is not authenticated

- Related approved requirement or established contract: REQ-015/AC-012 (provider text visible at run start or turn); REQ-008/AC-006 (restore failure is terminal); REQ-014 (shared restore behavior of the other runtimes preserved).
- Relevant behavior ID(s): BEH-006, BEH-011.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger: the operator reopens a stopped Grok run from run history (SCN-006) while the host CLI is logged out (SCN-010).
- Support evidence: ARC-29 (unauthenticated Grok returns `-32000 "Authentication required"` on session setup and stays up).
- Forward path: `standalone-agent-run-lifecycle-service.restoreStarted → AgentRunManager.prepareRestoreAgentRunFromPlatformState → factory.restoreBackend → session/load RequestError → AgentCreationError (CR-004)`. Then `agent-run-manager.ts:170-171` rethrows only `AgentRunActivationError` unchanged. Any other error, `AgentCreationError` included, is wrapped as `PlatformAgentRunRestoreError("The persisted provider conversation could not be restored.", cause)`.
- Lifecycle preconditions and material consequence:
  - Restore fails terminally as AC-006 requires. The provider text is kept as `cause`, not as the surfaced message.
  - This is the existing shared restore behavior for every external runtime, so changing it would modify shared manager behavior (REQ-014).
  - It does not violate an approved acceptance criterion, but DS-001's statement that "`createAgentRun`/restore show the provider text" is inaccurate for restore.
- Reachability: `Reachable` (the consequence is text accuracy only).
- Review consequence / proportionate response: AR-006, non-blocking. Correct the DS-001 wording so downstream roles do not test for provider text on reopen.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass`. The behavior basis is confirmed, the design is ready for implementation, and no in-scope machinery depends on an unsupported premise.

## Findings

Resolved in round 2: AR-001, AR-002, AR-003, AR-004. Resolved in round 3: AR-005 (SR-009 editorial fix, verified: BEH-007 row, escalation (b), terminology).

### AR-006 — DS-001 overclaims that restore surfaces the provider error text

- Type: `Design Impact`
- Severity: Low (non-blocking; text accuracy)
- Protected: REQ-014 (shared restore wrapping unchanged); REQ-008/AC-006; REQ-015/AC-012 scope ("run start or turn")
- Scope status: `Within Approved Scope`
- Changes approved behavior: `No`
- Evidence: P-06. DS-001 says the converted `AgentCreationError` means "`createAgentRun`/restore show the provider text". That holds for create (`agent-run-manager.ts:384`). On restore, `prepareRestoreAgentRunFromPlatformState` wraps it into the generic `PlatformAgentRunRestoreError` (`agent-run-manager.ts:170-171`), keeping the provider text only as `cause`.
- Required update: reword DS-001 and the CR-004 row to say:
  - create shows the provider text;
  - restore fails terminally through the existing `PlatformAgentRunRestoreError`, with the provider text kept as `cause` (same as the other runtimes);
  - the factory-level restore unit test asserts the `AgentCreationError` message, not the surfaced text.

  If the Solution Designer judges that AC-012 requires provider text on reopen, that is a `Requirement Gap`, because it changes shared restore behavior for all runtimes (REQ-014).
- Why proportionate: this is a wording correction only. It prevents a downstream reviewer or API/E2E false failure on reopen.
- Recommended recipient: `/solution_designer` (informational). The implementation proceeds per the corrected reading.

### AR-005 — Stale per-turn usage wording in two design-spec lines (Resolved in round 3)

- Type: `Design Impact`
- Severity: Low (non-blocking; editorial)
- Protected: REQ-011 / AC-009 (consistency of the design basis)
- Scope status: `Within Approved Scope`
- Changes approved behavior: `No`
- Evidence:
  - `design-spec.md` Behavior Map row BEH-007 still reads "Per-turn usage priced by catalog" and cites only ARC-11/12.
  - Escalation trigger (b) still gives "prompt-result `_meta.usage` absent" as its example, although the design no longer uses that source.
  - Terminology still says "usage extraction". The authoritative sections are all correct: DS-002/003/008, the off-spine row, the interface, the examples, and the guidance "Never derive usage from the prompt result".
- Required update: align the three phrases with the per-call design (for example, BEH-007 → "Per-call usage priced per request by catalog" citing ARC-20..23; trigger (b) example → "`response_completed` usage absent"). The update can be made by the Solution Designer at the next artifact touch or by the implementer when the doc is synced. It does not block implementation.
- Recommended recipient: `/solution_designer` (informational)

## Classification

N/A — Pass (AR-006 is a non-blocking text-accuracy item).

## Recommended Recipient

`/implementation_engineer` (primary pass handoff); `/solution_designer` (informational).

## Residual Risks

- REQ-017/AC-015: Grok application launches remain blocked by the `unsupported` credential authority (STC-002) until the user-deferred follow-up ticket lands. The application-scope wiring ships unreachable for launches by the user's decision.
- REQ-005/CR-007: Grok's own permission policy auto-allows some shell commands (`echo`/`touch`) with `autoExecuteTools=false`, for an undocumented cause (ARC-26). This is reported to the user as a known limitation.
- CR-006 depends on Grok ending the turn with `cancelled` after `reject_once` (ARC-28). If a Grok update makes it continue instead, the normal `end_turn` path applies unchanged.
- `ask_user_question` disabling (REQ-016/AC-013) is precedent-derived under the user's standing direction and has been reported to the user. If the user objects, the Solution Designer reopens it as a `Requirement Gap` before implementation relies on it. The design change would be one env entry and one AC clause.
- The env-switch effect on Grok's tool set is documented but confirmed only in step 5 (≤ US$0.05). The failure branch is stop-and-return.
- `session/load` with a non-empty MCP descriptor is not live-probed; it is covered by gated live E2E.
- `_x.ai` extension drift across CLI auto-updates (the minimum-version gate and ignore-unknown QR-005 mitigate it); free-tier 429s; MCP `search_tool` indirection.
- DSH evidence is documentation-only, and a future DSH profile needs a prompt-delivery strategy (recorded deferral 0).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: The round-3 SR-011 deltas are verified. CR-006 turn-end classification uses session-owned state and is runtime-neutral. CR-004 surfaces provider text at create through `AgentCreationError`. The CR-002 text sync matches the implemented contract. CR-005 and CR-007 are requirement-authority decisions and are recorded. AR-005 is resolved; AR-006 (Low) is a DS-001 wording correction for the restore path.
