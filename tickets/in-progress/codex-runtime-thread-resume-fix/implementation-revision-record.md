# Implementation Revision Record

The current code and `implementation-handoff.md` are authoritative. This record locates the initial implementation baseline and subsequent implementation rework.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| `IR-001` | `architecture_reviewer`; `design-review-report.md`; `ARCH-REV-002` | N/A | Initial Baseline | `SR-001`, `SR-002`, `SR-003`; `ARCH-REV-001`, `ARCH-REV-002`; `CRR-*` N/A; `API-REV-*` N/A; `DR-*` N/A | Reviewed Codex/Claude continuity design implemented and locally build-validated; ready for source review |
| `IR-002` | `code_reviewer` / `code-review-report.md` / `CRR-001`, then `architecture_reviewer` / `design-review-report.md` / `ARCH-REV-003` | `CODE-FIND-001`, `BEH-009`, `BEH-010` | Local Fix + Approved Scope Rework | `SR-001` through `SR-004`; `ARCH-REV-001` through `ARCH-REV-003`; `CRR-001`; `API-REV-*` N/A; `DR-*` N/A | External-only team binding corrected and approved native configured-member restart/workspace path implemented; ready for source re-review |

## Revision Entries

### IR-001 — Durability-gated Codex and Claude restart continuity

- Triggering role, report path, and round: `architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/design-review-report.md`; architecture review round 2 / `ARCH-REV-002`
- Triggering finding IDs: N/A — initial implementation baseline. The upstream `ARCH-FIND-001` and `ARCH-FIND-002` design findings were already resolved by `SR-003` / `ARCH-REV-002`.
- Classification: Initial Baseline
- Prior authoritative result: N/A
- Current authoritative result: The reviewed root-owned binding, private-candidate publication, team and standalone single-flight, strict Codex/Claude restore, Claude UUID lifecycle, and fail-closed retry/quarantine design is implemented in `autobyteus-server-ts`.
- Related solution revision IDs: `SR-001`, `SR-002`, `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-002`
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: Establish the complete first implementation result against the cumulative reviewed Codex + Claude continuity package before source review.
- Approved behavior or requirement IDs affected: `BEH-001` through `BEH-008`; `REQ-001` through `REQ-011`; `AC-001` through `AC-015`
- Implementation delta: Added private AgentRun candidates and claims, one standalone durability/admission owner, strict metadata reads/reconciliation, root binding adoption and lock-head tree mutations, staged direct-task bindings, joined mixed-member readiness, a strict read-only activity guard, exact Codex resume, and an immutable Claude provider-session state machine. Removed eager manager publication, duplicate activation maps, late identity capture, Codex resume fallback, Claude placeholder/rebinding/cache migration, and the obsolete TeamRun refresh facade.
- Changed files or areas: `autobyteus-server-ts/src/agent-execution/**`, `src/agent-memory/services/agent-conversation-activity-inspector.ts`, `src/agent-team-execution/**`, `src/run-history/{services,store}/agent-run-metadata-*`, and `src/runtime-management/claude/client/**`.
- Local validation and result: `pnpm exec tsc -p tsconfig.build.json --noEmit` passed; `pnpm run build` passed including shared builds, Prisma generation, server compilation, managed asset copy, and sanitized built-in-agent bootstrap smoke; focused built-module assertions for candidate exclusivity/publication/abort-retry, binding adoption/idempotency/conflict, Claude create/resume/confirmation, and read-only activity classification passed; `git diff --check` passed. Existing focused durable unit suites remain stale against intentionally removed contracts (combined run: 19 passed, 41 failed) and require downstream coverage maintenance. Repository `pnpm typecheck` remains blocked by the pre-existing `rootDir: src` plus `include: [src, tests]` TS6059 configuration conflict.
- Next recipient or routing: `code_reviewer`
- Remaining limitations or risks: Historical null/local-placeholder provider bindings are intentionally non-recoverable; a durably reserved but not yet provider-materialized Claude UUID fails closed if exact resume is unavailable; API/E2E coverage investigation and durable test maintenance remain downstream-owned.

### IR-002 — Native configured-member restart continuity and binding neutrality

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/code-review-report.md`; implementation review round 1 / `CRR-001`; followed by approved solution rework `SR-004` and `architecture_reviewer` pass `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/design-review-report.md`, architecture round 3 / `ARCH-REV-003`
- Triggering finding IDs: `CODE-FIND-001`; new approved behaviors `BEH-009`, `BEH-010`
- Classification: Local Fix + Approved Scope Rework
- Prior authoritative result: Code review failed the halted `ddfb494e7` implementation because native backend self-IDs entered external binding adoption and strict restore. The expanded native reproduction then established a separate base defect: restored roots discarded create/restore provenance and valid persisted workspaces were not activated before native materialization.
- Current authoritative result: The cumulative `SR-001` through `SR-004` implementation is complete and locally validated for source re-review. Native configured members restore same-run local state from canonical activity, fresh native configured/task execution remains binding-null, and external Codex/Claude durability semantics remain intact.
- Related solution revision IDs: `SR-001`, `SR-002`, `SR-003`, `SR-004`
- Related architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-002`, `ARCH-REV-003`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: Resolve `CODE-FIND-001` against the superseding native behavior/design package rather than applying only a truthy-ID guard that would leave native restart and workspace continuity broken.
- Approved behavior or requirement IDs affected: `BEH-003`, `BEH-005`, `BEH-009`, `BEH-010`; `REQ-003`, `REQ-004`, `REQ-009`, `REQ-012` through `REQ-015`; `AC-005`, `AC-016` through `AC-019`
- Implementation delta: Root create/restore now selects explicit mixed factory entrypoints and stores required `fresh | restore` configured-member mode in process-local mixed contexts. Configured nested teams inherit mode; task agents/teams force fresh mode through distinct APIs. The handle activates non-null workspace roots through WorkspaceManager, resolves an exhaustive new/native/external plan, calls generic candidate restore for native activity, and converts/stages/adopts bindings only for external runtimes. Native self-ID fields are ignored in mixed runtime context, native restore has no fresh fallback, two normalized team activation errors were added, and the unused generic TeamRun backend-factory interface was removed.
- Changed files or areas: `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts`; `src/agent-team-execution/backends/mixed/**`; `src/agent-team-execution/errors.ts`; focused unit/integration files under `tests/{unit,integration}/agent-team-execution/**`; cumulative `SR-004` and review/evidence artifacts.
- Local validation and result: Production TypeScript check passed; full server build and sanitized bootstrap smoke passed; seven focused unit/narrow integration files passed 29/29, including strict external restore preservation and the real native backend same-run restore; `git diff --check` passed; changed source effective-line scan passed with the largest changed handle at 469. Repository-wide test typing remains blocked by the pre-existing `tsconfig.json` `rootDir: src` plus included `tests` TS6059 issue. Broader durable coverage remains downstream-owned.
- Next recipient or routing: `code_reviewer`
- Remaining limitations or risks: Already-overwritten native snapshots and absent external IDs remain unrecoverable; corrupt/unreadable native state fails closed; legacy native self-ID fields are ignored but not rewritten; open delegated-task hydration across restart remains out of scope; API/E2E coverage investigation and realistic isolated Codex/Claude/native browser execution must wait for source re-review.
