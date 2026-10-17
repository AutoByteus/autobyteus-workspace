# Delivery / Release / Deployment Report — active-run-skill-update-notice

Current for delivery round **DR-002**. The DR-001 blocker (seen-versions write race) is resolved by IR-004 and closed. DR-001 details are in `delivery-revision-record.md` and in the history of this file.

## Release / Publication / Deployment Scope

- Repository finalization of `codex/active-run-skill-update-notice` into `origin/personal` after explicit user verification (`RELEASE.md`).
- **Release: beta `v1.5.5-beta.2`.** The user said on 2026-10-17: "we could release a beta for this". It will be cut with `bash scripts/desktop-release.sh beta --branch finalize/active-run-skill-update-notice --no-push`, after verification and repository finalization.
- `task_size=Large`, `architectural_risk=High`. Route: reviewed.

## Handoff Summary

- Handoff summary artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/handoff-summary.md`
- Handoff summary status: `Updated` (DR-002)
- Delivery revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/delivery-revision-record.md`
- Current delivery revision ID: `DR-002`

## Initial Delivery Integration Refresh (DR-002)

- Previous integration: `a609de982` (DR-001).
- Latest tracked remote base checked: `origin/personal` @ `c2e366806ae20622084d06917f7132967c5fb8a2` (2026-10-17; v1.5.5-beta.1).
- Base advanced: `Yes` (300 commits). Integrated: `Yes`.
- Local checkpoint commit: `Completed` (`de6b28d3fe`).
- Integration method: `Merge` (`0be06dea6b`). No textual conflicts.
  - Files changed on both sides merged cleanly: `agent-run-manager.ts`, `general-process-run-supervisor.ts`, `build-studio-server.ts`, `llm-phase.ts`, `agent-run-manager.test.ts`, and four docs.
  - The semantic check found the base's private runtime skill profiles symlink to the real skill folders, so the notices stay correct.
- Dependencies: `pnpm install --frozen-lockfile` was run for the new base.
- Post-integration checks rerun: `Yes`. Result: `Passed`, except one web test that is a new base failure, not caused by this ticket (see Verification Checks).
- Delivery edits only after the integrated state was current: `Yes` (`480d9f4aa4` doc note).

## User Verification

- Initial explicit user verification received: `No`. Pending. The release decision (beta) was given in advance.

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md` (DR-002 delta).
- Docs sync result: `Updated`.
  - IR-004's module-doc update was verified against the code.
  - The accepted limitation was added (`480d9f4aa4`).
  - `TESTING.md` is unchanged, by policy.

## Ticket State Transition / Repository Finalization / Release / Cleanup

- Pending user verification. Nothing is pushed or merged.

## Release Notes Summary

- Release notes artifact: `release-notes.md`, prepared before verification. A beta uses GitHub-generated notes (`RELEASE.md`). The curated ticket notes stay available for the next stable release.
- Release notes status: `Updated`

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected` for existing data. `seen_skill_versions.json` is additive and is never written into a missing or deleted folder (IR-004).
- Delivery action required: `None`.

## Verification Checks (merged code `0be06dea6b`; logs in `delivery-evidence/dr-002/`)

| Check | Command | Result | Log |
| --- | --- | --- | --- |
| Install | `pnpm install --frozen-lockfile` | Pass | `install.log` |
| Core build and unit | `pnpm -C autobyteus-ts build`; `pnpm -C autobyteus-ts exec vitest run tests/unit` | Pass; 300 files / 2031 tests | `ts-build.log`, `ts-unit.log` |
| Prisma and typecheck | `pnpm -C autobyteus-server-ts prebuild`; `typecheck` | Pass | `server-prebuild.log`, `server-typecheck.log` |
| Server unit | `pnpm -C autobyteus-server-ts test:unit` | 708 files / 5716 tests pass | `server-unit.log` |
| Skill notices, ×5 | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/skill-update-notices tests/unit/skill-update-notices --no-watch` | 37/37 in every one of 5 runs | `skill-notices-run-{1..5}.log` |
| Scripted AGY E2E | `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-skill-update-notice-roots.e2e.test.ts tests/e2e/runtime/agy-skill-update-notice-transport.e2e.test.ts --no-watch` | 5/5 | `agy-skill-notice-e2e.log` |
| Web unit | `pnpm -C autobyteus-web test:nuxt --run` | 627 files / 4422 tests pass; 1 failure (below) | `web-nuxt.log` |
| Failing web spec alone ×5 | `vitest run components/layout/__tests__/RightSideTabs.workspaceTarget.spec.ts` | Fails 5/5 (deterministic) | `web-rightsidetabs-rerun-1.log` |
| Same spec with this ticket's 4 web files swapped back to `origin/personal`'s versions | same | Still fails, so it is a base failure (it passed in DR-001 on `a609de982`) | `web-rightsidetabs-on-base.log` |
| Hygiene and licensing | `python3 scripts/check_repository_artifact_hygiene.py`; `python3 scripts/check_licensing.py` | Pass | `hygiene.log`, `licensing.log` |

### New base failure (TESTING.md rule 9)

- Test: `autobyteus-web/components/layout/__tests__/RightSideTabs.workspaceTarget.spec.ts` > `retains A while canonical B metadata fails; prior consumers mounted: true`.
- Failure: `expected undefined to be 'dirty-C-not-saved'` at line 152 (`FileExplorerTabs.vm.fileContent` after an editor edit).
- It was introduced within `a609de982..c2e366806`. The spec file itself is unchanged since 2026-10-07.
- Candidates:
  - `a3f65bfe6e` "preserve unsaved drafts during peer refresh";
  - `50f25f68d9` "preserve File Explorer edits made while a Save is pending";
  - `1262714f64` right-panel width.

  A web-folder-only bisect was not reliable, because the generated `.nuxt` files and the dependencies come from the current tree.
- Owner: the author of those File Explorer and right-panel changes. It is reported to the user in the verification request and not fixed in this ticket (outside its scope).

## Final Status

- Explicit user testing/verification complete: `No`
- Repository finalization complete: `No`
- Applicable release (beta) complete: `No`
- Applicable safe cleanup complete: `No`
- Unresolved blocker: `None`. Waiting for user verification.
- Successful terminal package eligible for return: `No`
- Terminal package sent to `/solution_designer`: `No`
