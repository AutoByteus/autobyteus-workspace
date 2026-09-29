# Architecture Review Revision Record — chat-interface-entry

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1: initial review of SR-005 `Architecture Design Complete` (Large/High) | SR-003, SR-004, SR-005 | N/A | Fail (Design Impact) | AR-001, AR-002, AR-003, AR-004, AR-005 |
| ARCH-REV-002 | Round 2: SR-006 re-review | SR-006 | Fail (Design Impact) | Fail (Design Impact) | AR-001 (remaining part), AR-007 (new, Low); AR-002–AR-005 resolved |
| ARCH-REV-003 | Round 3: SR-007 re-review | SR-007 | Fail (Design Impact) | Pass | AR-001, AR-007 resolved |
| ARCH-REV-004 | Round 4: SR-008 post-implementation revision (CRR-002) | SR-008 | Pass | Fail (Design Impact) | AR-008 (new, High) |
| ARCH-REV-005 | Round 5: SR-009 re-review | SR-009 | Fail (Design Impact) | Pass | AR-008 resolved; IC-1 and IC-2 implementation constraints |
| ARCH-REV-006 | Round 6: SR-010 D-14 revision (after IR-002 Design Impact) | SR-010 | Pass | Pass | None; R-2 recommendation, MP-014 residual |
| ARCH-REV-007 | Round 7: SR-011 D-16 Chat model labels (UVF-001) | SR-011 | Pass | Fail (Design Impact) | AR-009 (new, Medium) |
| ARCH-REV-008 | Round 8: SR-012 D-16 re-review | SR-012 | Fail (Design Impact) | Pass | AR-009 resolved |
| ARCH-REV-009 | Round 9: SR-013 D-17 Product R3 integration | SR-013 | Pass | Fail (Design Impact) | AR-010, AR-011 (new, Medium), AR-012 (new, Low) |
| ARCH-REV-010 | Round 10: SR-014 D-17 re-review | SR-014 | Fail (Design Impact) | Pass | AR-010, AR-011, AR-012 resolved |
| ARCH-REV-011 | Round 11: SR-015 (CRR-010: D-15 Rule 3, D-18) | SR-015 | Pass | Pass | None; IC-3 implementation constraint |
| ARCH-REV-012 | Round 12: SR-016 D-19 one skill per name (DEC-017) | SR-016 | Pass | Fail (Design Impact) | AR-013 (new, High) |
| ARCH-REV-013 | Round 13: SR-017 D-19 re-review | SR-017 | Fail (Design Impact) | Pass | AR-013 resolved; R-3 adopted |
| ARCH-REV-014 | Round 14: SR-018 D-19 Agent Org amendment (CRR-012 CR-009, DEC-017a) | SR-018 | Pass | Fail (Design Impact) | AR-014 (new, Medium) |
| ARCH-REV-015 | Round 15: SR-019 AR-014 re-review | SR-019 | Fail (Design Impact) | Pass | AR-014 resolved |

## Revision Entries

### ARCH-REV-001 — Initial baseline: sound architecture; three local path gaps block implementation

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-review-report.md`
- Review round and trigger: Round 1, triggered by the Solution Designer handoff `architecture-review-handoff.md` (2026-09-28).
- Triggering role, report path, and finding IDs: Solution Designer. The handoff is at `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/architecture-review-handoff.md`. It carried no finding IDs.
- Relevant solution revision IDs: SR-003 (approved requirements), SR-004 (R2 supplement), SR-005 (design).
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`. Classification: `Design Impact`.
- What was established:
  - The behavior basis is confirmed.
  - The classification (Large/High) is confirmed.
  - The spines, ownership, removal plan, persisted-data decision (Directly Usable — No Migration) and team quick path pass.
  - Code evidence found three reachable gaps on already-designed owners:
    - The registered `temp-*` draft lifecycle in the chat view. This covers the route across promotion, the footer mode before the first send, and the destination after a failed first send (AR-001).
    - ALL_INSTALLED name-based resolution, which misses bundled definition-root skills (AR-003).
    - The voice transcript target, which is still bound to the active context (AR-004).
  - Two low items should be fixed in the same revision: the draft target factory placement (AR-002) and the title/summary source for tagged messages (AR-005).

#### Prior Finding Resolution

None

- New or remaining finding IDs: AR-001 (High), AR-003 (High), AR-004 (Medium), AR-002 (Low), AR-005 (Low)
- Material classification changes: None. There is no Requirement Gap.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - RSK-001, RSK-003, RSK-004 and RSK-005.
  - MP-005 is Unclear: the `/workspace` redirect with a stale agent selection on an org route. It is handled as a residual implementation constraint.

### ARCH-REV-002 — SR-006 re-review: four findings resolved; the footer-mode discriminator remains

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-review-report.md`
- Review round and trigger: Round 2, triggered by the Solution Designer re-review request (SR-006 section of `architecture-review-handoff.md`).
- Triggering role, report path, and finding IDs: Solution Designer. The prior report is ARCH-REV-001, with findings AR-001–AR-005.
- Relevant solution revision IDs: SR-006
- Prior authoritative decision: Fail (Design Impact)
- Current authoritative decision: Fail (Design Impact)
- What changed:
  - The behavior basis was reconfirmed; the SR-006 requirements edits are editorial only.
  - AR-002–AR-005 are verified resolved against the current design and code.
  - AR-001 is partly resolved. The D-13 route sync and the D-04 failed-launch destination are sound. But the D-08 footer mode is keyed on `config.isLocked`, and history-opened Offline persisted runs have `isLocked === false` (`agentRunOpenCoordinator.ts` L63, `runContextHydrationService.ts` L165). They would therefore be edited as drafts, bypassing `existingRunConfigStore` (MP-006).
  - New low finding AR-007: the New chat starting state versus the `chatDraftStore` reset ordering.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Partially resolved; still open (High) | SR-006 D-04, D-08, D-13 | The route sync and the destination are verified. The footer discriminator conflicts with the `isLocked = resumeConfig.isActive` hydration (MP-006) |
| AR-002 | Open (Low) | Resolved | SR-006 D-02, Dependency Rules, File Mapping | `composables/chat/chatDraftComposerTarget.ts`; the rule forbids agentInput → chat imports |
| AR-003 | Open (High) | Resolved | SR-006 D-11, Examples, sequence step 1 | Record layouts match `getBundledSkillDirectoriesFromDefinitionRoot`. The trusted and configured roots satisfy the existing provenance layout checks (agent_private `skills/<n>` or `agents/<a>/skills/<n>`, team_shared `skills/<n>`, global trustedRoot = sourceRoot). Web `/` uses the same catalog |
| AR-004 | Open (Medium) | Resolved | SR-006 D-02, Interfaces, Removal Plan | Both `toggleRecording` callers are covered (`AgentUserInputTextArea` → `VoiceInputButton`, `VoiceInputExtensionCard` → `settings-test`); the active-context read is removed |
| AR-005 | Open (Low) | Resolved | SR-006 D-09 | `initialSummary` = the pre-composition `requirement`; a tags-only message falls back to the instruction |

- New or remaining finding IDs: AR-001 (remaining part, High), AR-007 (new, Low)
- Material classification changes: None
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - RSK-001, RSK-003–RSK-006.
  - MP-005 is Unclear and handled by the change-driven redirect rule.
  - MP-007 is Not Reachable.

### ARCH-REV-003 — SR-007 re-review: all findings resolved; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-review-report.md`
- Review round and trigger: Round 3, triggered by the Solution Designer re-review request (SR-007 section of `architecture-review-handoff.md`).
- Triggering role, report path, and finding IDs: Solution Designer. The prior report is ARCH-REV-002, with findings AR-001 (remaining part) and AR-007.
- Relevant solution revision IDs: SR-007
- Prior authoritative decision: Fail (Design Impact)
- Current authoritative decision: Pass
- What changed:
  - The D-08 footer mode is keyed on run identity: `temp-*` → `context.config`; a permanent id → `existingRunConfigStore`, locked while live, runtime fixed when Offline, saved config applied at resume. AF-28 records the evidence.
  - Verified that a stopped-run model-config save goes through `studio-run-model-config-service.updateStoppedAgentRunModelConfig` → `agentRunService.updateStoppedModelConfig`, which is the same resume basis the existing gear editor uses.
  - The D-04 order keeps the UXJ-001 starting state until the route is pushed, then resets the draft.
  - The behavior basis is unchanged (SR-007 made no requirement edits).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (remaining part, High) | Resolved | SR-007 D-08, Ownership Boundaries, Boundary Map, `chatRunModelControls` row, Example, Guidance | Identity-keyed mode; the permanent-id path uses the existing owner and the server editability rule; consistent after a terminate or a reopen |
| AR-007 | Open (Low) | Resolved | SR-007 D-04 | Explicit order: mark `starting` → register → select → await send → route → reset |

- New or remaining finding IDs: None
- Material classification changes: None
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational)
- Remaining risks or uncertainty:
  - RSK-001 and RSK-003–RSK-006.
  - MP-005 is Unclear and handled by the redirect rule.
  - The escalation triggers in the design apply during implementation.

### ARCH-REV-004 — SR-008 (CRR-002) review: D-14 accepted; D-15 incomplete

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-review-report.md`
- Review round and trigger: Round 4, triggered by the Solution Designer's SR-008 revision after the API/E2E failure (API-REV-001) and Code Reviewer CRR-002.
- Triggering role, report path, and finding IDs: Code Reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md` (CR-002, CR-003, CR-004), routed by the Solution Designer.
- Relevant solution revision IDs: SR-008
- Prior authoritative decision: Pass (ARCH-REV-003, SR-007)
- Current authoritative decision: Fail (Design Impact)
- What changed:
  - D-14 is accepted. The `submissionPending` guard in the single reconcile owner is evidence-gated.
  - CR-002 is accepted as a local implementation fix.
  - D-15 is accepted in principle (the user-owned workspace skill wins under ALL_INSTALLED), but it is incomplete (AR-008):
    - Codex and Claude materialized skills are held in a process-wide registry for each run's lifetime.
    - A same-name skill with a different source, held by another live run in the shared temp workspace, still throws `sourceCollisionError`. This happens in both directions: the default chat fails, or an unchanged CONFIGURED agent launch fails while a chat is live.
    - This is reproducible from the user's real catalog, for example `software-tutorial-video-maker` (MP-008).
    - The ACP/Grok materializer is not in scope (MP-009).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001–AR-005, AR-007 | Resolved (ARCH-REV-003) | Still resolved | SR-007 | SR-008 does not affect them |

- New or remaining finding IDs: AR-008 (High)
- Material classification changes: None. CR-003 was reclassified by the designer as a Missing Invariant with evidence gating, and the reviewer accepts that.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - RSK-007 (the D-14 closer evidence).
  - MP-010 is Not Reachable.
  - The `/` description versus the workspace copy is a presentation note only.

### ARCH-REV-005 — SR-009 re-review: D-15 completed; Pass with implementation constraints

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-review-report.md`
- Review round and trigger: Round 5, triggered by the Solution Designer's SR-009 re-review request for ARCH-REV-004 AR-008.
- Triggering role, report path, and finding IDs: Solution Designer; ARCH-REV-004 AR-008.
- Relevant solution revision IDs: SR-009
- Prior authoritative decision: Fail (Design Impact)
- Current authoritative decision: Pass
- What changed:
  - D-15 now defines request strength (weak ALL_INSTALLED, strong configured).
  - Rule 1 covers user-owned entries.
  - Rule 2 covers different-source entries held by another run: Direction A skips; Direction B re-points links held only by weak holders and never fails; strong vs strong stays fail-fast.
  - ACP/Grok is in scope, and the example and V-A to V-E are added.
  - Code-derived implementation constraints recorded: IC-1 (release must be registry/count based after a re-point; today's descriptor identity and source checks would leak links) and IC-2 (Windows re-point via registry-serialized unlink + symlink where rename-over is unsupported).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-008 | Open (High) | Resolved | SR-009 D-15, File Mapping, Examples, V-A to V-E, AF-32 | Both directions of MP-008 are defined without failures caused by ALL_INSTALLED; strong vs strong is unchanged; the ACP factory is mapped (MP-009) |

- New or remaining finding IDs: None. IC-1 and IC-2 are implementation constraints. R-1 is a recommendation.
- Material classification changes: None
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational)
- Remaining risks or uncertainty:
  - RSK-007 (the D-14 closer evidence).
  - MP-012 / R-1 (a skipped weak skill after the strong holder releases).
  - Windows re-point coverage (IC-2).

### ARCH-REV-006 — SR-010 D-14 activation-pending marker: Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-review-report.md`
- Review round and trigger: Round 6, triggered by the Solution Designer's SR-010 after Implementation Engineer IR-002 returned `Design Impact` on D-14 (the closer confirmed, the premise disproved; AF-33).
- Triggering role, report path, and finding IDs: Implementation Engineer, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/implementation-evidence/README.md`, `implementation-handoff.md`.
- Relevant solution revision IDs: SR-010
- Prior authoritative decision: Pass (ARCH-REV-005, SR-009)
- Current authoritative decision: Pass
- What changed:
  - D-14 is now an `agentRunStore`-owned activation-pending marker, set from connect until server-confirmed activation or a handled failure, rejection or termination. Reconcile skips marked runs, and the `submissionPending` guard is removed cleanly.
  - Verified that no active snapshot can precede `SEND_MESSAGE`, so the reproduced loss window is closed.
  - Out-of-order snapshots after send (MP-013) are self-healing via the active-run reconnect; this is recommendation R-2.
  - D-15 and CR-002 are unchanged, with IC-1 and IC-2 honored and V-A to V-E passing (IR-002).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001–AR-005, AR-007, AR-008 | Resolved | Still resolved | SR-009, SR-010 | SR-010 changes D-14 only |

- New or remaining finding IDs: None
- Material classification changes: None
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational)
- Remaining risks or uncertainty:
  - R-2 (a generation guard for the workspace history branch).
  - MP-014 (the marker lifetime for a very short activation).
  - R-1 (weak co-holder).

### ARCH-REV-007 — SR-011 D-16 review: shared label policy accepted; persisted-run path not covered

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-review-report.md`
- Review round and trigger: Round 7, triggered by the Solution Designer's SR-011 after the user-verification Requirement Gap UVF-001 (Delivery DR-002). REQ-021 / AC-018 / DEC-015 were user-approved on 2026-09-29.
- Triggering role, report path, and finding IDs: Delivery, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/user-verification-finding-001.md`.
- Relevant solution revision IDs: SR-011
- Prior authoritative decision: Pass (ARCH-REV-006)
- Current authoritative decision: Fail (Design Impact)
- What changed:
  - The D-16 direction is accepted: shared `modelSelectionLabel` functions, recommended-first order, single-line truncation with a tooltip, an extended search, and the identifier-only shape removed.
  - AR-009: the persisted-run runtime-fixed list and the persisted trigger label are built in `chatRunModelControls.ts` from `ExistingRunModelChoice`, which lacks `providerType` and the shared model shape. They are filtered by a separate inline search in `ChatModelMenu.vue`, and neither is in D-16 or its file mapping.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001–AR-005, AR-007, AR-008 | Resolved | Still resolved | — | SR-011 touches only the model labels |

- New or remaining finding IDs: AR-009 (Medium)
- Material classification changes: None
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: R-1, R-2 and MP-014, as before.

### ARCH-REV-008 — SR-012 D-16 re-review: persisted path covered; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-review-report.md`
- Review round and trigger: Round 8, triggered by the Solution Designer's SR-012 re-review request for ARCH-REV-007 AR-009.
- Triggering role, report path, and finding IDs: Solution Designer; ARCH-REV-007 AR-009.
- Relevant solution revision IDs: SR-012
- Prior authoritative decision: Fail (Design Impact)
- Current authoritative decision: Pass
- What changed:
  - `toChatModelOption` is the single Chat option builder, with the catalog record first and the shared `existingRunChoiceLabelInput` (moved from `RuntimeModelConfigFields.vue`) as the fallback.
  - One search predicate serves both lists.
  - The comparator `compareRecommendedFirstBy<T>` is exported generically.
  - `chatRunModelControls.ts` and `RuntimeModelConfigFields.vue` are mapped, and V-L1 to V-L5 are added.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-009 | Open (Medium) | Resolved | SR-012 D-16, File Mapping, V-L2 | The persisted fixed list and label use the same builder and predicate; the existing gear-editor mapping (L218–L219) is reused, not copied |

- New or remaining finding IDs: None
- Material classification changes: None
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational)
- Remaining risks or uncertainty:
  - Relabeling while the catalog loads (reactive).
  - R-1, R-2 and MP-014, as before.

### ARCH-REV-009 — SR-013 D-17 review: R3 frame accepted; tab-context correction and draft ⚙ undefined

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-review-report.md`
- Review round and trigger: Round 9, triggered by the Solution Designer's SR-013 (Product R3, user-confirmed on 2026-09-29, DEC-016).
- Triggering role, report path, and finding IDs: Solution Designer. Sources: `solution-designer-result-uvf-002.md`, the `api-e2e-evidence/round4-desktop/USER-Q1-*` evidence and `ui-ux-spec.md` R3.
- Relevant solution revision IDs: SR-013
- Prior authoritative decision: Pass (ARCH-REV-008)
- Current authoritative decision: Fail (Design Impact)
- What changed:
  - The D-17 direction is accepted.
  - AR-010: D-17's "no contextual default on panel mount" removes the only mount-time correction. `activeTab` is global, the validity watcher is not immediate, and `/workspace` and `/chat` remount `RightSideTabs`. That gives a blank chat panel after Team → Chat and a changed Team default after Chat → Team.
  - AR-011: ⚙ for `temp-*` drafts reaches `ExistingRunConfigEditor` → `loadAgentCanonical(temp)`, which is broken today, and the draft footer is removed.
  - AR-012: REQ-021 and AC-015 are stale versus R3.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001–AR-005, AR-007–AR-009 | Resolved | Still resolved (AR-009's persisted Chat list is obsolete under D-17) | SR-013 | — |

- New or remaining finding IDs: AR-010 (Medium), AR-011 (Medium), AR-012 (Low)
- Material classification changes: None
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: R-1, R-2 and MP-014, as before.

### ARCH-REV-010 — SR-014 D-17 re-review: Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-review-report.md`
- Review round and trigger: Round 10, triggered by the Solution Designer's SR-014 re-review request for ARCH-REV-009.
- Triggering role, report path, and finding IDs: Solution Designer; ARCH-REV-009 AR-010, AR-011, AR-012.
- Relevant solution revision IDs: SR-014
- Prior authoritative decision: Fail (Design Impact)
- Current authoritative decision: Pass
- What changed:
  - The scoped tab-context rule is owned by `useRightSideTabs`, with a last-applied key, application on mount or on change, an explicit-selection exception and an immediate validity watcher.
  - The `DraftRunConfigEditor` draft branch is added for `temp-*` ⚙.
  - The requirements are editorially aligned.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-010 | Open (Medium) | Resolved | SR-014 D-17 strip rule | The rule covers remounts (MP-016) in both directions; Team/Org keys are unchanged |
| AR-011 | Open (Medium) | Resolved | SR-014 D-17 draft branch, File Mapping | `temp-*` never reaches `existingRunConfigStore`; validated for the catalog draft and the failed first send (MP-017) |
| AR-012 | Open (Low) | Resolved | requirements-doc REQ-021, AC-018, AC-015 | Aligned with DEC-016 |

- New or remaining finding IDs: None
- Material classification changes: None
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational)
- Remaining risks or uncertainty:
  - The standalone tab re-defaults on promotion and on chat switching (accepted).
  - R-1, R-2 and MP-014, as before.

### ARCH-REV-011 — SR-015 (CRR-010) review: D-15 Rule 3 and D-18 accepted; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-review-report.md`
- Review round and trigger: Round 11, triggered by the Solution Designer's SR-015 after Code Reviewer CRR-010 (API-REV-005 UF-04 / UF-03).
- Triggering role, report path, and finding IDs: Code Reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md` (CR-007, CR-008).
- Relevant solution revision IDs: SR-015
- Prior authoritative decision: Pass (ARCH-REV-010)
- Current authoritative decision: Pass
- What changed:
  - D-15 Rule 3 is accepted: an unresolved strong request against weak-only holders skips (no join, no re-point) and preserves the configured-launch invariant, with V-F.
  - D-18 is accepted: explicit draft `llmConfig` through the shared `applyModelConfigSchemaDefaults` plus the thinking defaults.
  - IC-3 is recorded: non-thinking keys equal the launch form, thinking keys are the adapter defaults written explicitly, the config is never an empty or `null` config for a schema model, and the validation is adjusted accordingly.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001–AR-005, AR-007–AR-012 | Resolved | Still resolved | SR-015 | SR-015 touches D-15 (Rule 3) and D-18 only |

- New or remaining finding IDs: None. IC-3 is an implementation constraint.
- Material classification changes: None
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational)
- Remaining risks or uncertainty: R-1, R-2 and MP-014, as before.

### ARCH-REV-012 — SR-016 D-19 review: single catalog accepted; name-based operations still use a second precedence

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-review-report.md`
- Review round and trigger: Round 12, triggered by the Solution Designer's SR-016, a user-approved requirements change (DEC-017; REQ-022–024, AC-019–021).
- Triggering role, report path, and finding IDs: the user (via the Solution Designer); AF-36.
- Relevant solution revision IDs: SR-016
- Prior authoritative decision: Pass (ARCH-REV-011)
- Current authoritative decision: Fail (Design Impact)
- What changed:
  - Accepted: the D-19 tiered single catalog, the one resolution for CONFIGURED and ALL_INSTALLED, import validation before commit, the error contract, the banner, the Codex path match, the pop-up spec, and the removal of D-15 Rules 2–3.
  - AR-013: `getSkill` → `findCatalogSkillLocation` (a Settings-ordered recursive search, with skill folders before bundles and tier 4 not demoted) still drives the Skills page detail, edit, delete (`rmSync`), enable/disable, file APIs and `skill-workspace.ts`. With the user's real duplicates they would act on the ignored copy.
  - R-3 is a recommendation on reload semantics.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001–AR-005, AR-007–AR-012 | Resolved | Still resolved | SR-016 | — |
| AR-008 (D-15 Rule 2) / IC-1 / IC-2 | Resolved / constraints | Superseded by D-19 (Rule 2 removed) | SR-016 | A single catalog source per name removes the cross-run different-source case; an out-of-band mid-run change stays fail-fast (residual) |

- New or remaining finding IDs: AR-013 (High)
- Material classification changes: None
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - R-2 and MP-014.
  - R-3 (reload semantics).
  - The Codex dual listing of stale default-folder copies (residual outside AutoByteus, noted in the design).

### ARCH-REV-013 — SR-017 D-19 re-review: Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-review-report.md`
- Review round and trigger: Round 13, triggered by the Solution Designer's SR-017 re-review request for ARCH-REV-012.
- Triggering role, report path, and finding IDs: Solution Designer; ARCH-REV-012 AR-013 and R-3.
- Relevant solution revision IDs: SR-017
- Prior authoritative decision: Fail (Design Impact)
- Current authoritative decision: Pass
- What changed:
  - `getSkill` and every by-name operation go through `resolveCatalogRecord`.
  - The second-precedence lookups and the resolver's global-name search are removed.
  - Ignored copies are read-only in the banner.
  - The mapping and validation are added.
  - Reload semantics are adopted.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-013 | Open (High) | Resolved | SR-017 D-19, File Mapping L806, validation | The grep at `f4864638b` shows the remaining by-name lookups (skill-service L85–L123, L189, L259, L295) are all in the removal list |

- New or remaining finding IDs: None
- Material classification changes: None
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational)
- Remaining risks or uncertainty:
  - The Codex dual listing of stale default-folder copies.
  - A mid-run out-of-band catalog change (fail-fast).
  - R-2 and MP-014.

### ARCH-REV-014 — SR-018 D-19 Agent Org amendment: scope accepted; sync/async enumeration undecided

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-review-report.md`
- Review round and trigger: Round 14, triggered by the Solution Designer's SR-018 after Code Reviewer CRR-012 CR-009 and the user's direction DEC-017a.
- Triggering role, report path, and finding IDs: Code Reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md` (CR-009).
- Relevant solution revision IDs: SR-018
- Prior authoritative decision: Pass (ARCH-REV-013)
- Current authoritative decision: Fail (Design Impact)
- What changed:
  - Accepted: org layouts in tier 2 (org agents, org-team shared skills, org-team local agents), the within-root order, the AGY roots per the existing layout checks, import validation over org layouts, and the validation cases.
  - AR-014: `listAgentOrgOwnedDefinitionSources` is async, while `SkillService.loadCatalog()` and all its callers are synchronous. The design must choose a synchronous correlation core with one owner, or an async catalog with the caller changes listed. It must also state how team-local agents inside org teams are enumerated.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001–AR-005, AR-007–AR-013 | Resolved | Still resolved | SR-018 | SR-018 touches the D-19 tier 2 only |

- New or remaining finding IDs: AR-014 (Medium)
- Material classification changes: None
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: as in ARCH-REV-013.

### ARCH-REV-015 — SR-019 re-review: synchronous org correlation core; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-review-report.md`
- Review round and trigger: Round 15, triggered by the Solution Designer's SR-019 re-review request for ARCH-REV-014 AR-014.
- Triggering role, report path, and finding IDs: Solution Designer; ARCH-REV-014 AR-014.
- Relevant solution revision IDs: SR-019
- Prior authoritative decision: Fail (Design Impact)
- Current authoritative decision: Pass
- What changed:
  - Option (a) was chosen: the pure `correlateAgentOrgOwnedMembers` core (one owner) with the async index delegating (signatures unchanged) and a new sync reader for the catalog, with parity tests.
  - Team-local agents are enumerated via the team dir's `agents/*`.
  - No catalog API change.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-014 | Open (Medium) | Resolved | SR-019 D-19, File Mapping L833–L834 | One correlation owner; the sync catalog is served without an API change |

- New or remaining finding IDs: None
- Material classification changes: None
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational)
- Remaining risks or uncertainty: as in ARCH-REV-013.
