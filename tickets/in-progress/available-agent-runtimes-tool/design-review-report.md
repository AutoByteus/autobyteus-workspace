# Design Review Report — autobyteus-303 (`list_available_agent_runtimes`)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool/tickets/in-progress/available-agent-runtimes-tool/requirements-doc.md` (SR-005, Approved)
- Upstream Investigation Notes: `.../available-agent-runtimes-tool/investigation-notes.md` (C-15…C-19)
- Upstream Solution Revision Record: `.../available-agent-runtimes-tool/solution-revision-record.md`
- Reviewed Design Spec: `.../available-agent-runtimes-tool/design-spec.md` (SR-005, `Ready`; earlier designs in `history/`, SR-004 in `history/design-spec-sr004.md`)
- Supplemental Task Artifacts Reviewed: `evidence/limit-probes/`; `docs/design-cases.md` diff (Cases 2 and 5)
- Relevant Solution Revision IDs: `SR-001`…`SR-005`
- Architecture Review Revision Record: `.../available-agent-runtimes-tool/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-005`
- Current Review Round: `5`
- Trigger: SR-005 for ARCH-REV-004 AR-007, from the Solution Designer (2026-10-25)
- Prior Review Round Reviewed: `4` (ARCH-REV-004, Fail: AR-007)
- Latest Authoritative Round: `5`
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool`, base `a2faf424d6`. Sources from rounds 1–2 are still valid; the code is unchanged (only the ticket docs and `docs/design-cases.md` differ). Opened this round: `codex/client/codex-app-server-client-manager.ts:17-70` (lease release semantics). The SR-002 → SR-003 and SR-003 → SR-004 design diffs were reviewed in full. Rounds 4–5 check only the SR-004/SR-005 note delta (SR-004 → SR-005 diff reviewed in full); every other verdict from round 3 stands unchanged.

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

## Review Decision

- `Pass`: the behavior basis is confirmed, the design is ready for implementation, and no in-scope machinery depends on an unsupported premise.

## Findings

None open. AR-001…AR-007 are all resolved (see `architecture-review-revision-record.md`, ARCH-REV-005).

## Classification

N/A (Pass)

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`); informational notice to the Solution Designer.

## Residual Risks

Implementation notes (non-blocking):
- **Codex leases:** the Codex sign-in, models and limits steps each acquire the home-folder lease. If the sign-in lease's close is still running when models or limits call `beginAcquire`, it throws "unresolved cleanup" (`codex-app-server-client-manager.ts:30`). REQ-007 then gives models or limits "unknown". This is acceptable, but await the sign-in release before starting models ‖ limits, as the strategy's `finally` already does.
- **GraphQL encoding:** the report's mixed-type fields (`limits` / `models` as an array or a string) need one GraphQL encoding, which the page reads the same way the tool shows it (AC-010).
- RSK-001 (external formats), RSK-002 (concurrent short processes), RSK-003 / UNK-001 (Grok used %), RSK-004 (late Codex answers ignored) and UNK-002 (Docker parity, user verification) are as recorded. FU-001 is in `follow-ups.md`.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: SR-005 is ready for implementation. Against the SR-003 implementation already under way, the delta is the optional `limitsNote` (Codex credits case, Grok used % absent) and `signIn: "not checked"` in place of a sign-in note string. Classification stays Large / High, so the downstream code review is still required.
