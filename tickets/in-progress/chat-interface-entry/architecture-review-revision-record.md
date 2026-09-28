# Architecture Review Revision Record — chat-interface-entry

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1: initial review of SR-005 `Architecture Design Complete` (Large/High) | SR-003, SR-004, SR-005 | N/A | Fail (Design Impact) | AR-001, AR-002, AR-003, AR-004, AR-005 |
| ARCH-REV-002 | Round 2: SR-006 re-review | SR-006 | Fail (Design Impact) | Fail (Design Impact) | AR-001 (remaining part), AR-007 (new, Low); AR-002–AR-005 resolved |
| ARCH-REV-003 | Round 3: SR-007 re-review | SR-007 | Fail (Design Impact) | Pass | AR-001, AR-007 resolved |

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
