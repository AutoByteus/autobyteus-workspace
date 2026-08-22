# Solution Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | Initial solution baseline after user approval | N/A | `Initial Baseline` | Requirements and terminal cwd policy approved; design spec produced for initial architecture review. |
| SR-002 | `/architecture_reviewer` design review report, Round 1 | `ARCH-DI-001`, `MP-001` | `Design Impact Rework` | Revised requirements, investigation notes, supplement, and design spec; package is ready for architecture re-review. |
| SR-003 | User-requested contract reset routed by `/code_reviewer` after completed downstream review | `CRR-001` / user requirement change | `Requirement Change / Design Reset` | Requirements, investigation notes, supplement, and design spec reset to absolute-only provided cwd and exact concise field descriptions; architecture and implementation review must rerun. |
| SR-004 | `/architecture_reviewer` design review report, Round 3 | `ARCH-DI-002` | `Design Impact Rework` | Added the long-lived `tool_schema_and_configuration.md` terminal cross-reference to the authoritative design inventory and documentation update sequence; package is ready for architecture re-review. |
| SR-005 | `/architecture_reviewer` design review report, Round 4 | `ARCH-DI-002` reused | `Design Impact Rework / Durable Documentation Correction` | Corrected the terminal documentation surfaces and made the final inventory/sequence explicit with external-access and omitted-default wording; package is ready for architecture re-review. |

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

### SR-003 — Absolute-only provided cwd contract reset

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/code-review-report.md`; post-delivery review feedback after the previously completed architecture, implementation, API/E2E, and delivery stages.
- Triggering finding IDs: `CRR-001` is the reviewed baseline; the user-requested requirement change supersedes the prior relative-cwd approval. No separate code-review finding ID was assigned for the user change.
- Prior authoritative result: `Pass` for the previously approved contract, including workspace-relative cwd; delivery was awaiting explicit user verification.
- Current authoritative result: Requirements and design reset are ready for architecture re-review; the prior implementation is no longer implementation-ready for the new absolute-only contract.
- Why this revision is recorded: The user changed the accepted input contract after downstream review: `cwd` remains optional, but any provided value must be absolute. The user also requested exact concise cwd field descriptions and explicitly did not request an `edit_file` redesign.
- Resolution: Keep omitted cwd behavior unchanged. In `resolveExecutionCwd`, reject every provided relative value before workspace joining, physical resolution, or process creation with an actionable absolute-path working-directory validation error. Preserve external absolute normalization, directory/access preflight, host-before-WSL ordering, process lifecycle behavior, and sandbox deferral. Set `run_bash.cwd` to `Optional working directory for the command.` and `start_background_process.cwd` to `Optional working directory for the process.`; replace relative-success/containment tests with relative-rejection/no-spawn coverage.
- Approved behavior or requirement IDs affected: `BEH-003`, `BEH-006`; `REQ-003`, `REQ-007`; `AC-003`, `AC-004`, `AC-006`, `AC-007`, `AC-008`. The external absolute and omitted-default behavior remains approved; `ARCH-DI-001` pre-spawn accessibility handling remains in force.
- Canonical artifacts and sections updated: `requirements.md` behavior, scope, requirements, acceptance criteria, and approval status; `investigation-notes.md` status, source log, behavior map, ownership findings, constraints, reviewer notes, and user clarification; `design-spec.md` current/target contract, resolver sequence, behavior map, ownership/removal plan, examples, change sequence, and guidance.
- Supplemental artifacts updated, added, or removed: `terminal-cwd-policy.md` operation matrix and invariants now reject all provided relative cwd values and preserve omitted workspace defaulting.
- Downstream and architecture-review impact: The existing implementation, code review, API/E2E evidence, and delivery evidence cannot be treated as approval for the reset contract. Architecture review must rerun first; implementation must then update resolver/error mapping, schemas/docs, and tests before code review, API/E2E, and delivery rerun.
- Next recipient or routing: `/architecture_reviewer` for upstream requirement/design reset review.
- Remaining gaps or risks: The exact relative-input error wording must be aligned with the repository’s working-directory validation family during implementation review. Windows/WSL and package/runtime evidence must be rerun for the reset. No file-tool or `edit_file` behavior is in scope.

### SR-004 — Durable tool-schema documentation cross-reference

- Triggering role, report path, and round: `/architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/design-review-report.md`; Round 3.
- Triggering finding IDs: `ARCH-DI-002`.
- Prior authoritative result: `Fail` for implementation rerun; the absolute-only provided-cwd reset was coherent, but the durable tool-schema documentation cross-reference was omitted from the design inventory and update sequence.
- Current authoritative result: Corrected Design-ready solution package prepared for architecture re-review; implementation remains blocked pending approval.
- Why this revision is recorded: `autobyteus-ts/docs/tool_schema_and_configuration.md` is a long-lived contract cross-reference and still states that relative terminal cwd remains workspace-rooted. Leaving it unnamed would permit a contradictory contract after implementation.
- Resolution: Add the file and its terminal cwd cross-reference to the requirements, investigation evidence, design behavior map, off-spine responsibility inventory, draft/final/target file mappings, supplemental policy invariant, and change sequence. Require the implementation to update only that terminal statement to absolute-only provided values plus unchanged omitted defaults, preserve the generic file-tool `path`/`base_dir`/`edit_file` contract, and include a docs consistency check against `docs/terminal_tools.md` and serialized schemas in rerun evidence.
- Approved behavior or requirement IDs affected: `BEH-006`; `REQ-009`; `AC-009`. The absolute-only cwd contract, resolver preflight, host/WSL ordering, lifecycle behavior, and sandbox/file-tool boundaries remain unchanged.
- Canonical artifacts and sections updated: `requirements.md` BEH-006, REQ-009, and AC-009; `investigation-notes.md` source log, relevant files, constraints, risks, and architecture notes; `design-spec.md` behavior map, off-spine concerns, subsystem allocation, file responsibility inventories, change sequence, and implementation guidance; `terminal-cwd-policy.md` documentation invariant.
- Supplemental artifacts updated, added, or removed: `terminal-cwd-policy.md` updated in place; no new supplement.
- Downstream and architecture-review impact: The prior implementation/code/API-E2E/delivery evidence remains superseded. After architecture approval, implementation must update both documentation surfaces as specified, execute the docs consistency check, and then rerun implementation review before API/E2E and delivery.
- Next recipient or routing: `/architecture_reviewer` for upstream correction review.
- Remaining gaps or risks: The implementation must prove that only the terminal cross-reference changed in `tool_schema_and_configuration.md`; generic file-tool behavior must remain unchanged. No source implementation was changed in this solution-design correction.

### SR-005 — Corrected durable terminal documentation

- Triggering role, report path, and round: `/architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/design-review-report.md`; Round 4.
- Triggering finding IDs: `ARCH-DI-002` reused.
- Prior authoritative result: `Fail` for implementation rerun; the reviewer still observed the superseded relative-cwd statement in the durable tool-schema documentation surface and treated the final inventory/sequence as insufficiently explicit.
- Current authoritative result: Corrected documentation and strengthened Design-ready package prepared for architecture re-review; implementation remains blocked pending approval.
- Why this revision is recorded: The durable documentation itself needed to stop instructing callers that relative terminal cwd remains workspace-rooted, while generic file-tool semantics remain unchanged.
- Resolution: Correct only the terminal cwd cross-reference in `autobyteus-ts/docs/tool_schema_and_configuration.md` to state that provided cwd must be absolute, existing accessible external directories are supported, and omitted cwd retains the workspace/temp default. Align `autobyteus-ts/docs/terminal_tools.md` with the same contract and update its examples. Strengthen the final file-responsibility mapping and change sequence with full paths and the external-access/omitted-default outcome. Require post-reset implementation/delivery evidence to run a docs consistency check against both docs and serialized schemas.
- Approved behavior or requirement IDs affected: `BEH-006`; `REQ-009`; `AC-009`. The generic file-tool `path`/`base_dir`/`edit_file` contract, absolute-only resolver contract, pre-spawn validation, host/WSL ordering, lifecycle behavior, and sandbox boundary remain unchanged.
- Canonical artifacts and sections updated: `design-spec.md` final mapping, docs sequence, behavior/file responsibility wording, and implementation guidance; `investigation-notes.md` source log; `solution-revision-record.md`; durable source docs `autobyteus-ts/docs/terminal_tools.md` and `autobyteus-ts/docs/tool_schema_and_configuration.md`.
- Supplemental artifacts updated, added, or removed: No new supplement; `terminal-cwd-policy.md` remains the governing policy and already contains the docs-consistency invariant.
- Downstream and architecture-review impact: Runtime resolver, schemas, tests, code review, API/E2E, and delivery evidence remain historical/superseded. After architecture approval, implementation must complete the remaining source behavior/schema/test changes and prove documentation consistency before downstream reruns.
- Next recipient or routing: `/architecture_reviewer` for upstream correction review.
- Remaining gaps or risks: The docs-only correction is now present, but the runtime resolver and serialized schemas still require the absolute-only implementation after architecture approval. The consistency check must verify that the generic file-tool contract did not change.
