# Implementation Revision Record — autobyteus-460

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md` round 2 (Pass) | N/A | `Initial Baseline` | SR-003, ARCH-REV-002 | Implementation complete; to Code Review |

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
- Local validation and result: see the handoff's Checks Run (IMP-01 … IMP-08).
- Next recipient or routing: Code Reviewer (Large / High).
- Remaining limitations or risks: see the handoff's Known Risks.
