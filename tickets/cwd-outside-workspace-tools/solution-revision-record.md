# Solution Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | Initial solution baseline after user approval | N/A | `Initial Baseline` | Requirements and terminal cwd policy approved; design spec produced for initial architecture review. |
| SR-002 | `/architecture_reviewer` design review report, Round 1 | `ARCH-DI-001`, `MP-001` | `Design Impact Rework` | Revised requirements, investigation notes, supplement, and design spec; package is ready for architecture re-review. |

## Revision Entries

### SR-001 — External terminal cwd baseline

- Triggering role, report path, and round: Initial solution baseline; user clarification and approval on 2026-08-22; no prior review report.
- Triggering finding IDs: N/A.
- Prior authoritative result: `N/A`.
- Current authoritative result: User-approved Design-ready requirements and supplement; architecture review pending.
- Why this baseline or revision entry is recorded: Establishes the first complete solution package for removing the current-workspace limitation from the two cwd-bearing agent terminal tools.
- Resolution: `run_bash` and `start_background_process` accept existing explicit absolute cwd outside the workspace, including external project/worktree roots. Relative cwd remains workspace-root-relative and lexically/physically contained. Omitted cwd defaults, statelessness, directory validation, shell/platform handling, and process lifecycle remain unchanged. Sandbox implementation and cross-category security policy are explicitly deferred.
- Approved behavior or requirement IDs affected: BEH-001–BEH-007; REQ-001–REQ-010; AC-001–AC-010.
- Canonical artifacts and sections updated: `requirements.md` status, current/desired behavior, scope guardrail, functional requirements, acceptance criteria, risks, and approval status; `investigation-notes.md` status, user clarification, evidence, and architecture notes; `design-spec.md` complete initial design package.
- Supplemental artifacts updated, added, or removed: `terminal-cwd-policy.md` promoted from Draft to user-approved intended behavior; relative traversal containment added explicitly.
- Downstream and architecture-review impact: `/architecture_reviewer` should review the narrow terminal resolver/schema/docs change and verify that no sandbox or unrelated tool policy is introduced.
- Next recipient or routing: `/architecture_reviewer`.
- Remaining gaps or risks: No dependency-backed runtime evidence yet; downstream implementation/API-E2E stages must validate external cwd on supported platforms and built artifacts. True sandbox/security protection remains a separate ticket.

### SR-002 — Resolver-owned inaccessible-cwd preflight

- Triggering role, report path, and round: `/architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/design-review-report.md`; Round 1.
- Triggering finding IDs: `ARCH-DI-001`; material premise `MP-001` is `Reachable`.
- Prior authoritative result: `Fail` for implementation readiness; the approved external-absolute cwd behavior and package structure were otherwise confirmed.
- Current authoritative result: Revised Design-ready solution package prepared for architecture re-review; no user-approved behavior was changed.
- Why this revision is recorded: The initial design stated directory validation but did not make existing-but-inaccessible cwd handling actionable before process creation.
- Resolution: Keep `resolveExecutionCwd` as the single terminal cwd owner. After absolute/relative resolution, physical normalization, and directory/type validation, add host filesystem accessibility preflight. Map access failures for existing directories to the existing working-directory validation error path with `Working directory '<path>' is not accessible.` (or the platform-equivalent existing validation wording). Complete this before `ShellCommandExecutor.execute` or `BackgroundProcessManager.startCommand`; validate the host Windows path before WSL conversion; keep WSL translation as an execution adapter. Define no-spawn coverage for inaccessible absolute and workspace-relative cwd values through both tools.
- Approved behavior or requirement IDs affected: `BEH-005`; `REQ-005`; `AC-006`, `AC-007`. The trusted-local external absolute behavior, relative containment, and sandbox deferral remain unchanged.
- Canonical artifacts and sections updated: `requirements.md` behavior/requirement/acceptance basis; `investigation-notes.md` review evidence, behavior map, file ownership, and open risks; `design-spec.md` resolver validation contract, MP-001, spines, ownership, file mapping, change sequence, risks, and implementation guidance.
- Supplemental artifacts updated, added, or removed: `terminal-cwd-policy.md` operation matrix and invariants now state pre-spawn accessibility, error mapping, host/WSL ordering, and no-spawn behavior.
- Downstream and architecture-review impact: Implementation remains blocked pending architecture confirmation of the revised contract; no sandbox, command authorization, file-tool, browser, MCP, or provider policy is introduced.
- Next recipient or routing: `/architecture_reviewer` after explicit user confirmation to resume the handoff.
- Remaining gaps or risks: No dependency-backed runtime evidence yet; platform ACL/WSL behavior and TOCTOU limitations require downstream validation. A preflight is not a sandbox or an absolute guarantee that later spawn will succeed.
