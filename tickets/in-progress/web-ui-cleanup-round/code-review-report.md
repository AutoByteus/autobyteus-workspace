# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-001, Approved)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (E-03)
- Solution Revision Record Reviewed As Context: not reread (SR-001 only)
- Design Spec Reviewed As Context: `design-spec.md` (item 2: derived consumers, `agentRuntimeName`)
- Supplemental Task Artifacts Reviewed As Context: N/A for this failure
- Relevant Solution Revision IDs: SR-001
- Design Review Report Reviewed As Context: `N/A — direct route`
- Architecture Review Revision Record Reviewed As Context: N/A
- Relevant Architecture Review Revision IDs: N/A
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `N/A` (failure-origin round)
- Review Scope Evidence (round >1): N/A
- Trigger: API/E2E `Fail` at API-REV-001, case API-12
- Prior Review Round Reviewed: none
- Latest Authoritative Round: 1
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Delivery Revision Record Reviewed: N/A
- Relevant Delivery Revision IDs: N/A
- Failing Scenario IDs: API-12 → AC-003, REQ-003, BEH-003, SCN-002
- Exact Failing Commands / Execution Mode: isolated desktop instance of this worktree (`iso-50076-407f`, commit `a26305a2a7`). Applications → Brief Studio → Open app (launch setup), with "Show technical details" closed
- Failure Evidence Paths: `evidence/API-12-desktop-journey/FINDING-application-setup-runtime-kinds.txt`, `evidence/API-12-desktop-journey/JOURNEY.md`

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `Low`
- Selected route: `API/E2E Failure-Origin Review`
- Independent source review required by the classification: `Failure-origin exception` (direct route)
- Classification evidence or correction required: none. The fix is four template interpolations through the existing `agentRuntimeName`, so the classification stands.

## Review Scope

- Changed implementation and behavior reviewed: REQ-003's web display path for runtime names: the `agentRuntimeName` callers, and the places that show a runtime without it.
- Files / areas reviewed:
  - `autobyteus-web/components/applications/setup/ApplicationExecutionResourceSlotEditor.vue:39-102`;
  - `components/applications/ApplicationShell.vue:62-100,135-175` (what "Show technical details" hides);
  - `components/agents/AgentDefinitionDetailSections.vue:5-20` and its renderers (`AgentDetail.vue:81`, `agentTeams/TeamLocalAgentMemberDetails.vue:56`);
  - the helpers the other display sites use (`useRunSettingsPresentation.ts:64`, `ChatModelMenu.vue:305`, `ChatNewSurface.vue:170`, `modelRoutingPresentation.ts:52`, `tokenUsageStatisticsUi.ts:87`, `TokenUsageBreakdown.vue:122`);
  - the design's census (design-spec line 31; investigation E-03).
- Explicit exclusions:
  - no general review of the ticket or its tests;
  - API-09/API-10 test changes (they belong to the later proportional test review);
  - FU-001.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-003 says "every runtime name shown by the web app … is the full name … one list … is the only source". AC-003 says "full names everywhere", and an unknown kind shows the kind itself.
- Design-spec behavior map verified against the implementation: the DS-001 rule is that a runtime kind in any view becomes `agentRuntimeName(kind)`. The implementation applies it to every caller of the three old maps. The design's derived-consumer list (design-spec line 31, E-03) was built from those map callers only. Sites that print `runtimeKind` with no map at all were never in the census, so they were not converted.
- Design review report and round confirmed: N/A (direct route)
- Behavior-basis status: `Confirmed`. The approved behavior is unambiguous, and the failing view contradicts it.
- Changed or newly discovered behavior: none
- Remaining material ambiguity: none (see C-03)

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| BEH-003 | Confirmed (approved); implementation incomplete at 2 components | Converted sites all go through `agentRuntimeName`: Run Settings, chat menu and new-chat surface, Model Routing, Token Usage, and the app-setup runtime selects (full names in the API-12 capture) | (1) `ApplicationExecutionResourceSlotEditor.vue:52,64,88`: `{{ leaf.runtimeKind }}` in the launch-authority summary (Package baseline, Selected resource baseline, Effective configuration), rendered by `ApplicationLaunchSetupPanel` in both the page and panel presentations, always visible (`ApplicationShell.vue:87-92,168-174`). (2) **Also found in this review:** `AgentDefinitionDetailSections.vue:13`, the "Default runtime" field of an agent's detail (Agents → agent; Agent Teams → local member details), prints `agentDef.defaultLaunchConfig?.runtimeKind` raw |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-002a | BEH-003, AC-003 | User | User | Set up an application's launch before entering it | Applications → app → Open app | Normal | `ApplicationShell` → `ApplicationLaunchSetupPanel` → `ApplicationExecutionResourceSlotEditor` authority summary | Full runtime names; observed `codex_app_server` | API-12 DOM capture | Supported Normal Scenario | Use |
| SCN-002b | BEH-003, AC-003 | User | User | See an agent's defaults | Agents → an agent (or a team's local member) | Normal | `AgentDetail` / `TeamLocalAgentMemberDetails` → `AgentDefinitionDetailSections` "Default runtime" | Full runtime name; code prints the kind | Code read; agents with a default runtime are normal (Brief Studio's agents default to `codex_app_server`) | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | The launch-authority summary prints raw runtime kinds | SCN-002a, REQ-003 | Open app setup | Always visible, beside selects that show full names | API-12 capture; `SlotEditor.vue:52,64,88` | Promote | This ticket | REQ-003 says "every runtime name shown"; the summary is in scope even though the file was untouched. Fix: `agentRuntimeName(leaf.runtimeKind)` at the three sites |
| C-02 | The agent detail "Default runtime" prints the raw kind | SCN-002b, REQ-003 | Open an agent | Visible on the agent page and in team member details | `AgentDefinitionDetailSections.vue:13`; renderer `AgentDetail.vue` is touched by this ticket | Promote | This ticket | Same rule. Fix: `agentRuntimeName(...)` when set, else "Not set" as today. API/E2E's grep matched only `{{ … runtimeKind }}`, and this site has `runtimeKind \|\| $t(…)` |
| C-03 | Read the summary as technical metadata that belongs behind "Show technical details" (a scope question) | SCN-002a | — | The toggle in `ApplicationShell.vue:66-82,145-162` hides only the application's `detailItems`. The launch setup panel, and its summary, is outside the toggle in both presentations | Code read | Reject | — | The product shows the summary by default, so REQ-003 applies to it as it is. Moving it behind a toggle would be new UI behavior outside the Scope Guardrail ("a wider UI-tidiness sweep") |
| C-04 | The same summary shows other raw identifiers by default (`PACKAGE_TEAM_DEFAULT:bundle-team__…`, `llmConfig: …`, `workspace: APPLICATION_RUNTIME`) | — | Open app setup | Visible technical identifiers on a user page | API-12 capture; `SlotEditor.vue:89-96` | Promote | Follow-up (FU-002) | Not a runtime name; the ticket's items work without it |
| C-05 | Was this a source-review gap? | — | — | Direct route: no source review was selected. The census method (map callers only) could not list sites with no map | design-spec line 31 | Reject | — | Not a reviewer gap. It is an incomplete census, fixed within the design's own rule, so it needs no design revision |

## Docs-Impact Verdict

- Docs impact: `No`

## Findings

| ID | Location | Problem | Required Action |
| --- | --- | --- | --- |
| FO-001 | `autobyteus-web/components/applications/setup/ApplicationExecutionResourceSlotEditor.vue:52,64,88` | The launch-authority summary shows runtime kinds (`codex_app_server`) instead of names (AC-003, REQ-003) | Show `agentRuntimeName(leaf.runtimeKind)` at all three sites. Add a component assertion in `components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts` (it already has a `codex_app_server` fixture at `:169`) that the summary shows "Codex App Server" |
| FO-002 | `autobyteus-web/components/agents/AgentDefinitionDetailSections.vue:13` | The "Default runtime" field shows the kind | `agentRuntimeName(kind)` when set; keep "Not set" when empty. Add an assertion (an agent detail spec or a new small one) |
| — | Census check | The miss came from building the census from the old maps' callers only | Before handing off, rerun a census for any template, attribute or string that shows `runtimeKind` without `agentRuntimeName`, covering `{{ x.runtimeKind \|\| … }}` and `${…runtimeKind}` forms as well as `{{ x.runtimeKind }}`. Record the result in the handoff. My own search (`components`, `composables`, `stores`, `utils`, `pages`, `layouts`) found no third display site; the rest are keys, `data-test` values, store keys and request keys |

## Follow-ups

- Follow-ups this review added: FU-002 (the launch-authority summary shows technical identifiers by default).

## Classification

- `Local Fix`, owned by the Implementation Engineer.
- Why: a bounded implementation defect against an unambiguous approved requirement and the design's own rule (`agentRuntimeName` for every displayed runtime kind). The design's census was incomplete, but its structure and decisions stand, so no upstream revision is needed.
- Why not a scope question: see C-03.

## Recommended Recipient

- Implementation Engineer (per `get_handoff_rules`).
- Then API/E2E reruns the affected views: the app setup summary and agent detail. The rest of API-12 and API-01…11 stay valid unless the fix touches their paths. The API/E2E test commits (bacc8f51fd, a26305a2a7) get their proportional test review after the next API/E2E pass.

## Residual Risks

- Server-side texts (AC-004) were not part of this failure and are not re-examined here.

## Latest Authoritative Result

- Review Decision: `Fail` (failure origin classified)
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: N/A (failure-origin round)
- Failure Origin: implementation defect. Two display sites, unchanged since before this ticket, were missed by the census and still print runtime kinds (FO-001, FO-002)
- Recommended Recipient: Implementation Engineer
- Notes: API/E2E's preliminary `Local Fix (implementation)` is confirmed, and widened by FO-002.
