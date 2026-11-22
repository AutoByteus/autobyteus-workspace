# Code Review Report — grok-release-smoke-551

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `tickets/in-progress/grok-release-smoke-551/requirements-doc.md` (SR-001, approved by the user 2026-11-22; DEC-003 → (a))
- Investigation Notes Reviewed As Context: `investigation-notes.md`; `evidence/SD-probes-2026-11-22.md` (P3, P9-P17 as cited by the design)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-002)
- Supplemental Task Artifacts Reviewed As Context: `evidence/SD-probes-2026-11-22.md` and probe scripts (evidence only)
- Relevant Solution Revision IDs: SR-001, SR-002
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-001 Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation handoff IR-001 (Medium / High), branch `codex/grok-release-smoke-551` @ `ab1eaf376b` (code `5054f97a17`), base `origin/personal` @ `df00f97aaa`
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed. Two security and contract changes drive the High risk:
  - Grok runs now trust their workspace (user-approved, DEC-003);
  - the shared ACP connection gains a connection-wide listener and a start-up bound that DeepSeek also inherits.

  Four source files and one doc in two existing subsystems.

## Review Scope

- Changed implementation and behavior reviewed: SR-002 Intended Change 1-3 and the module doc:
  - the 90 s start-up bounds;
  - discovery reading Grok's `_x.ai/models/update`;
  - `GROK_FOLDER_TRUST=0` for run processes only.
- Files / areas reviewed (under `autobyteus-server-ts/`):
  - `src/runtime-management/acp/acp-client-connection.ts`
  - `src/runtime-management/acp/acp-discovery-handshake.ts` (including the unchanged users of `withShortAcpProcess`: `runAcpExtensionRequest` for Grok billing, `runAcpSessionOptionsDiscovery` for DeepSeek)
  - `src/runtime-management/grok/grok-build-capability.ts`
  - `src/runtime-management/grok/grok-build-launch-profile.ts`
  - Callers checked:
    - `acp-session-launcher.ts:119` (`runLaunch`);
    - `grok-agent-runtime-strategy.ts:43` (billing via `discoveryLaunch`);
    - `deepseek-harness-capability.ts` (shared bound).
  - `docs/modules/grok_build_runtime.md`
  - Tests:
    - `acp-client-connection.test.ts` (+5);
    - `acp-discovery-handshake.test.ts` (new);
    - `grok-build-capability.test.ts`;
    - `grok-build-launch-profile.test.ts`.
- Explicit exclusions:
  - the probe scripts under `evidence/` (ticket evidence, outside the vitest include);
  - `release_smoke.py` and the live suite (unchanged; AC-006 belongs to API/E2E).
- Checks rerun: none. IMP-01…IMP-04 ran on `5054f97a17`, which is the reviewed code, and no finding needed a new check. The neutrality test (`tests/unit/runtime-management/acp/acp-layer-neutrality.test.ts`) is inside IMP-01's run.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. Grok must:
  - start under load (90 s);
  - offer xAI's announced models;
  - see workspace skills at session start, with nothing written to the user's trust list.

  Other runtimes and other request bounds stay unchanged.
- Design-spec behavior map verified against the implementation: Yes (DS-001, DS-002, DS-003).
- Design review report and round confirmed: ARCH-REV-001 Pass on SR-001/SR-002.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `discoverGrokBuildModels` probes with `PROBE_TIMEOUT_MS` 10 s, then calls `runAcpDiscoveryHandshake`. That runs inside `withShortAcpProcess`, bounded by `DISCOVERY_TIMEOUT_MS` 90 s (cut by a step deadline through `commandBound`), and calls `connection.initialize()` with `AGENT_START_TIMEOUT_MS` 90 s. A silent agent still fails with `AcpDiscoveryError("timeout")` → `GROK_MODEL_DISCOVERY_TIMEOUT`, text unchanged. | — |
| BEH-002 | Confirmed | `AcpSessionLauncher.open` → `connection.initialize()` (90 s). Session opens stay at 120 s. `extension`, `set_config_option`, `list` and `close` stay at 30 s (`REQUEST_TIMEOUT_MS`), at all six former uses. | — |
| BEH-003 | Confirmed | The listener is attached before `initialize` (`acp-discovery-handshake.ts:97`); the first matching params are kept. After the answer the wait is `min(withinMs, boundEndsAt − 250 − now)`, ends at the first match, and never rejects. The capability then normalizes `followUp ?? modelStateOf(initialize)`. The shared files name no agent. | — |
| BEH-004 | Confirmed | `runLaunch` → `grokLaunch(…, true)` → env includes `GROK_FOLDER_TRUST: "0"`. `discoveryLaunch` → `false`, and billing and discovery use it. No `--trust`. IMP-03: AC-104 3/3; `trusted_folders.toml` hash unchanged. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, REQ-001 | System | Server for user / smoke | Learn Grok's models on a loaded machine | Catalog read | Normal | DS-001 | Models, or a clear time-out at 90 s | beta.4; P3 | Supported Normal Scenario | Use |
| SCN-002 | BEH-002, REQ-001 | User | User / team | Start or restore a Grok run under load | Run launch, restore | Normal | DS-002 | Run active; a hung agent fails at 90 s | beta.3/4 | Supported Normal Scenario | Use |
| SCN-003 | BEH-003, REQ-002 | User | User | Pick a model that runs accept | Model picker / run config while Grok's cache is stale | Normal | DS-001 + DS-003 | Announced list offered | P4-P7, P15, P16 | Supported Normal Scenario | Use |
| SCN-004 | BEH-004, REQ-003 | User | User | The agent uses its workspace skills | Run with `.grok/skills` | Normal | DS-002 | Skills seen at start; nothing persisted | P9, P12; IMP-03 | Supported Normal Scenario | Use |
| CTR-001 | 517 connection contract | Contract | Any ACP agent | A failing frame handler never breaks the stream | ACP stdout | Normal | `deliverNotification` → `routeExt` → listeners | Contained, logged | 517 SR-005; design off-spine table | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CAND-001 | Every Grok catalog read and every Grok run start now costs about 3 s more when no announcement comes (fresh sign-in). | SCN-001/003; QR-001 | Every catalog read; run model validation reads the catalog uncached | ~3.9 s total, live (IMP-04) | Design Key Tradeoffs; ARCH-REV-001 residual 1; doc paragraph | Reject (as a finding) | — | An approved tradeoff within QR-001 (≤ ~5 s), recorded in the design and the module doc. |
| CAND-002 | Both 90 s timers (short-process bound and `initialize`) fire together in a discovery without a deadline. | SCN-001 | Agent never answers | The process bound is armed first (`timeout` is created before `use(...)` is evaluated in the race), so the kind is `timeout`. The fake-timer case asserts `kind: "timeout"`. | `acp-discovery-handshake.ts:62-66`; handshake test 5 | Reject | — | Deterministic ordering, tested. |
| CAND-003 | If the process closes during the follow-up wait, the inner wait timer stays pending for up to 3 s after the race rejects. | SCN-001 | Agent exit after a good answer | The timer resolves a promise nothing awaits, and the listener is already unsubscribed in `finally`. No consequence. Grok does not exit by itself. | handoff Known Risks | Reject | — | No material consequence. |
| CAND-004 | An announcement carrying an empty or malformed list would replace a good answer. | SCN-003 | Grok sends `_x.ai/models/update` without models | P15/P16: the announcement carries the refreshed real list. Nothing shows Grok sends an empty one. | probes | Reject | — | Unsupported premise. RSK-003 (Grok changing its extension) is covered by the live checks. |
| CAND-005 | DeepSeek's session-options discovery and Grok's billing request inherit the 90 s short-process bound (was 15 s), so a hung agent fails later. | BEH-002 preserved column; design Key Tradeoffs | Hung agent | A later failure only. Callers with a step deadline (8 s) are still cut by `commandBound`. | design "One shared start-up bound"; `acp-discovery-handshake.ts:45` | Reject (as a finding) | — | Approved in the design. |
| CAND-006 | New exported types (`AcpConnectionNotificationListener`, `AcpFollowUpNotification`, `AcpDiscoveryHandshake`) have no importers. | Principle 7 | — | Each one types a public signature (`onConnectionNotification`, `runAcpDiscoveryHandshake`), as the existing `AcpShortProcessOptions` does. They are live type surface, not dead code. | grep | Reject | — | Not dead: each is referenced by the API it documents. |
| CAND-007 | Per-listener `try/catch` inside the per-frame `try/catch`: duplicate defense? | CTR-001 | Listener throws | Without it, one throwing listener would stop later listeners for that frame. The test covers it. | design off-spine table; connection test | Reject | — | Design-required, with a distinct purpose. |
| CAND-008 | `boundEndsAt` uses `Date.now()` while the timer uses the event-loop clock. | SCN-001 | Clock skew | A millisecond skew shifts only where the 250 ms margin falls. | handoff Important Assumptions | Reject | — | Immaterial. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | Mode 1 is a local defect plus a bound split; Modes 2 and 3 are missing invariants. Each fix sits in the owner the design names. | — |
| Implementation matches behavior-defining supplemental artifacts | Pass | Method `_x.ai/models/update`; same normalizer shape (P16); `GROK_FOLDER_TRUST=0` (P9/P12); no `--trust` (P10). | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001…003 trace one to one (table above). | — |
| Ownership boundary preservation and clarity | Pass | The connection owns bounds and routing. The discovery helper owns the short process and the generic wait. The Grok capability owns the method, the window and "announced wins". The launch profile owns the env and the normalizer. | — |
| Off-spine concern clarity | Pass | Listener containment sits in the connection. The step deadline is unchanged. | — |
| Existing capability/subsystem reuse | Pass | Extends the inbound routing, `withShortAcpProcess`, `grokLaunch` and the fake-agent harness (pause row, `writeCustomFixture`). | — |
| Reusable owned structures | Pass | One normalizer serves both sources. | — |
| Shared-structure/data-model tightness | Pass | `{ initialize, followUp }`: two fields, one meaning each. `followUp` is required (one caller). | — |
| Repeated coordination ownership | Pass | The wait policy lives once, in the helper. | — |
| Empty indirection check | Pass | No new port or wrapper. `onConnectionNotification` is an observer like `onClose`. | — |
| Separation of concerns / file responsibility | Pass | Each change sits in its file's concern. | — |
| Ownership-driven dependency check | Pass | Grok → shared ACP only. The neutrality test is green (IMP-01). | — |
| Visible dependencies (P16) | Pass | No lookups. The listener is a notification listener; the emitter behaves the same without one. | — |
| Authoritative Boundary Rule | Pass | The capability uses `runAcpDiscoveryHandshake` only; it never spawns a process or listens on a connection itself. | — |
| File placement | Pass | No new source files. | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface/API boundary clarity | Pass | Signatures match the design's Interface Boundary Mapping exactly. | — |
| Naming / one vocabulary (P15) | Pass | `AGENT_START_TIMEOUT_MS` and `REQUEST_TIMEOUT_MS` replace the misleading `INITIALIZE_TIMEOUT_MS` with no alias. `GROK_BUILD_RUN_TRUST_ENV` sits beside `GROK_BUILD_DISABLED_TOOL_ENV`. "follow-up notification" stays local to the helper, as the design states. | — |
| No unjustified duplication | Pass | `modelStateOf` in the capability is the only extraction of `_meta.modelState`. | — |
| Patch-on-patch complexity control | Pass | — | — |
| Dead code removed in touched files (P7) | Pass | The old drop comment and the `InitializeResponse` import in the launch profile are removed. No unused code (CAND-006). | — |
| Test scenarios and assertions requirement-aligned | Pass | The fake-timer bounds prove the requirement on both sides (pending at 89.999 s, failed at 90 s; answer taken at 40 s; 30 s preserved). The follow-up cases cover after, before, none, other method, and the bound margin. Grok-level: announced over built-in, announced before the answer, none, and the real 3 s wait. The env test covers run vs discovery and no `--trust`. The controls fail on base (12 tests; 4 on the base connection). | — |
| Test fixtures/helpers reusable and coherent | Pass | Fixtures are built from the `handshake` rows. The `pause` row is cast locally (noted in a comment). | — |
| No stale/duplicated/compatibility-only tests | Pass | Normalizer tests updated to the new signature. | — |
| API/E2E readiness | Pass | AC-006 (two smoke runs at load ≥ 40) and AC-003's stale case are handed over with concrete hints (Grok log fields, `had_real_catalog: false`, the frame to capture). | — |

## Source File Size And Structure Audit

| Source File | Lines Before (base) | Lines After | `>500` Check | `>220` Delta Check | SoC / Ownership | Placement | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `acp-client-connection.ts` | 330 | ~362 (317 effective) | Pass | Pass (+38/−9) | Pass | Pass | Pass | — |
| `acp-discovery-handshake.ts` | ~158 | ~199 (148 effective) | Pass | Pass (+49/−8) | Pass | Pass | Pass | — |
| `grok-build-capability.ts` | — | 131 effective | Pass | Pass (+25/−4) | Pass | Pass | Pass | — |
| `grok-build-launch-profile.ts` | — | 109 effective | Pass | Pass (+28/−9) | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Rename with no alias; required `followUp`; normalizer signature changed with all callers. |
| No legacy old-behavior retention | Pass | — |
| Dead code removed in touched files | Pass | — |
| Persisted-data transition decision followed | Pass | `Not Affected`. |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match design | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, done in-ticket in `docs/modules/grok_build_runtime.md`. It covers:
  - the probe bound;
  - the 90 s bound and why;
  - the 3 s wait, its reason and its cost on catalog reads and run starts;
  - that the wait never becomes a time-out;
  - run-only trust: what it loads, that nothing is written, and that discovery and billing stay untrusted.
- Why: user-visible timing, plus a security-relevant process environment (RSK-002).
- Files or areas likely affected: none further.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| RSK-001 (announcement > 3 s under load) | Confirmed | Not seen live: the sign-in was fresh (IMP-04). AC-006 may show it. |
| RSK-002 (trust loads workspace/user hooks, MCP/LSP, rules) | Confirmed | User-approved (DEC-003); documented in the module doc and the constant's doc. |
| RSK-003 (Grok-owned names) | Confirmed | Our side is pinned by unit tests; Grok's side by IMP-03/IMP-04 and AC-006. |

No new premises beyond CAND-001…008.

## Review Scorecard (Mandatory)

- Overall score: 9.5 / 10 (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-001…003 map directly. The return spine (no `sessionId` → listeners) is explicit in `routeExt`. | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | Each concern sits in its named owner. The shared layer stays agent-neutral; Grok supplies the method and the window. | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Signatures match the design; the result is a two-field shape. | — | — |
| 4 | Separation of Concerns and File Placement | 9.5 | No new files. Small, owned deltas. | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | One normalizer for both sources. | — | — |
| 6 | Naming Quality and Local Readability | 9.5 | The split names say what each bound covers. The constants' docs give the evidence. | — | — |
| 7 | API/E2E Readiness | 9.4 | Clear hand-over of AC-006 and AC-003's stale case. | The stale live case depends on ≥ 6 h of Grok idle (DEC-004). | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | The wait cannot become a time-out (margin and deadline cut). The listener is attached before `initialize`. Timer ordering is deterministic. Trust is runs-only, with no write (hash evidence). | A live start-up > 30 s is unproven (DEC-004). | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean rename and signature change. | — | — |
| 10 | Cleanup Completeness | 9.5 | Stale comment and import removed. | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None. (FU-001 and FU-002 come from the Solution Designer.)

## Classification

- None (Pass).

## Recommended Recipient

- API/E2E engineer (implementation-review pass). The implementation engineer gets the informational notice.

## Residual Risks

- Every Grok catalog read and run start costs about 3 s more with a fresh sign-in (approved tradeoff, QR-001).
- RSK-001: an announcement later than 3 s under heavy load gives one stale list; the next read is right.
- RSK-002: a trusted Grok loads the workspace's and the user's hooks, MCP/LSP servers and permission rules (user-approved, documented).
- RSK-003: `_x.ai/models/update` and `GROK_FOLDER_TRUST` are Grok-owned and could change in a Grok update.
- A hung DeepSeek harness or Grok billing process now fails at 90 s instead of 15 s when no step deadline applies.
- Untested live (DEC-004): a Grok start-up above 30 s, and the stale-cache announcement (AC-003 stale case, planned for AC-006's first smoke run).

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.5 average; every category ≥ 9.4.
- Failure Origin: N/A
- Recommended Recipient: API/E2E engineer
- Notes: the implementation follows SR-002 rule by rule. The bounds, the generic follow-up wait, the Grok-side meaning and the run-only trust each sit in the owner the design names, and the controls fail on base.
