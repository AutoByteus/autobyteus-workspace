# Implementation Revision Record — autobyteus-460

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md` round 2 (Pass) | N/A | `Initial Baseline` | SR-003, ARCH-REV-002 | Implemented; Design Impact DI-001 to the Solution Designer |
| IR-002 | Architecture Reviewer, `design-review-report.md` round 3 (Pass) | DI-001 | `Design Impact` (resolved by SR-004) | SR-004, ARCH-REV-003 | Claude preparation ensures `.claude/skills`; AC-011 passes live; to Code Review |

## Revision Entries

### IR-001 — Running agents take skills added to their definition, and hear about added and removed skills

- Triggering role, report path, and round: Architecture Reviewer, `tickets/in-progress/running-agent-config-reload-460/design-review-report.md`, round 2 (`Pass`).
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: implementation of design SR-003 against requirements SR-002, with the checks in the handoff's Checks Run.
- Related solution revision IDs: SR-002 (requirements), SR-003 (design).
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: first implementation round.
- Approved behavior or requirement IDs affected: BEH-001, BEH-002, BEH-005, BEH-008; REQ-001 … REQ-008; AC-001 … AC-012. Preserved: BEH-003, BEH-004, BEH-006, REQ-007.
- Implementation delta (design Change / Refactor Sequence):
  1. Codex skill request planning moved out of `codex-thread-bootstrapper.ts` into `codex-workspace-skill-request-planner.ts` (unchanged rule, one planner for start and mid-run).
  2. `backends/shared/run-workspace-skills.ts` (`RunWorkspaceSkills`): the single holder of a run's workspace links (Claude, Codex, Grok, DeepSeek) from preparation to release; `acquire`, `addFrom` (one name per acquisition, serialized), `release` (`closed` → await the add → release; retryable), `hasSkills`. Claude, Codex and ACP preparation and release moved onto it; `ProviderPreparationGuard.ownSkill`, the factory `skills` arrays, ACP `owner.skills`, `materializedConfiguredSkills` (Claude, Codex contexts), `CodexThreadCleanup` and Claude's dead `configuredSkills` field removed.
  3. `AgentRunBackend.applyDefinitionSkills` + `AgentRun.applyDefinitionSkills` (rejects an inactive run); Claude, Codex, ACP through `RunWorkspaceSkills.addFrom`; Antigravity `addAgyRunCapsuleSkills` (one binding per linker call, atomic manifest rewrite); native no-op.
  4. Credential proxy: `RunPassRegistry.grantedIntegrationIds`, `IntegrationRunAccess.integrationsStartingOnRestart` (read only).
  5. Skill notices: `added` change kind and "now available" block; tracker holds each run's current definition (`applyDefinition`), restored-run seeding removed (DEC-002); service subscribes to `AgentDefinitionChangeSignal` with a coalesced pass (setup, then notice); composition and both hosts pass `definitionChanges` and `integrationRunAccess`.
  6. Module docs.
- Changed files or areas: see the handoff's Key Files Or Areas.
- Local validation and result: see the handoff's Checks Run (IMP-01 … IMP-11).
- Next recipient or routing: Solution Designer (Design Impact DI-001, measured in IMP-07…09).
- Remaining limitations or risks: see the handoff's Known Risks.

### IR-002 — Claude preparation ensures `<workspace>/.claude/skills` exists (DI-001 → SR-004)

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md`, round 3 (`Pass`, ARCH-REV-003), on design SR-004.
- Triggering finding IDs: DI-001 (IR-001).
- Classification: `Design Impact`, resolved upstream by SR-004 (option (a)); requirements unchanged (SR-002), AC-011 kept.
- Prior authoritative result: IR-001, implemented except DI-001 (AC-011 failed for a Claude run that started with zero skills).
- Current authoritative result: AC-011 passes live for a zero-skills Claude start (IMP-13).
- Related solution revision IDs: SR-004. Related architecture-review revision IDs: ARCH-REV-003. Others: N/A.
- Why this revision is recorded: the DI-001 change.
- Approved behavior or requirement IDs affected: REQ-008, AC-011.
- Implementation delta:
  - `ClaudeSessionBootstrapper.bootstrapInternal` (new and restore) calls `ensureWorkspaceSkillsFolder(runId, workingDirectory)` right after the working directory is resolved, before skills are acquired and before the session starts.
  - That function runs a recursive `mkdir` of `path.join(workingDirectory, ...CLAUDE_WORKSPACE_SKILL_MATERIALIZATION_PROFILE.workspaceSkillsRootSegments)`, so the segments are not repeated.
  - A failure is logged as `CLAUDE_WORKSPACE_SKILLS_FOLDER_FAILED: run=<id>, folder=<path>: <error>` and does not fail the preparation (REQ-008). Nothing removes the folder. Codex, Grok and DeepSeek are unchanged (U-001).
- Changed files or areas:
  - `src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts`;
  - `tests/unit/agent-execution/backends/claude/backend/claude-session-bootstrapper.test.ts`: a test-owned workspace instead of a fixed `/tmp` path, plus two SR-004 cases;
  - `docs/modules/agent_execution.md`.
- Local validation and result: IMP-12 (type gate; Claude unit, integration and per-runtime suites, 281 passed), IMP-13 (live Claude zero-skills start: `Launching skill: codeword-probe`).
- Next recipient or routing: Code Reviewer (Large / High).
- Remaining limitations or risks: unchanged from IR-001 apart from DI-001. The new user-visible effect is an empty `.claude/skills` in a workspace where no Claude run with a skill had run (design SR-004).
