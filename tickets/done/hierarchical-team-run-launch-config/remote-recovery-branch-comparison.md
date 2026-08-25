# Remote Recovery Branch Comparison

## Scope

- Current worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config`
- Current ticket branch: `codex/hierarchical-team-run-launch-config`
- Compared remote branch: `origin/codex/hierarchical-team-run-launch-config-recovery-20260824`
- Remote commit after `git fetch --prune origin`: `2b1c3ea26a1170b6ed4246bcc6d9979f6916ce6e`
- Remote commit date/message: `2026-08-24T17:35:40+02:00 — feat: add hierarchical team run launch configuration`
- Comparison mode: read-only. No merge, cherry-pick, checkout, or source copy was performed.

The two branches have different bootstrap bases, so ancestry or a raw branch-to-branch line count would mix feature differences with base movement. The comparison therefore inspected the recovery commit's feature delta relative to its own parent and compared each resulting final path with the current working-tree content.

## Results

- The remote feature commit has 152 final delta entries, representing 154 unique path endpoints when both sides of its two renames are counted.
- Every one of those 154 path endpoints is represented in the current working state; there are zero remote-only paths.
- Of the 152 final entries, 120 current files are byte-identical to the remote result and both remote deletions are also deleted locally.
- Thirty final paths differ: 12 are ticket/review artifacts that have since been replaced by the fresh recovery workflow, and 18 are implementation/test paths.
- The 18 implementation/test differences are accounted for by the independently reconstructed frontend files, the IR-002 fixes for strict runtime inputs/workspace readiness/dependency direction/current terminology, and later focused coverage. The remote commit predates those corrections and says its API/E2E execution was incomplete.
- Relative to the current reconstructed base, the current working state contains 276 additional changed or untracked paths beyond the remote feature delta. These include the new hierarchical GraphQL lifecycle E2E, updated production-upgrade/provider/integration coverage, source-review regression coverage, generated artifacts, and execution evidence.

## Recovered Files Specifically Rechecked

The remote branch now exposes the four source/test blobs that were unavailable during the original disk-recovery audit:

1. `autobyteus-web/components/workspace/config/TeamMemberConfigTree.vue`
2. `autobyteus-web/components/workspace/config/TeamScopeConfigEditor.vue`
3. `autobyteus-web/utils/teamRunLaunchHierarchy.ts`
4. `autobyteus-web/utils/__tests__/teamRunLaunchHierarchy.spec.ts`

The current worktree already contains independently reconstructed counterparts. They are not byte-identical, but the current versions cover the approved recursive scope behavior and include later review corrections and broader validated behavior. Inspection found no approved, product-reachable behavior present only on the remote versions that should be copied into the current implementation.

## Conclusion

The current work is materially ahead of the dated recovery branch. The recovery branch is useful as provenance and as confirmation of the formerly missing files, but it contains no file or implementation behavior that should be merged, cherry-picked, or manually transplanted. The remaining work identified by the current review is limited to two durable API/E2E assertion/fixture corrections recorded in `api-e2e-test-review-report.md`; those corrections are not supplied by the recovery branch.
