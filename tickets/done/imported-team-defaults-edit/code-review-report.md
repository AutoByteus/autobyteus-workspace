# Code Review Report — imported-team-defaults-edit

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (REQ-001..REQ-003, AC-001..AC-007)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md`
- Supplemental Task Artifacts: N/A — not applicable
- Design Review Report / Architecture Review Revision Record: present in the package (`design-review-report.md`, `architecture-review-revision-record.md`). The selected route is direct (Small/Low), so no source review was selected.
- Implementation Handoff / Revision Record: `implementation-handoff.md`, `implementation-revision-record.md` (IR-001, `b5caa04c45`)
- Code Review Revision Record: `code-review-revision-record.md` (created now)
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `N/A` (failure-origin round)
- Trigger: API/E2E failure API-F-001 (API-001) from `/software_engineering_team/api_e2e_engineer`
- Prior Review Round Reviewed: N/A (no source review on the direct route)
- Coverage Investigation / Execution Coverage Report / API/E2E Revision Record: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md` (API-001; commit `60366696ec`, tests and artifacts only)
- Failing Scenario IDs: RPE-008 (AC-001, REQ-001); real-UI evidence on the isolated instance `iso-60463-5627`
- Exact Failing Command: `env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" USER="$USER" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-team-definitions/registered-package-definition-edit.e2e.test.ts --no-watch`
- Failure Evidence Paths: `api-e2e-evidence/server-e2e-run3.log`, `api-e2e-evidence/ui-package-copy-diff.patch`

## Routing Classification Review

- Task size `Small`, architectural risk `Low`. The selected route is the direct one.
- Independent source review required by the classification: `Failure-origin exception`
- Classification evidence or correction required: None. The fix is a bounded option on an existing writer, and nothing indicates a wrong classification.

## Review Scope

- Changed behavior examined: REQ-001 / AC-001. Saving a Team (and, through the same writer, an Org) that lives in a registered package, usually the user's git checkout.
- Files examined:
  - `autobyteus-server-ts/src/collaboration-definition-admission/providers/definition-package-transaction.ts` (`write`, line 90);
  - its users `file-agent-team-definition-provider.ts` and `file-agent-org-definition-provider.ts`;
  - the IR-001 file list (`b5caa04c45`);
  - RPE-008;
  - the UI diff evidence.
- Exclusions: a general test-suite review (not needed); BASE-001 (`agent-team-definitions-graphql.e2e.test.ts`, stale since `37d05c7f71`, a pre-existing Rule 9 follow-up outside this ticket).

## Upstream Behavior And Production-Path Basis Confirmation

- Behavior-basis status: `Confirmed`
- AC-001 expects the save to update `team-config.json` / `team.md` in the package, using the existing atomic package save (REQ-001). Nothing in the requirements allows rewriting other files in the user's package.

| Behavior ID | Status | Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| BEH-001 (registered-package Team/Org save) | Contradicted (fidelity) | Edit page Save → GraphQL update → `FileAgentTeamDefinitionProvider` → `DefinitionPackageTransaction.write`: `fs.cp(canonicalPath, stagePath, { recursive: true, errorOnExist: true })` stages the **whole Team folder**, writes the changed files, then renames the stage over the folder | `fs.cp` without `verbatimSymlinks: true` resolves relative symlinks to absolute paths, so every relative link in the folder is rewritten |

## Supported Product Scenario And Reachability Gate

| Scenario ID | Kind | Actor | Goal | Entry | Shape | Forward Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-RPE | User | User | Save the SE Team's default in an imported package (AC-001, AC-007) | Team edit page → Save | Normal | Path above | Only the edited definition files change | requirements AC-001/AC-007; the real `autobyteus-agents` SE Team contains relative links (`references/design-examples.md -> ../../../../../shared/design-examples.md`) | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate | Observation | Scenario | Trigger | Path / Consequence | Evidence | Disposition | Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | The staging copy rewrites relative symlinks to absolute paths on this machine | SCN-RPE | User Save on a registered package | The save leaves extra modified links in the user's checkout pointing to `/Users/...`, `/private/...` or a temp path. Once committed and pushed, they break for every other install | Reviewer reproduction: RPE-008 fails with `Expected "../../../../../shared/design-examples.md"`, `Received "/private/var/folders/…/rpe-package-…/agent-teams/software-engineering-team/shared/design-examples.md"`. UI: 8 extra modified links (`ui-package-copy-diff.patch`). With `verbatimSymlinks: true` the file passes 8/8 (API/E2E probe, reverted) | Promote | IMPL-F-001 (Local Fix) |
| C-002 | The folder-swap save leaves processes whose cwd is inside the folder in a deleted directory (API/E2E O-3) | — | A process with its cwd inside a Team folder during a save | Pre-existing writer behavior; no supported scenario shows a consequence for this ticket | O-3 | Reject (for this ticket) | Follow-up candidate |

## Failure Classification

- **Origin: Implementation defect**, a pre-existing latent defect in the reused writer that IR-001 made reachable. `DefinitionPackageTransaction.write` stages with `fs.cp` and default options, which resolve symlinks.
  - Before IR-001, only app-data definition folders reached this writer: app-owned and normally free of user links.
  - IR-001 (REQ-001) routes Team and Org saves of registered packages (the user's checkouts) through it.
  - The real SE Team package has such links, so AC-001 itself triggers the defect.
- **Not a test, fixture or environment problem.** RPE-008 enters through the real Save path on a package shaped like the real one, and its assertion (the link stays verbatim) protects AC-001 and the user's package integrity.
- **Not Design Impact.** REQ-001's "reuse the existing atomic package save" remains the right owner and mechanism. The defect is one copy option, a bounded local fix inside that owner.
- **Review gap:** none attributable. This is a direct route with no source review. A source review would only have caught it by noticing the `fs.cp` default for symlinks in an unchanged file, which was reasonably missable. API/E2E caught it with a realistic package fixture.

## Findings

### IMPL-F-001 — A save rewrites relative symlinks in the package folder (High for the release, Local Fix)

- Evidence: `definition-package-transaction.ts:90`, `await fs.cp(canonicalPath, stagePath, { recursive: true, errorOnExist: true })`. RPE-008 fails as reproduced above, and the UI diff shows 8 rewritten links.
- Required action:
  1. Add `verbatimSymlinks: true` to that `fs.cp` call.
  2. Add a unit test at the writer level beside the existing `registered-package-definition-writes.test.ts`: a relative symlink in the folder survives a save byte-for-byte (`readlink` is unchanged).
  3. Confirm that `git status` after a UI re-save shows only the intended files.
- The same writer serves Org saves (`file-agent-org-definition-provider.ts`), so the one change covers both.
- Re-validation (API/E2E): RPE-008 green, the full RPE file green, and the UI re-save diff on the kept instance `iso-60463-5627` with the package copy `/private/tmp/ited-pkg`.

## Classification

- `Local Fix` → `/software_engineering_team/implementation_engineer`. After the fix, API/E2E re-runs. On the direct route, source review is again not required unless the fix grows beyond this bounded change.

## Residual Risks

- O-3: processes whose cwd is inside a swapped folder end up in a deleted directory (pre-existing; follow-up candidate).
- BASE-001: `agent-team-definitions-graphql.e2e.test.ts` is stale since `37d05c7f71` (pre-existing; follow-up for the Task manager).
- Other whole-folder side effects of the copy-and-swap save on user checkouts (timestamps, file modes) are not established as a problem: git ignores mtimes, and `fs.cp` keeps modes. Nothing more is required now.

## Latest Authoritative Result

- Review Decision: Failure origin confirmed. Classification `Local Fix`.
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Pass` (SCN-RPE is a supported normal scenario)
- Material-Premise Gate: `Pass`
- Failure Origin: Implementation defect (a latent writer option made reachable by IR-001)
- Recommended Recipient: `/software_engineering_team/implementation_engineer`
- Notes: a one-option fix plus a writer unit test; API/E2E then re-validates RPE-008 and the UI `git status`.
