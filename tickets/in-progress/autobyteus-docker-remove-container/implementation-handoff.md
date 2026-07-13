# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/tickets/in-progress/autobyteus-docker-remove-container/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/tickets/in-progress/autobyteus-docker-remove-container/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/tickets/in-progress/autobyteus-docker-remove-container/design-spec.md`
- Supplemental solution artifacts: None
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/tickets/in-progress/autobyteus-docker-remove-container/design-review-report.md`

## What Changed

Implemented the reviewed targeted managed-node destroy lifecycle for Bash and PowerShell:

- Added `destroy --name <node>` while preserving explicit `destroy --all`.
- Added pure destroy selector preflight before state-directory creation, Docker reachability checks, image resolution, and mutation.
- Added strict targeted selector normalization that refuses empty/malformed explicit input instead of falling through to the default node.
- Added complete exact launcher-plus-node candidate enumeration and exact-label re-verification.
- Added fail-closed handling for duplicate candidates, malformed/mismatched state, state/label disagreement, unmanaged same-name collisions, unknown targets, and ambiguous targets.
- Added state-only stale-record cleanup and label-only single-candidate cleanup.
- Added checked state deletion and post-delete verification. State failure after Docker removal reports nonzero partial cleanup, makes no rollback claim, and stops before image cleanup.
- Preserved named volumes and host workspaces; targeted image cleanup remains limited to the captured image after successful state cleanup.
- Updated Bash/PowerShell help and the three public Docker README locations with targeted destroy, slot reuse, volume retention, and separate Buildx cleanup guidance.
- Updated the existing parser contract assertion for the new unqualified-destroy error.

## Key Files Or Areas

- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/scripts/public/docker/autobyteus-docker.d/bash/commands.sh`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/scripts/public/docker/autobyteus-docker.d/bash/core.sh`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/scripts/public/docker/autobyteus-docker.d/powershell/Commands.ps1`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/scripts/public/docker/autobyteus-docker.d/powershell/DockerRuntime.ps1`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/scripts/public/docker/autobyteus-docker.d/powershell/Core.ps1`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/scripts/tests/test_public_docker_launcher_shared_workspace.py`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/README.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/autobyteus-server-ts/README.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/autobyteus-server-ts/docker/README.md`

## Important Assumptions

- The targeted selector is a normalized launcher node identity, not an arbitrary Docker container name.
- Existing `container_for_node` / `Get-ContainerForNode` first-match helpers remain only for non-destructive presence checks; targeted destroy uses the complete candidate-set resolver.
- The approved state transition is discard/rebuild for the selected launcher metadata; no migration was added.
- Existing lowest-free-index allocation is unchanged and reuses a freed indexed node after state cleanup.
- Buildx remains outside launcher ownership and is cleaned with `docker buildx rm multi-platform-builder`.

## Known Risks

- PowerShell parsing and execution could not be run locally because `pwsh` is not installed; the PowerShell implementation is included for downstream parser and executable parity validation.
- The full existing Python launcher suite retains the pre-existing environment/test debt: the installer quote expectation failure, the Python-runtime `zip(..., strict=True)` error, and an environment-dependent preferred-port collision failure observed in this checkout. The targeted implementation checks below pass.
- Bash and PowerShell runtime logic remains parallel by design; API/E2E coverage should exercise ownership disagreement, duplicate labels, malformed state, state-delete failure, and parity scenarios on both platforms/equivalent source contracts.
- State deletion after Docker removal intentionally has no rollback; operators must recover the retained state record manually if checked deletion fails.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature / lifecycle behavior change.
- Reviewed root-cause classification: Boundary Or Ownership Issue plus Missing Invariant.
- Reviewed refactor decision (`No Refactor Needed`): Focused extensions remain in the existing command/runtime owners.
- Implementation matched the reviewed assessment (`Yes`).
- If challenged, routed as `Design Impact` (`N/A`): the reviewed ownership and no-broad-refactor decision held during implementation.
- Evidence / notes: The parser remains a thin public grammar boundary; targeted ownership proof, deletion ordering, state cleanup, and image policy remain in each platform's runtime owner. Buildx was not added to launcher dispatch.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`; unqualified destroy is now explicitly rejected rather than defaulting to a node.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`; targeted destructive resolution does not use the old first-match helper, which remains only where presence is needed.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`; all public launcher source modules remain at or below 500 effective non-empty lines.
- Notes: The implementation avoids a generic arbitrary-container removal path and keeps the platform-local lifecycle boundaries explicit.

## Persisted Data Transition Check (When Applicable)

- Approved decision (`Discard or Rebuild`): Selected launcher state is intentionally removed; volumes and host workspaces are not affected.
- Design-spec decision reference: `design-spec.md`, “Persisted Data / State Transition Decision” and “Checked cleanup contract”.
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`.
- Direct-use evidence or discard/rebuild result, when applicable: Targeted destroy deletes only the selected `.env`/`.json` state after a proven target operation or stale-state resolution, then verifies the path is absent. Future `new-container` reuses the existing allocator.
- Migration implementation and focused checks, only when `Migration Required`: Not applicable.
- Deviation from the reviewed transition decision: `None`.

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container`
- Branch: `codex/autobyteus-docker-remove-container`
- Base: `origin/personal`
- `pwsh` is unavailable locally.
- `shellcheck` is installed, but its module-by-module run reports pre-existing sourced-module warnings/errors (missing shebang context and existing SC2016/SC2034/SC2295 findings); Bash syntax checks pass.

## Local Implementation Checks Run

Implementation-scoped checks only:

- `bash -n scripts/public/docker/autobyteus-docker.sh scripts/public/docker/autobyteus-docker.d/bash/core.sh scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh scripts/public/docker/autobyteus-docker.d/bash/commands.sh` — passed.
- Focused existing launcher checks for targeted parser behavior, managed creation/volume safety, and source size guard — 3 passed.
- Isolated fake-Docker manual probes — targeted single-node removal, stale state-only cleanup, lowest-free-index reuse, `destroy --all` preservation, malformed-state refusal, invalid selector preflight with no state directory/Docker call, and injected state-delete partial cleanup — passed.
- `git diff --check` — passed.
- Full `python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace` — 17 passed, 2 skipped, 2 pre-existing failures, and 1 pre-existing error; no new task-specific failure was observed after updating the changed unqualified-destroy assertion.
- PowerShell parser/execution — not run because `pwsh` is unavailable; downstream coverage remains required.

## Downstream Coverage Hints / Suggested Scenarios

The API/E2E engineer should add or execute isolated Bash and PowerShell-equivalent scenarios for:

1. Two labeled/stateful nodes: targeted destroy removes only the selected container/state and keeps volumes/workspaces.
2. State-only stale node: cleanup succeeds and status no longer reports `missing`.
3. Label-only unique candidate with no state: cleanup succeeds.
4. Unknown/Buildx/unmanaged target and unmanaged same-name collision: nonzero, no `docker rm`, no state deletion.
5. Duplicate exact launcher+node candidates: deterministic refusal with no mutation.
6. State/label disagreement and malformed/mismatched state: deterministic refusal with no mutation.
7. Injected state-delete failure after Docker removal: nonzero partial cleanup, state remains, no rollback claim, no image cleanup.
8. Invalid selectors (`destroy`, conflicting selectors, missing values, extra arguments, malformed explicit names): fail before state directory or Docker reachability setup.
9. Existing `destroy --all`, volume safety, Bash/PowerShell help parity, and lowest-free-index reuse.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. Source implementation and local checks are complete. API/E2E environment discovery, durable coverage updates, repository executable coverage, PowerShell parity validation when available, percentage confidence scoring, and final API/E2E classification remain owned by `api_e2e_engineer`.
