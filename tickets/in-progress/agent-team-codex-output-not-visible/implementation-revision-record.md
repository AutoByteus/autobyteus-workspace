# Implementation Revision Record

The current code and `implementation-handoff.md` are authoritative. This record identifies the initial implementation baseline and its review routing.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `architecture_reviewer` / `design-review-report.md` / ARCH-REV-003 | `N/A` | `Initial Baseline` | `SR-001`–`SR-003`, `ARCH-REV-003` | Complete cumulative implementation ready for source review |
| IR-002 | `code_reviewer` / `code-review-report.md` / CRR-001 | `CR-F-001` | `Local Fix` | `SR-001`–`SR-003`, `ARCH-REV-003`, `CRR-001` | Retryable recovery feedback is non-blocking and the same Team member remains selectable |

## Revision Entries

### IR-001 — Strict Team status projection and checkpointed stream recovery

- Triggering role, report path, and round: `architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-codex-output-not-visible/tickets/in-progress/agent-team-codex-output-not-visible/design-review-report.md`; `ARCH-REV-003`
- Triggering finding IDs: `N/A`
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: complete cumulative SR-003 implementation ready for code review
- Related solution revision IDs: `SR-001` through `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: establishes the first implementation handoff for the reviewed Agent Team Codex live-output correction and explicit loss-recovery design.
- Approved behavior or requirement IDs affected: `BEH-001` through `BEH-005`; `DS-001` through `DS-007`; `R-001` through `R-011`; `AC-001` through `AC-015`.
- Implementation delta: split snapshot/live Team Agent status projection; add the read-only RootTeamRun execution checkpoint and GraphQL query; make rejected-gap effects execute; replace stream booleans with one synchronization phase; expose persistent recovery guidance; route failed selection through stable checkpoint hydration and an unpublished exact-base candidate; commit registry/context replacement once; prevent normal reconnect/background reconciliation from reviving the failed stream.
- Changed files or areas: server Team streaming projectors, RootTeamRun and Team history GraphQL boundary, frontend Team execution/streaming/hydration/open/store selection owners, Team workspace/localization, and focused unit/integration/component tests.
- Local validation and result: server focused 14/14, checkpoint 3/3, broad 41/41, handler 5/5, production build/bootstrap pass; frontend focused 97/97, recovery 10/10, run-history 36/36, broad 109/109, boundary/localization guards pass, production Nuxt build pass; source and `git diff --check` audits pass. General typecheck limitations are recorded in the current handoff.
- Next recipient or routing: `code_reviewer` for complete cumulative source and structural review.
- Remaining limitations or risks: independent API/E2E coverage investigation and the isolated real Codex/provider/browser journey remain required; no live downstream environment was started during implementation.

### IR-002 — Preserve retry selection through expected recovery refusals

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-codex-output-not-visible/tickets/in-progress/agent-team-codex-output-not-visible/code-review-report.md`; `CRR-001`
- Triggering finding IDs: `CR-F-001`
- Classification: `Local Fix`
- Prior authoritative result: `Fail — Local Fix`
- Current authoritative result: corrected cumulative implementation ready for focused and complete cumulative source re-review
- Related solution revision IDs: `SR-001` through `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: expected recovery refusals populated `runHistoryStore.error`, causing the history panel to replace its tree and remove the Team-member action needed for a later retry.
- Approved behavior or requirement IDs affected: `BEH-004`; `DS-005`, `DS-006`; `R-005`–`R-007`; `AC-007`–`AC-010`.
- Implementation delta: classify only the stable open-work, checkpoint-change, and snapshot-base recovery refusal codes at the existing selection boundary; leave the panel-global fatal error clear for those refusals; pass a wait/retry presentation fact to the existing history-panel presentation owner; render localized EN/ZH informational toast copy; preserve the existing thrown refusal, failed context, selected identities, and explicit user-driven retry.
- Changed files or areas: `runHistorySelectionActions.ts`, `useWorkspaceHistorySelectionActions.ts`, `WorkspaceAgentRunsTreePanel.vue`, EN/ZH workspace catalogs, and focused selection/composable/rendered-panel tests.
- Local validation and result: focused 3 files / 61 tests pass; cumulative changed frontend 11 files / 159 tests pass; web boundary/localization guards pass; Nuxt production build passes with 15 routes; `git diff --check` and source/cleanup checks pass. The stopped non-authoritative overbroad invocation is disclosed in the current handoff.
- Next recipient or routing: `code_reviewer` for focused `CR-F-001` verification plus complete cumulative source/structural re-review.
- Remaining limitations or risks: real isolated Codex/provider/browser execution remains downstream-required after source Pass; no live downstream environment was started.
