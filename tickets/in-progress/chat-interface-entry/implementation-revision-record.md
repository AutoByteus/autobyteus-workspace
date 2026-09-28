# Implementation Revision Record

The current code on `codex/chat-interface-entry` and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | architecture_reviewer / `architecture-review-handoff.md` / ARCH-REV-003 pass | N/A | `Initial Baseline` | SR-003, SR-004 (R2 UI supplement), SR-007; ARCH-REV-003; CRR N/A; API-REV N/A; DR N/A | Implemented per design D-01..D-13; ready for code review |
| IR-002 | architecture_reviewer / `architecture-review-handoff.md` / ARCH-REV-005 pass (after API-REV-001 and CRR-002) | CR-002 (F-01), CR-003 (F-02), CR-004 (F-03), AR-008, IC-1, IC-2 | `Local Fix` (CR-002) + design execution (D-15) + `Design Impact` (D-14) | SR-008, SR-009; ARCH-REV-004, ARCH-REV-005; CRR-001, CRR-002; API-REV-001; DR N/A | CR-002 and D-15 complete and validated; D-14 guard implemented but shown insufficient → Design Impact to solution designer |

## Revision Entries

### IR-001 — Chat entry, skillScope and built-in Daily Assistant (initial implementation)

- Triggering role, report path, and round: architecture_reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/architecture-review-handoff.md`, ARCH-REV-003 (pass).
- Triggering finding IDs: N/A
- Classification: Initial Baseline
- Prior authoritative result: N/A
- Current authoritative result: Implementation complete on branch `codex/chat-interface-entry` (base `origin/personal@fcd3e83a4`), commits `770b14651`, `b7336203a`, `3655bd20a`, `49b0ef457`, `360de94a9`, `797d49d6a`. Classification Large / High confirmed.
- Related solution revision IDs: SR-003, SR-004, SR-007
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: initial implementation handoff baseline.
- Approved behavior or requirement IDs affected: BEH-001, 003, 004, 005, 007, 008, 009, 010, 011, 012, 013, 014; REQ-007 (system); REQ-017; REQ-001..020 through the R2 UI supplement.
- Implementation delta (by design change sequence):
  1. Server `skillScope` + `SkillService.listInstalledSkillRecords()` / ALL_INSTALLED record bindings / `hasEffectiveSkills` (D-10, D-11).
  2. Server built-in Daily Assistant with `seedIfMissing` sync policy (D-09).
  3. Web `skillScope` contract and agent editor/card/detail (D-10).
  4. Behavior-preserving refactor: `ComposerTarget`, voice-input request by target, extracted `VoiceInputButton`/`VoiceInputStatusRow`/`MessagePrimaryActionButton`, `AgentEventMonitor #composer` slot, scoped `useRightPanel`, `WorkspaceToolShell` (D-01, D-02, D-03). Landed with team/org/agent tests passing before any Chat code (RSK-004).
  5. Skill-request instruction codec, `requestedSkillNames`, message chips (D-06, D-07).
  6. Chat draft store, `registerDraftRun`, `chatLaunchService` (agent + team quick path), chat routing (`buildAgentRunChatRoute`, `resolveSelectionRoute`), `useChatRouteRunSync` (D-04, D-05, D-12, D-13).
  7. Chat components (New chat surface, composer, menus, run header/view, run model controls by id — D-08), `pages/chat.vue`, `/` redirect, `/workspace` selection-change redirect, left-panel Chat item and pencil, tree `+`.
  8. Removal of `AgentWorkspaceView`, `runHistoryDraftActions`, `runHistoryStore.createDraftRun`, the standalone branch of `WorkspaceAdaptiveLayout`, and their i18n keys and tests.
  9. Chat/shell localization (en, zh-CN), audit scope M-016, docs (web `chat.md`, layout, execution, agent management, skills; server `agent_definition.md`, `skills.md`).
- Changed files or areas: see `implementation-handoff.md` → Key Files Or Areas.
- Local validation and result: server unit tests for skills/agent-definition/built-in-agents/backends pass except the baseline `codex-tool-log-correlation`; the agent-definitions GraphQL e2e passes; `pnpm build:full` (typecheck + built-in smoke) passes. `pnpm test:nuxt run` shows only the 4 baseline failing files (3320 passed) and `pnpm test:electron run` passes (177); web vue-tsc shows no new errors versus the base commit (per-file/message comparison); boundary/localization/literal guards pass. Rendered self-validation at 1440×900 and 390×844 (details in handoff).
- Next recipient or routing: per `get_handoff_rules` (code review for Large/High).
- Remaining limitations or risks: see handoff Known Risks (AGY ALL_INSTALLED name collisions with workspace skills; AGY/Claude and voice not exercised live; base branch advanced by 6 unrelated AGY commits — trial merge clean).

### IR-002 — CR-002 footer thinking, D-15 skill request strength, D-14 guard (Design Impact)

- Triggering role, report path, and round: architecture_reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/architecture-review-handoff.md`, ARCH-REV-005 (pass). The round follows API/E2E API-REV-001 (`api-e2e-execution-coverage-report.md`) and code review CRR-002 (`code-review-report.md`).
- Triggering finding IDs: CR-002 / F-01; CR-003 / F-02; CR-004 / F-03; AR-008; IC-1; IC-2. CR-001 (a stale mock) was fixed by API/E2E in their uncommitted test change.
- Classification:
  - CR-002: `Local Fix`.
  - D-15: design execution.
  - D-14: implemented as designed. The required evidence then disproved its premise, so it is classified `Design Impact`.
- Prior authoritative result: IR-001 (commits through `717603e61`). API-REV-001 failed on F-01, F-02 and F-03.
- Current authoritative result: commit `da1033860`.
  - CR-002 and D-15 are complete, and validated live on Claude, Codex, Grok (ACP) and AGY.
  - The D-14 guard is in place but does not close the reproduced race. The design needs revision; see the D-14 evidence.
- Related solution revision IDs: SR-008, SR-009
- Related architecture-review revision IDs: ARCH-REV-004, ARCH-REV-005
- Related code-review revision IDs: CRR-001, CRR-002
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: this is the implementation round for the SR-009 package.
- Approved behavior or requirement IDs affected:
  - BEH-010 (REQ-011, AC-009; UXJ-007/VIS-015) for CR-002;
  - BEH-005 and REQ-017 (D-15 Direction B), plus REQ-007 (system) and AC-002, for D-15;
  - BEH-005 and REQ-003 (D-04/D-13) for D-14.
- Implementation delta:
  - **CR-002** (`autobyteus-web/components/chat/chatRunModelControls.ts`).
    - In persisted mode, the footer requests the run's runtime catalog when it is `idle`. That catalog is the thinking-schema source for a live run, whose canonical config is not loaded.
    - A failed load is not retried. DEC-009 is unchanged: a model without thinking parameters still hides the control.
  - **D-14** (`autobyteus-web/stores/runHistoryLoadActions.ts`). `reconcileDiscoveredActiveRuns` skips contexts with `submissionPending === true`, exactly as designed; no other guard was added.
  - **D-15 strength**.
    - New `backends/shared/skill-request-strength.ts` (`SkillRequestStrength`, `skillRequestStrengthForScope`, `isWeakSkillRequest`).
    - New `SkillService.resolveSkillScope(definition)`, which the service's own scope checks now use as well.
    - The Codex, Claude and ACP/Grok bootstrappers and the AGY factory pass `requestStrength` / `skillRequestStrength`. The materializers never read `skillScope`.
  - **D-15 shared materializer** (`workspace-skill-materializer.ts`).
    - Registry entries hold a `holders` map of `{runId, strength}`; `strongHolderCount`/`weakHolderCount` are derived from it.
    - Each acquisition gets its own descriptor, carrying `holderId` and `requestStrength`.
    - The acquisition outcome carries `workspace-owned` for Rule 1, so joiners apply their own strength.
    - Rule 2 Direction A: `skipped-held-by-other-run`.
    - Rule 2 Direction B: `yieldToConfigured`. The entry stays `acquiring` for the whole switch, holders are merged, `yielded-to-configured` is logged, and on failure the previous source is restored.
    - Release is keyed by holder (IC-1).
  - **Link operations** moved to the new `workspace-skill-links.ts`.
    - `replaceOwnedLink` implements IC-2: a temporary link renamed over the old one, falling back to unlink + link on EPERM/EEXIST/EACCES/ENOTEMPTY/EISDIR.
    - `removeLinkToSource` checks against the entry's current source.
  - **AGY Rule 1** (`agy-configured-skill-materializer.ts`): a weak request skips an existing `<workspace>/.agents/skills/<name>` and logs `disposition=skipped-workspace-owned`. A strong request still throws `AGY_SKILL_NAME_COLLISION`.
  - **Docs:** server `docs/modules/skills.md`, new section "Request strength".
- Changed files or areas: listed in the commit `da1033860` stat. Tests:
  - New `workspace-skill-materializer-request-strength.test.ts` (18 tests) and `runHistoryReconcilePendingSubmission.spec.ts`.
  - Updated: the materializer, AGY capsule/factory, ACP factory, Claude/Codex bootstrapper, skill-service scope and chatRunModelControls specs.
  - SkillService mocks gained `resolveSkillScope`.
- Local validation and result:
  - Server:
    - `tsc -p tsconfig.build.json` is clean, and `pnpm build:full` passes, including the built-in smoke.
    - Unit tests for agent-execution, skills, agent-definition and built-in-agents: 1038 passed. The only failures are the baseline `agent-run-provisioning` and `codex-tool-log-correlation`.
    - Touched integration tests pass, except `brief-package-team-prompt`, which needs a built application package and fails identically without these changes.
  - Web:
    - `pnpm test:nuxt run`: only the 4 baseline failing files (3324 passed).
    - `pnpm test:electron run`: 177 passed. One unrelated flake appeared once in four runs.
    - vue-tsc shows no errors in the changed files.
  - Live D-15 (`implementation-evidence/d15-skill-strength-probe.mjs`): V-A to V-E pass on Claude, Codex and Grok (ACP), and V-D (Rule 1) passes on AGY.
  - Live CR-002 (dev env, Codex `gpt-5.6-sol`): after a fresh load of a live chat, the footer shows the thinking control locked at "Low" with the lock tooltip, and the model is locked.
  - D-14:
    - The unit reproduction fails without the guard and passes with it.
    - The live deterministic reproduction fails both before and after the guard. The closer in both is `reconcileDiscoveredActiveRuns`.
    - The resend probe streamed 14/14 with 0 losses.
    - Full detail is in `implementation-evidence/README.md`.
- Next recipient or routing: `Design Impact` (D-14) → solution designer, via `get_handoff_rules`.
- Remaining limitations or risks:
  - The D-14 race remains open (RSK-007). The server sends `AGENT_STATUS offline` on connect, which clears `submissionPending` before `SEND_MESSAGE`.
  - The Codex V cases use a `resume-designer` pair, because `software-tutorial-video-maker` is natively discoverable from the user's `~/.codex/skills`.
  - The live screenshot tool failed; the CR-002 rendered check is from DOM inspection.

