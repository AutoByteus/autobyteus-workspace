# Design Review Report — autobyteus-303 (`list_available_agent_runtimes`)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool/tickets/in-progress/available-agent-runtimes-tool/requirements-doc.md` (SR-006, Approved)
- Upstream Investigation Notes: `.../available-agent-runtimes-tool/investigation-notes.md` (C-15…C-19)
- Upstream Solution Revision Record: `.../available-agent-runtimes-tool/solution-revision-record.md`
- Reviewed Design Spec: `.../available-agent-runtimes-tool/design-spec.md` (SR-007 text-corrected for AR-008, `Ready`, § SR-007 Revision; earlier designs in `history/`, the uncorrected SR-007 text in `history/design-spec-sr007.md`)
- Supplemental Task Artifacts Reviewed: `evidence/limit-probes/`; `docs/design-cases.md` diff (Cases 2 and 5)
- Relevant Solution Revision IDs: `SR-001`…`SR-007`
- Architecture Review Revision Record: `.../available-agent-runtimes-tool/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-008`
- Current Review Round: `8`
- Trigger: SR-007 text corrections for ARCH-REV-007 AR-008, from the Solution Designer (2026-10-25). Requirements unchanged at SR-006
- Prior Review Round Reviewed: `7` (ARCH-REV-007, Fail: AR-008)
- Latest Authoritative Round: `8`
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool`, base `a2faf424d6`. Sources from rounds 1–2 are still valid; the code is unchanged (only the ticket docs and `docs/design-cases.md` differ). Opened this round: `codex/client/codex-app-server-client-manager.ts:17-70` (lease release semantics). The SR-002 → SR-003 and SR-003 → SR-004 design diffs were reviewed in full. Rounds 4–5 checked only the SR-004/SR-005 note delta. Round 6 reviews the SR-006 delta against `code-review-report.md` § API/E2E Failure-Origin Review and the code at `8de58e3ab3`. Opened this round: `llm-management/services/model-catalog-service.ts:97-134,205-276`, `dynamic-model-source-lifecycle.ts:52-146`, `llm-providers/services/custom-llm-provider-runtime-sync-service.ts:40-60`, `codex/client/codex-app-server-client-manager.ts:27-114`, `codex/client/codex-app-server-client.ts:89-120`, `compositions/build-studio-server.ts:60,191,350`, `codex-model-catalog.ts:55-58`. Round 7 reviews the SR-006 → SR-007 delta and reads the current code at `runtime-management/agent-runtimes/available-agent-runtimes-service.ts:1-12` and the llm-management → runtime-management imports. Every verdict not touched by SR-007 stands unchanged.

## Routing Classification Review

- Task size: `Large`; Architectural risk: `High`
- Classification rationale reviewed: unchanged. The new `read-deadline.ts` adds no new risk surface.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood:
  - SR-003 aligns the text with the SR-002 intent and changes no intent.
  - The UI states drop plan, tier and credit details, and there is no limit-level blocked badge.
  - The model field is now one name, `blocked: {until, by}`, in REQ-004, AC-003 and AC-004.
  - REQ-004 says runtime credit details are not shown, while an AutoByteus provider's money balance is (it is that provider's limit). This matches AC-007.
- Relevant existing behavior and evidence confirmed: C-15…C-18 as in round 2. C-19 is accurate: `antigravity-cli-capability.ts:95-99`, `grok-build-capability.ts:12,80-86`, `codex-model-catalog.ts:18-45`.
- Scope guardrail confirmed: unchanged. Out of scope: the Model Router, peer reads, Agent Runtimes page changes, token-spending reads, cache and polling.
- Every prospective blocking finding is traceable: `Yes`. There are no blocking findings.
- Remaining material ambiguity: none.
- Statements about existing code the design relies on: all checked. "Callers without a deadline keep today's time-outs" holds, because every new option is optional and defaults to the current constants.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | System | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/limit-probes/` | Pass | Pass | Pass | Pass | Pass (evidence) | None |
| `docs/design-cases.md` (Cases 2, 5) | Pass | Pass | Pass | Pass | Pass (project doc) | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature, plus the local discovery defect | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Local Implementation Defect` (C-15) | — |
| Refactor decision is explicit | Pass | Yes, small: the idle-input control query | — |
| Refactor decision is supported by the concrete design sections | Pass | Control query, Removal Plan, Guidance | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Tool | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Page | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Per-runtime read | Pass | Pass (one deadline per step shared by its commands; § Read deadline) | N/A | Pass | Pass (the service owns order and caps; each step honours its deadline) | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AvailableAgentRuntimesService.read()` | Pass | Pass | Pass | Pass | The only caller of `readUsageLimits`, the provider readers and the `deadline` options |
| `AgentRuntimeStrategy` / `ProviderUsageReader` / `withClaudeControlQuery` / `runAcpExtensionRequest` | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Tool → service; service → runtime-management, llm-management | Pass | Pass | Pass | Pass | — |
| `llm-management/provider-usage` | Pass | Pass | Pass | Pass | Takes an `AbortSignal` rather than a `ReadDeadline`, so it never imports runtime-management |
| llm-management catalogs → `runtime-management/read-deadline.ts` | Pass | Pass | Pass | Pass | Catalogs already import runtime-management clients (e.g. `codex-model-catalog.ts:2-5`) |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `ReadDeadline` + `createReadDeadline` / `timeLeft` / `commandTimeout` / `raceDeadline` | Pass | Pass | Pass | Low | Pass |
| `readVersion` / `readSignIn` / `readUsageLimits` / catalog `listModels` with `{deadline}` | Pass | Pass | Pass | Low | Pass |
| `withClaudeControlQuery({deadline, env?}, use)`; `runAcpExtensionRequest(profile, method, {deadline})` | Pass | Pass | Pass | Low | Pass |
| `ProviderUsageReader.read(provider, models, {signal})` | Pass | Pass | Pass | Low | Pass |
| Tool `list_available_agent_runtimes()`; GraphQL `availableAgentRuntimes` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Installed (`readVersion`), signed in, models, keys, provider keys | Pass | Pass | N/A | Pass | — |
| Claude control query, ACP extension request, command runner | Pass | Pass | Pass | Pass | — |
| Step deadline | Pass | Pass | Pass (`read-deadline.ts`: a small shared value used by several runtime helpers and catalogs) | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All areas in the allocation table, plus `runtime-management/read-deadline.ts` | Pass | Pass | Pass | Pass | Composition is `agent-runtime-status-composition.ts`, called by `build-studio-server.ts` |

The several-kinds check: each of the four runtimes, each step and each AutoByteus provider is traced, including steps that run several commands.

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Limit types, provider usage types, report, `ReadDeadline` | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RuntimeUsageLimit`, `ProviderUsageReading` | Pass | Pass | Pass | N/A | Pass | `UsageLimitsReading.read.note` (SR-004) sits with the limits it explains |
| Report `ExternalAgentRuntimeEntry.signIn?` / `limitsNote?` (SR-005) | Pass | Pass | Pass | N/A | Pass | AR-007 resolved: `signIn: "not checked"` comes from the sign-in step only (DEC-002); `limitsNote` is the strategy's note, present only with read limits |
| `ReadDeadline` vs `timeoutMs` | Pass | Pass | Pass | N/A | Pass | `deadline` is a step's end time; `timeoutMs` is one command's bound |

Derived consumers listed with a decision for each: `Pass`.

One vocabulary: `Pass`. `signIn` and `limitsNote` each name one concept, and `blocked: {until, by}` is the same name across the requirements, design, tool and page. `deadline` and `timeoutMs` each keep one meaning.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All files in the Final File Responsibility Mapping, including `read-deadline.ts` | Pass | Pass | Pass | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `usage-limits/`, `provider-usage/`, `agent-tools/agent-runtimes/`, `settings/model-routing/`, `runtime-management/read-deadline.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `tryGetSupportedModelsFromQueryControl`, `MODEL_DISCOVERY_PROBE_PROMPT` | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Claude control query; details part; optional `deadline` | No | Pass | Pass | The optional `deadline` is a caller choice (with or without a step budget), not a legacy path |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| All | `Not Affected` | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–8 | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Tool answer, timeline, Claude query, failure, derivation, read deadline | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — A tool call or page open makes the Claude CLI start a model turn

- Reachable on today's code. The design removes it: an idle-input control query, a test that fails today, and a live check. Closed for design.

### `MP-002` — A step with several commands goes past its cap and leaves a child process running

- Reachable on today's code. The design removes it: a `ReadDeadline` shared by every command in a step, `commandTimeout` that starts nothing once the time is up, and Codex `raceDeadline` with the lease released in `finally`. There is a test with a slow second command and a never-settling Codex request. Closed for design.
- Verified this round: `CodexAppServerClientManager` keys leases by `cwd` (`codex-app-server-client-manager.ts:27-29`). Releasing the last holder closes that entry's app-server (`:44-50`). The home-folder entry is not shared with workspace-keyed agent runs, so an abandoned request ends with its process. RSK-004's "the shared app-server keeps running" applies only while another holder of the same key exists.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## SR-006 Delta Review (Round 6)

Requirements SR-006 (REQ-002, REQ-007, AC-007, new AC-013) are approved within the direction. They state the supported scenarios the failure-origin review established: a local provider that serves models (Supported Normal), and several concurrent readers (Supported Explicit Edge, from RSK-002). These close a gap my round-1 review should have found. I did not trace how the discovered-provider kind gets its models (Principle 1: trace each kind).

| Item | Verdict | Evidence |
| --- | --- | --- |
| CR-003: discovered providers reloaded per read through `reloadProviderModelCatalog(id, "autobyteus")` | Pass | Reuses the catalog's own forced refresh, the same operation as the settings' reload (`model-catalog-service.ts:107-115`), so there is no second discovery path. Correctness under overlap is the lifecycle's: a forced reload opens a new generation, and a stale result is discarded (`dynamic-model-source-lifecycle.ts:58-79,124`). A failed refresh keeps rows (`:142`), so launch lists are never emptied. The reload is in memory only (`LLMFactory.replaceSourceModels`), so persistence stays `Not Affected`. The per-kind table (static keyed / discovered local / discovered keyed) traces each kind. The AutoByteus step is ≤ 12 s (list 4 s, then models ‖ usage 8 s), within REQ-010 |
| CR-004.1: one client hold per read (`holdClient?` = Codex `beginAcquire` without `acquire`) | Pass | The hold keeps `holders > 0`, so step releases never close the generation (`codex-app-server-client-manager.ts:44-50`). The strategy and the catalog use the same singleton manager (`build-studio-server.ts:350`, `codex-model-catalog.ts:55-58` → `getCodexAppServerClientManager`) and the same home-folder key, so one hold covers sign-in, models and limits. A hold whose client never started closes immediately (`:72-84`). If taking the hold fails, the read continues without it (REQ-007). One owner, the service, takes and releases the hold in order |
| CR-004.2: single-flight `read()` | Pass | Owned by the service. It is the demonstrated concurrency problem (API-05/05b), not speculative. "Check again" during a read joins an answer at most ~18 s old, which still meets AC-010's re-read. AC-013 is testable (API-05/05b rerun) |
| CR-002: one time-out rule (`DeadlineExceededError` / `isDeadlineExceeded` in `read-deadline.ts`) | Pass | One owner for "timed out", used by `runStep` and `readUsageLimitsSafely` instead of two clock comparisons. Claude `listModels` lets the deadline error through; without a deadline that error cannot arise, so launch callers keep `[]` |
| O-1 floor rounding; O-2 → FU-004; O-3 no change | Pass | `exhausted` is decided on the unrounded value. FU-004 is a correct follow-up (texts for agents; page works). O-3 is consistent with AutoByteus always installed |
| FU-003 (manager refuses leases while closing) | Pass as follow-up | Shared functionality used by agent runs. This ticket's reads no longer meet their own closes. The remaining case (another Codex user of the home folder) yields a truthful step reason (AC-013 alternate) |
| Spine / ownership / vocabulary | Pass | DS-003 gains the hold (service-owned) and the AutoByteus discovered-provider step. `holdClient` and `RuntimeClientHold` each have one meaning, optional on the strategy, Codex only |

Material premise check: none new. Both scenarios are established by the approved requirements and measured evidence (C-22).

## SR-007 Delta Review (Round 7)

SR-007 answers the code reviewer's design feedback (five caveats, sent at the user's request). Requirements are unchanged (SR-006).

| Item | Verdict | Evidence |
| --- | --- | --- |
| 1. `appliesTo` = runtime \| `models(modelIds)` (Codex `normalModelSlug`) \| `modelFamilies` (Claude, Antigravity), resolved by the service; word-order family rule; most specific among `modelFamilies` limits before exhausted limits block (as corrected 2026-10-25) | Pass | Verified against the code: `usage-limits-reading.ts:12-14` has three variants; Codex fills `models` (`codex-usage-limits.ts:37,49`); `usage-limit-model-matching.ts:23-50` matches ids exactly, families by word order, picks the strongest family across all limits, and uses `allIds` when a limit covers nothing (DEC-003). An id is never matched as a family. Choosing the most specific family across all limits corrects CRR-001 C-02. One owner of derived data (the service). Two small text leftovers are in AR-008 |
| 2. One owner of step failures: `readUsageLimits` returns read \| not_reported or throws (`UsageLimitsUnreadableError(reason)`); the service alone words REQ-007 texts | Pass in intent; spec not consistent (AR-008) | Removes the parsers' second wording path (Principle 13: a behavior is decided by one explicit rule). The provider step is left ambiguous: `ProviderUsageReading` still has `unknown` (AR-008) |
| 3. `commandBound(deadline, usual)` → `{timeoutMs, byDeadline}`; `DeadlineExceededError` only when `byDeadline` | Pass in intent; spec not consistent (AR-008) | It stops a short probe's own time-out (Antigravity's 3 s `--help`) from being reported as "timed out", which keeps "timed out" meaning one thing. § Read deadline still shows `commandTimeout(…): number` |
| 4. Repeated work deferred as FU-005 | Pass | Within the 18 s budget with single-flight reads. Removing it would split the sign-in reader's single rule and the catalog's ownership. Recorded with a trigger (Model Router latency). DESIGN.md best practice 6 is respected: the work is named, and its removal is weighed rather than masked |
| 5. Composer, report and matching move to `src/available-agent-runtimes/` | Pass | Today `runtime-management/agent-runtimes/available-agent-runtimes-service.ts:6-10` imports `llm-management`, while `llm-management/services/*-model-catalog.ts` import `runtime-management`. The move puts the composer above both, so the dependency rule (`tools/GraphQL/composition → available-agent-runtimes → runtime-management, llm-management`) holds. Note: `runtime-management/claude/client/claude-sdk-client.ts:7` already imports type-only from `llm-management/domain`. That is pre-existing, not introduced here, and not a reason to block |

## AR-008 Recheck (Round 8)

| AR-008 item | Status | Evidence (diff `history/design-spec-sr007.md` → `design-spec.md`) |
| --- | --- | --- |
| 1. `commandTimeout` → `commandBound` | Resolved | § Read deadline declares `commandBound(deadline, usualMs) → { timeoutMs, byDeadline }`, `DeadlineExceededError` and `isDeadlineExceeded` |
| 2. DS-003 limits line | Resolved | "throw / time-out → limits "unknown: <the service's wording>"; not_reported → "not reported"" |
| 3. Provider-step failure form | Resolved | Decision: provider readers return `read` \| `not_reported` or throw `ProviderUsageUnreadableError(reason)`; `unknown` is removed from `ProviderUsageReading`. The service words "<Provider> usage timed out" (abort-signal time-out, which comes from the step deadline, or `isDeadlineExceeded`), "could not be read: <reason>" and "could not be read", shown as `limits: "unknown: …"` on the provider entry. Strategies and providers now share one failure contract with one wording owner |
| 4. SR-006 CR-002 text | Resolved | Marked "superseded in part by SR-007 decision 2"; the time-out rule stands |
| 5. Decision 1 wording | Resolved | The opening now says parsers name coverage in their source's terms. The DEC-003 fallback covers every variant (`usage-limit-model-matching.ts:45,50`) |

## Review Decision

- `Pass`: the behavior basis is confirmed, the design is ready for implementation, and no in-scope machinery depends on an unsupported premise.

## Findings

None open. AR-001…AR-008 are all resolved.

## Classification

N/A (Pass)

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`); informational notice to the Solution Designer.

## Residual Risks

Implementation notes for SR-006 (non-blocking):
- **Release awaited inside the 20 s budget:** awaiting the Codex hold release normally takes milliseconds (SIGTERM). Its bound is SIGKILL at 2 s and give-up at 5 s (`codex-app-server-client.ts:107-117`), plus up to 5 s waiting for a pending start (`codex-app-server-client-manager.ts:74-79`). After 18 s of capped steps, that could push one answer past 20 s. Prefer resolving callers with the answer and keeping the single-flight slot held until the release settles. A later read still never meets this read's close, and the answer stays ≤ 20 s.
- **Keyed custom endpoint with 0 models:** a reload that succeeds with 0 models should follow REQ-007's rule (an empty list is never "no models"), the same as the external runtimes.
- **Catalog side effect:** a read now refreshes discovered providers in the shared catalog, as the settings' reload does. The preserved-behavior line "model catalogs: unchanged" holds for catalog rules and launch behavior. The Solution Designer may add that clarification to the requirements; it is not required.

Implementation notes from round 3 (non-blocking):
- **Codex leases:** the Codex sign-in, models and limits steps each acquire the home-folder lease. If the sign-in lease's close is still running when models or limits call `beginAcquire`, it throws "unresolved cleanup" (`codex-app-server-client-manager.ts:30`). REQ-007 then gives models or limits "unknown". This is acceptable, but await the sign-in release before starting models ‖ limits, as the strategy's `finally` already does.
- **GraphQL encoding:** the report's mixed-type fields (`limits` / `models` as an array or a string) need one GraphQL encoding, which the page reads the same way the tool shows it (AC-010).
- RSK-001 (external formats), RSK-002 (concurrent short processes), RSK-003 / UNK-001 (Grok used %), RSK-004 (late Codex answers ignored) and UNK-002 (Docker parity, user verification) are as recorded. FU-001 is in `follow-ups.md`.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: SR-007, as corrected, is ready for implementation. The round in progress (CR-002…CR-004 from SR-006) takes SR-007 too: the three `appliesTo` variants with most-specific among families; return-or-throw for strategies and provider readers with service-owned wording; `commandBound`/`byDeadline`; the composer, report and matching in `src/available-agent-runtimes/`. Classification stays Large / High.
