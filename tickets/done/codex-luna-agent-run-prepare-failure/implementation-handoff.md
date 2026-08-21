# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-luna-agent-run-prepare-failure/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-luna-agent-run-prepare-failure/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-luna-agent-run-prepare-failure/design-spec.md`
- Supplemental task artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-luna-agent-run-prepare-failure/evidence/full-stack-reproduction/experiment-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-luna-agent-run-prepare-failure/evidence/full-stack-reproduction/`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-luna-agent-run-prepare-failure/evidence/reported-ui-error.png`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-luna-agent-run-prepare-failure/solution-revision-record.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-luna-agent-run-prepare-failure/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-luna-agent-run-prepare-failure/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: `ARCH-REV-002` is the authoritative pass; its retained Round 1 findings `DI-001`–`DI-003` were incorporated into `SR-002` before implementation.

## Current Implementation Summary

The implementation replaces duplicated Codex/Claude workspace-skill materializers with one profile-driven shared owner, carries safe unresolved configured identities through the SkillService boundary, reconciles every Codex binding instead of filtering discovered names, and adds path-keyed acquisition/release phases plus call-scoped rollback. Broken symlinks are rechecked and mutated link-only; missing or unavailable sources degrade with structured warnings; live symlinks and non-symlink content remain fatal and untouched. Agent-run preparation now logs the original unexpected error object before cleanup and generic wrapping. Runtime/model and user-safe error contracts are unchanged.

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-luna-agent-run-prepare-failure/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`, `SR-002`
- Related architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A` for the initial baseline; the reviewed design already resolved `DI-001`, `DI-002`, and `DI-003`.
- Implementation commit: `902bd4d2e` (`fix workspace skill reconciliation lifecycle`)

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Repair the observed moved-skill broken link before runtime start, including when Codex discovery reports the name. | `configured-agent-skill-binding.ts` → `skill-service.ts` → `codex-thread-bootstrapper.ts` request planning → `backends/shared/workspace-skill-materializer.ts` broken-link state/recheck/recreate. | Every active safe binding produces one request. `reconcile-discoverable` suppresses only initial-missing creation and still repairs broken paths. |
| BEH-002 | Share path policy, serialize acquire/final-release, and roll back partial batches without damaging other holders. | `WorkspaceSkillMaterializer` registry keyed by resolved materialized path; `acquiring → ready → releasing`; exact-entry guards; occurrence ledger and reverse release. Codex/Claude cleanup owners call the shared release API. | New acquisition waits through a mapped releasing entry and rematerializes. Batch failures release every occurrence acquired by that call, attempt all releases, preserve pre-existing holders, and rethrow the original failure object. |
| BEH-003 | Improve server diagnostics while keeping the generic command/UI failure. | `agent-run-manager.ts` logs run/runtime and passes the original unexpected error as a separate logger argument before cleanup/wrapping. | Existing `AgentCreationError` wrapping/cause and downstream safe projection remain unchanged. |
| BEH-004 | Preserve warning-only missing skills and reconcile stale broken paths for safe unresolved names. | `ConfiguredAgentSkillResolver` returns resolved/unresolved bindings; `WorkspaceSkillMaterializer.reconcileUnavailable` warns/skips missing or same-source unavailable states and guardedly removes only verified broken links. | Unsafe names remain excluded by the resolver. Safe unresolved bindings never manufacture a source or descriptor. |
| BEH-005 | Preserve selected Codex runtime/model behavior. | Existing Codex thread config path is unchanged; only workspace request planning occurs before it. | Focused unit coverage confirms `gpt-5.6-luna` passes through unchanged; no provider fallback or remapping was added. |

## Key Files Or Areas

- `autobyteus-server-ts/src/skills/domain/configured-agent-skill-binding.ts`
- `autobyteus-server-ts/src/skills/services/configured-agent-skill-resolver.ts`
- `autobyteus-server-ts/src/skills/services/skill-service.ts`
- `autobyteus-server-ts/src/agent-execution/backends/shared/workspace-skill-materializer.ts`
- Codex/Claude runtime materializer composition files, bootstrappers, contexts, and cleanup owners under `autobyteus-server-ts/src/agent-execution/backends/{codex,claude}`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
- Consolidated shared matrix/lifecycle tests at `autobyteus-server-ts/tests/unit/agent-execution/backends/shared/workspace-skill-materializer.test.ts`
- Focused binding, runtime profile, bootstrapper, model pass-through, and manager diagnostic unit tests in their existing subsystem suites

## Important Assumptions

- The resolver remains the authority for accepting a configured name as a safe single path segment; the materializer receives only validated bindings.
- Runtime profile singletons are the lifecycle identity boundary for materialized paths within a process.
- A source is valid only when its current `SKILL.md` exists as a file. Absence degrades only in the reviewed safe path states; other I/O errors fail preparation.
- Codex `skills/list` remains advisory request intent. It cannot establish ownership of or bypass reconciliation at the expected workspace path.

## Known Risks

- Filesystem reconciliation remains subject to ordinary TOCTOU limits; the implementation performs the reviewed `lstat`/inode/raw-target/target-absence recheck immediately before link-only unlink and fails closed when identity changes.
- Upstream Codex app-server discovery payload evolution remains a residual protocol risk; discovery failure already maps all bindings to the reviewed safe fallback intents.
- Existing broken projections are repaired only during normal create/restore reconciliation. There is intentionally no background sweep or historical-path map.
- Live/unowned collisions intentionally remain fatal; downstream realistic coverage should verify the server diagnostic and unchanged generic command/UI projection.
- `workspace-skill-materializer.ts` is exactly 500 effective non-empty lines, within the guardrail but with no growth headroom; future expansion should trigger a responsibility split/design review rather than densification.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Bug Fix`
- Reviewed root-cause classification: `Missing Invariant` and `Duplicated Policy Or Coordination`
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: The duplicated runtime path-state/holder algorithms were removed and replaced by one shared authoritative boundary. Binding resolution remains in Skills, Codex-only discovery planning remains in Codex, runtime profiles contain only label/root selection, and preparation diagnostics remain in AgentRunManager.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`
- Notes: Runtime-specific descriptor aliases, classes, materialize/cleanup methods, duplicated state unions, registries, and filesystem helpers were removed cleanly. Runtime files are now profile/singleton composition roots. The new coherent shared owner is 500 effective non-empty lines; the large deletion deltas in the runtime files and the new-file delta were assessed as the reviewed consolidation rather than unplanned growth.

## Persisted Data Transition Check

- Approved decision: `Discard or Rebuild`
- Design-spec decision reference: `design-spec.md`, “Persisted Data / State Transition Decision” and DS-003.
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result: On-demand reconciliation removes only an exactly rechecked broken link and either recreates it from the valid current source or leaves the path absent. Live and non-symlink content is preserved and rejected.
- Migration implementation and focused checks: `N/A`
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure`
- Branch: `codex/codex-luna-agent-run-prepare-failure`
- Recorded base: `a098b205ca990bf86b5e452950a49fc5dc39c8d1`
- `pnpm install --frozen-lockfile`, shared-package preparation, and Prisma client generation were used for local implementation checks; no lockfile or schema change resulted.
- No branch refresh was performed; delivery owns integration against the latest tracked remote base.

## Local Implementation Checks Run

- `pnpm exec tsc -p tsconfig.build.json --noEmit` — passed on the final source state.
- `pnpm build:full` — passed on the final committed source state, including sanitized built-in-agent bootstrap smoke.
- Focused Vitest bundle covering the shared materializer, Codex/Claude profiles and bootstrappers, SkillService bindings, AgentRunManager diagnostics: `7` files / `96` tests passed.
- Final focused rerun after lifecycle/rollback-warning adjustments: `2` files / `42` tests passed.
- `tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` — imported/collected successfully; its two live Codex cases were skipped because `RUN_CODEX_E2E` was not enabled. No live integration/API/E2E result is claimed.
- `git diff --check` — passed before the implementation commit; legacy materializer symbol search returned no superseded runtime class/type/method use.
- `pnpm exec tsc -p tsconfig.json --noEmit` — not a usable repository gate: it fails broadly with the existing `rootDir: src` plus `include: tests` TS6059 configuration. Production `tsconfig.build.json` and executed focused tests passed.

## Frontend Rendered-Result Check

Not Applicable — this is a backend workspace-projection and diagnostic change. The reviewed command/UI message contract is intentionally unchanged.

## Downstream Coverage Hints / Suggested Scenarios

- Recreate the reported `.codex/skills/shell-first-operating-practice` broken old-source link and verify normal first-message activation repairs it to the current shared source, emits the structured warning, and starts `codex_app_server` with `gpt-5.6-luna` unchanged.
- Run the same broken-link state under the Claude profile to verify `.claude/skills` placement through the shared policy.
- Verify discovered-name plus broken expected path repairs rather than bypassing; discovered-name plus initially missing expected path stays absent.
- Verify unresolved-safe missing and broken-link cases remain non-blocking and warn with `skipped` / `removed-and-skipped`.
- Verify live different symlink, file, and directory collisions remain untouched and produce an underlying server diagnostic while the command/UI remains generic.
- Exercise create/restore/terminate cleanup with overlapping holders and a gated final release; verify a new acquire waits and returns only after rematerialization.
- Exercise a multi-binding activation with a later collision/non-absence I/O error; verify no earlier holder/link leaks and the original error identity/cause is retained.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. The API/E2E engineer still owns durable coverage validity decisions, environment setup, realistic product-path execution, and final evidence. This implementation handoff reports only implementation-scoped build, unit, and narrow collection checks.
