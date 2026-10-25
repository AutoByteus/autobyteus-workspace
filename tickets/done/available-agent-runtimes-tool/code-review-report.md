# Code Review Report — autobyteus-303 (`list_available_agent_runtimes`, Settings → Model Routing)

This report holds the latest complete result (round 5, a Targeted Delta Review on top of the round-4 Full Re-Audit). Rounds 1–3 (CRR-001…CRR-003) are in `code-review-revision-record.md` and in this file's history at commit `7c082d3612`.

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-006, Approved; adds AC-013 and discovered providers to REQ-002)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (C-20…C-22 via the design spec)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-007, incl. § SR-006 Revision and § SR-007 Revision)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001…FU-005)
- Relevant Solution Revision IDs: `SR-006`, `SR-007`
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-008 Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-006`, `ARCH-REV-007`, `ARCH-REV-008`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-003)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-003`, `IR-004`
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-005`
- Current Review Round: `5`
- Review Scope: `Targeted Delta Review` (round 4 was a `Full Re-Audit`)
- Round-5 scope evidence: the only source change since round 4 is `7ece4e2069` (`git show --stat`: 1 file, `available-agent-runtimes-service.ts`, +6/−3), inside CR-005's file and behavior. Round-4 evidence for every other check carries forward.
- Round-4 scope evidence:  `git diff 8de58e3ab3 c4fff3eb00` (48 files) touches the data-flow spine (single-flight `read()`, the Codex hold, the discovered-provider step). It changes shared interfaces and data shapes: the `AgentRuntimeStrategy.readUsageLimits` throw contract, `holdClient?`, `ProviderUsageReading`, `UsageLimitsReading`, the `runRuntimeCommand` bound, and the report's `AutoByteusProviderEntry.models`. It also moves the composer to `src/available-agent-runtimes/`. All structural checks and the full scorecard are rerun.
- Trigger: round 5, implementation handoff IR-004 (CR-005); round 4, implementation handoff IR-003 (CR-002, CR-003, CR-004 from CRR-003; SR-007 design feedback)
- Prior Review Round Reviewed: `4` (CRR-004, Fail: CR-005)
- Latest Authoritative Round: `5`
- Code reviewed: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool`, branch `codex/available-agent-runtimes-tool`, commits `07c07cfc27` (SR-006), `c4fff3eb00` (SR-007) and `7ece4e2069` (CR-005); ticket docs at `5a87647318`
- Scorecard bar: the current template (autobyteus-agents-64): clean pass `>= 9.2` in every category, a single `/10` scale. Round 4 was scored under the 9.5 bar of autobyteus-agents-63.

## Routing Classification Review

- Task size: `Large`; Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Review Scope

- Changed implementation and behavior reviewed:
  - The one time-out rule in `read-deadline.ts` (`DeadlineExceededError`, `isDeadlineExceeded` including `cause`, `commandBound`, `deadlineCause`) and its use in the command runner, the agy, Grok and ACP helpers, and Claude `listModels`.
  - The moved service: `runStep`, `failureText`, single-flight `read()`, the Codex hold, the discovered-provider reload, and the provider kinds.
  - The throw contract in strategies, parsers and provider readers.
  - Rounding (`wholeRemainingPercent`), with exhaustion decided on raw values.
  - Coverage resolved over all of a runtime's limits.
  - The composer folder move and its dependency test.
  - The web provider row's "models unknown" text, and the docs.
- Explicit exclusions: the web probe and live provider readers (not run; API/E2E); IMP checks not rerun (the code is unchanged since they ran).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: SR-006 adds discovered providers to REQ-002 and AC-007, adds AC-013 (concurrent callers each get Codex models and limits), and defines the step time-out classification. SR-007 changes no requirement.
- Design-spec behavior map verified against the implementation: Yes.
- Design review report and round confirmed: ARCH-REV-008 Pass. My SR-007 feedback (keep the `models(modelIds)` variant for Codex) is in the spec (`design-spec.md:318`).
- Behavior-basis status: `Confirmed`

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | Tool / MCP → `findAvailableAgentRuntimesService().read()` (`src/available-agent-runtimes/available-agent-runtimes-service.ts:164-173`, single-flight) → per runtime: install → hold (`:202`, Codex) → sign-in → models ‖ limits (`:219-241`) → release after the answer (`:206`, `:169-171`); AutoByteus: list → per provider models ‖ usage (`:259-313`) | — |
| BEH-002 | Confirmed | Page → GraphQL (import moved) → the same `read()`; the provider row renders an unknown `models` value (`AvailableAgentRuntimeRow.vue:63-64`) | — |
| BEH-003 | Confirmed | Strategies return a reading or throw; `failureText` (`:105-111`) words every step's failure | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, BEH-003 | System | Agent with the tool | Know what can run now | Tool call | Normal | as above | Runtimes, models, limits | requirements SCN-001 | Supported Normal Scenario | Use |
| SCN-002 | BEH-001; AC-002 | System | Agent on an external runtime | Same | Agent Tools MCP | Normal | MCP adapter → the same `read()` | Same answer | requirements SCN-002 | Supported Normal Scenario | Use |
| SCN-003 | BEH-002; AC-010 | User | User | See the node's runtimes | Settings → Model Routing | Normal | page → GraphQL → `read()` | Same data | requirements SCN-003 | Supported Normal Scenario | Use |
| SCN-004 | REQ-007, AC-008, AC-011 | System | A slow or failing step | Truthful answer within 20 s | Any read | Explicit Edge | `runStep` → `failureText` | `… timed out` / `… could not be read[: reason]` | REQ-007 | Supported Explicit Edge Scenario | Use |
| SCN-005 | AC-013, RSK-002 | System | Several agents and the page at once | Each gets the node's answer | Concurrent tool calls / page | Explicit Edge | single-flight `read()`; Codex hold | One shared read; no failures from overlapping reads | AC-013 (SR-006) | Supported Explicit Edge Scenario | Use |
| SCN-006 | REQ-002, AC-007 | User | User with LM Studio, Ollama or a keyed custom endpoint | Local or custom models listed when usable | Tool / page | Normal | `readDiscoveredModels` → `reloadProviderModelCatalog` | Listed with its models now; an unreachable local server is left out; a failing custom endpoint gets `models: unknown: …` | REQ-002 (SR-006) | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-12 | (Resolved in round 5) The "could not be read: <reason>" text was built outside `failureText` at `available-agent-runtimes-service.ts:326` and `:327` (discovered-provider failures) | SR-007 decision 2 ("the same rule words the models, sign-in and provider steps (one wording helper in the service)"); Principle 11 (one owner per derived fact) | — (engineering contract) | Two more writers of the same wording; a change to `failureText`'s format would silently miss them | Code read | Promote | This ticket | CR-005: route both through the one wording helper |
| C-13 | Single-flight keeps the read in progress until the Codex hold release settles, so a hanging release would keep serving the old answer | AC-013 | Codex app-server not exiting on close | The old answer is served while the release is pending | `codex-app-server-client.ts:97-120` (SIGTERM, then SIGKILL at 2 s, reject at 5 s); the manager waits at most 5 s for a pending startup | Reject | — | Bounded to about 10 s; this is the designed behavior (ARCH-REV-006 note 1) |
| C-14 | A timed-out discovered-provider reload keeps running and could commit later | SR-006 CR-003 | Slow local or custom endpoint | A stale commit? | `dynamic-model-source-lifecycle.ts:52-80,124`: a forced reload bumps the generation, and a run that is no longer current does not commit | Reject | — | The lifecycle already guards it |
| C-15 | `commandTimeout` kept as a wrapper of `commandBound` | Principle 8 | — | Used by `runtime-version.ts` and the Claude and Grok sign-in commands, where the time-out reason does not matter | grep: 3 callers | Reject | — | A helper with its own meaning, not a compatibility wrapper |
| C-16 | `runRuntimeCommand(…, timeout: number \| CommandBound)` | Principle 10 | — | Callers outside a step pass a number; step callers pass a bound | Code read | Reject | — | One parameter, two explicit forms, one behavior |
| C-17 | Implementation edited API/E2E-owned expectations (AAR-01 percentages under O-1; the web probe's DeepSeek text) and did not run the probe (handoff decision 2) | Team ownership | — | The expectations follow approved SR-006/SR-007 behavior; the probe stays unrun | `git diff 8de58e3ab3 c4fff3eb00 -- autobyteus-server-ts/tests/e2e autobyteus-web/tests/e2e` (5 + 3 lines) | Reject | — | Not a defect; API/E2E confirms them in its rerun |
| C-03 | AutoByteus entry left out when the provider list fails | REQ-007 | Local infrastructure failure | — | Unchanged since round 1 | Reject (unchanged) | — | — |

Earlier candidates C-01 (CR-001), C-05 (CR-004), C-10 (CR-003), C-11 (CR-002) and C-02 (coverage over all limits) are resolved; see § Findings.

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | SR-006/007 answer demonstrated failures; single-flight and the hold are tied to AC-013, not speculation | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None are behavior-defining | — |
| Data-flow spine inventory clarity and preservation | Pass | `read()` → `readOnce` → per runtime: install → hold → sign-in → models ‖ limits; AutoByteus: list → per provider models ‖ usage; releases after the answer | — |
| Ownership boundary preservation and clarity | Pass | The service owns order, caps, single-flight, the hold's lifetime, the available rule, `blocked` and the failure wording; strategies and readers return a reading or throw | — |
| Off-spine concern clarity | Pass | Matching, parsers and deadline helpers serve their owners | — |
| Existing capability/subsystem reuse check | Pass | Reuses `reloadProviderModelCatalog` and the lifecycle's generation guard; the Codex hold reuses `beginAcquire` | — |
| Reusable owned structures check | Pass | `unreadableText` (`:114`) is the one writer of "could not be read: <reason>"; `failureText` and `readDiscoveredModels` both call it (CR-005 resolved) | — |
| Shared-structure/data-model tightness check | Pass | `unknown` states removed from `UsageLimitsReading` and `ProviderUsageReading`; the scope has three variants; `exhausted` is decided on raw values | — |
| Repeated coordination ownership check | Pass | One `runStep`; one time-out rule (`isDeadlineExceeded`), plus the provider signal's `TimeoutError` inside `failureText`, because provider-usage may not import runtime-management | — |
| Empty indirection check | Pass | — | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | — | — |
| Ownership-driven dependency check | Pass | `src/available-agent-runtimes/` sits above both subsystems; `available-agent-runtimes-dependencies.test.ts` asserts that nothing in runtime-management or llm-management imports it | — |
| Authoritative Boundary Rule check | Pass | Tools, GraphQL and the composition depend only on the service | — |
| File placement check | Pass | Composer, report and matching in `src/available-agent-runtimes/`; tests moved with them | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass | `readUsageLimits` returns or throws; `holdClient?(cwd)`; `commandBound` → `{timeoutMs, byDeadline}` | — |
| Naming quality and one vocabulary | Pass | `DeadlineExceededError`, `byDeadline` and `wholeRemainingPercent` say what they do | — |
| No unjustified duplication of code | Pass | CR-005 resolved | — |
| Patch-on-patch complexity control | Pass | SR-007 removed `readUsageLimitsSafely` instead of layering on it | — |
| Dead code removed in the touched files and modules | Pass | `ReadDeadlineExceededError`, `readUsageLimitsSafely`, `unknownUsageLimits`, `UNEXPECTED_ANSWER`, `providerUsageFailure`, `clampPercent` and the old service, report and matching files: 0 references | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | The 1 ms-left reproduction; the concurrency suite (one start and close, a shared answer, back-to-back reads, a slow release, a closing generation); command-runner bound tests; the dependency test | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | — | — |
| No stale, duplicated, or compatibility-only tests are retained | Pass | The old test locations are removed | — |
| API/E2E readiness for the next workflow stage | Pass | Reruns named (API-03/03b, API-05/05b, API-08b); edited expectations flagged (C-17) | — |

## Source File Size And Structure Audit

| Source File | Before (base `a2faf424d6`) | After | `>500` Check | `>220` Delta Check | SoC / Ownership | Placement | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `src/available-agent-runtimes/available-agent-runtimes-service.ts` | 0 | 319 | Pass | New file (moved and grown); one composer concern | Pass | Pass | — | — |
| `src/runtime-management/antigravity-cli-capability.ts` | 125 | 136 | Pass | Pass | Pass | Pass | — | — |
| `src/runtime-management/grok/grok-build-capability.ts` | 103 | 118 | Pass | Pass | Pass | Pass | — | — |
| `src/runtime-management/read-deadline.ts` | 0 | 61 | Pass | Pass | Pass | Pass | — | — |

The other changed files have small deltas, well under the thresholds.

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | C-15 and C-16 rejected |
| No legacy old-behavior retention in changed scope | Pass | The `unknown` states and `readUsageLimitsSafely` are removed |
| Dead code removed in the touched files and modules | Pass | — |
| Approved persisted-data transition decision is followed | Pass | `Not Affected`; the discovered-provider reload refreshes the in-memory catalog, as the settings' reload does (approved in SR-006) |
| No version-specific dual reads/writes or request-time old-shape fallback | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes` (done): `docs/modules/agent_runtimes.md` (single-flight, the hold, discovered providers, failure wording), `llm_management.md`, `autobyteus-web/docs/settings.md`.

## Additional Material Premise Validation

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-001 | Confirmed | Unchanged |
| MP-002 | Confirmed | The deadline is now classified by error type (`isDeadlineExceeded`), not by reading the clock |

New or reclassified premises: None.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.5
- Score calculation note: the simple average of the ten categories; the decision follows the findings.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.6 | `read()` → per-runtime steps, with the hold placed after install; releases after the answer, documented at the method | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | One owner for order, caps, single-flight, the hold's lifetime, `blocked` and failure wording; strategies return or throw | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | `commandBound` makes "who set the bound" explicit; the throw contract is stated on the interface | `runRuntimeCommand` takes two forms of bound (C-16, accepted) | — |
| 4 | Separation of Concerns and File Placement | 9.6 | Composer above both subsystems, enforced by a test | — | — |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.5 | Readings tightened; scope variants match their sources; one writer of the failure wording (CR-005 resolved in round 5; 9.3 in round 4) | — | — |
| 6 | Naming Quality and Local Readability | 9.5 | Clear names; comments tie rules to REQ and CR IDs | — | — |
| 7 | API/E2E Readiness | 9.5 | Reruns named; the scripted E2E passes against the real composition (IMP-17) | The web probe was not run after its expectation edit (C-17) | API/E2E reruns it |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | CR-002 (the 1 ms reproduction fails before and passes after), CR-003 (live LM Studio), CR-004 (concurrency suite and 3 × 4 live reads) | SR-007 was not rerun live (covered by IMP-17 against the real composition) | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Old helpers and states removed cleanly | — | — |
| 10 | Cleanup Completeness | 9.5 | No dead symbols or files left by the move | — | — |

## Findings

Resolved this round (verified in code and evidence; see CRR-004):

- **CR-002** (time-out reason): `runStep` and its backstop classify by `isDeadlineExceeded` (the error or its `cause`); `commandBound.byDeadline` decides at the source; Claude `listModels` rethrows the deadline error when it has a deadline. The 1 ms-left case is reproduced (IMP-11, IMP-16).
- **CR-003** (discovered providers): `readDiscoveredModels` reloads on every read. Local providers are listed only when they have models now; keyed custom endpoints are listed with their models or `unknown`. The snapshot holds only the LLM source, so `sources.find` cannot be misled by an audio or image source.
- **CR-004** (concurrent reads): single-flight `read()` plus the Codex hold. The concurrency suite covers one start and close, a shared answer, back-to-back reads and a slow release; IMP-13 ran 3 × 4 live reads.
- **C-02** (coverage over all limits): `blockByLimits` passes all limits to `resolveLimitCoverage` (`:127`).

Resolved in round 5:

- **CR-005** (failure wording outside the one helper): `7ece4e2069` adds `unreadableText(subject, reason)` (`:114`); `failureText`'s unreadable-answer branch and both `readDiscoveredModels` texts call it; no inline copy remains (grep for "could not be read" finds only the helper, `failureText`'s plain form and comments). The output text is unchanged; IMP-18: typecheck clean, `tests/unit/available-agent-runtimes` and `tests/unit/agent-tools/agent-runtimes` 38/38 with unchanged assertions.

No open findings.

## Follow-ups

- Follow-ups this review added: None. FU-003, FU-004 and FU-005 (Solution Designer) are recorded upstream.

## Classification

N/A (Pass).

## Recommended Recipient

- API/E2E Engineer, `/software_engineering_team/api_e2e_engineer` (implementation review passes); informational notice to the Implementation Engineer. API/E2E reruns API-03/03b, API-05/05b and API-08b, and confirms the edited AAR-01 and web-probe expectations (C-17).

## Residual Risks

- FU-003: another home-folder Codex user (the Agent Runtimes page's sign-in check, a Codex run in the home folder) can still close a generation while a read takes its hold; the read then reports that step's reason.
- FU-005: repeated work per read (Antigravity's model list twice, Grok's sign-in plus discovery, two Claude CLI starts), deferred by the Solution Designer.
- RSK-001 (external formats) is unchanged. The SR-007 wording has been seen only through the scripted E2E (IMP-17), not live.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 5, Targeted Delta Review; round 4 Full Re-Audit)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.5/10; every category ≥ 9.5 (bar 9.2)
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: CR-001…CR-005 are all resolved. The package is ready for the API/E2E reruns.
