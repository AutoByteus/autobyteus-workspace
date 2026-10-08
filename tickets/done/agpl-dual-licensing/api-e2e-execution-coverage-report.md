# API/E2E Execution Coverage Report — agpl-dual-licensing, Slice 1

> Not legal advice. The wording, the §7 permission and the commercial terms still need lawyer review (REQ-011).

## Execution Round Meta

- Package: requirements-doc.md, investigation-notes.md, solution-revision-record.md, design-spec.md, implementation-handoff.md, implementation-revision-record.md, api-e2e-coverage-investigation.md, api-e2e-revision-record.md (all in this folder)
- Design review, architecture review, code review: `N/A — not applicable`
- API/E2E revision: `API-REV-001`, round 1, commit validated `e1ee19dd3` (worktree HEAD `179e2ef80`, licence files clean)
- Routing: Small / Low, direct route, so the next step is Delivery. Test-code review: `Not Required — direct low-risk route`

## Evidence Matrix (temporary checks, 2026-10-08, macOS, pnpm 10.28.2)

| Case | AC / REQ | Check | Result |
| --- | --- | --- | --- |
| C-01 | AC-001 (file), AC-002, REQ-001–003 | Fresh `curl` of gnu.org AGPL text (sha256 `0d96a4ff…abcb0`) and apache.org text (`cfc7749b…3d30`). `cmp` byte-compare against them: 5/5 AGPL (`LICENSE`, `autobyteus-ts`, `autobyteus-web`, `autobyteus-server-ts`, `autobyteus-message-gateway`) and 9/9 Apache. No other tracked `LICENSE*` file exists outside `tickets/` | Pass |
| C-02 | AC-003, REQ-004 | `jq .license` over all 17 tracked `package.json` files: 7 `AGPL-3.0-only`, 9 `Apache-2.0`, matching the mapping. The devkit `templates/basic` is untouched (by design) | Pass |
| C-03 | AC-009 (manual), REQ-010 | The design's `git grep` plus a multiline-aware perl scan (which catches the wrapped "Apache\nLicense"). Hits are only the 9 Apache components (LICENSE + package.json), `LICENSING.md`, `NOTICE`, `README.md` (SDK and ≤ v1.4.97 sentences) and `autobyteus-android/gradlew{,.bat}`, all allowlisted. "Commercial use and modification are allowed" is absent. No AGPL wording in the Apache component dirs | Pass |
| C-04 | AC-006, REQ-002/003 | Real `npm pack --ignore-scripts` tarballs for all 8 publishable packages (autobyteus-ts, 3 contracts, backend/frontend SDK, sdk-contracts, devkit), extracted. Each tarball's `LICENSE` is byte-identical to the official text and its `license` field is correct (ts: AGPL-3.0-only; the 7 others: Apache-2.0) | Pass |
| C-05 | AC-004, AC-011, REQ-005/006/011 | Review of `LICENSING.md` against spec points 1–9 (all present). `NOTICE` matches the spec exactly (`diff`). §7 text matches the spec verbatim (whitespace-normalised compare). README section covers every spec sentence and links `LICENSE`/`LICENSING.md`/`NOTICE`. Holder `Yu Zheng (AutoByteus)` and contact `ryan.zheng.work@gmail.com` are consistent. The not-legal-advice note is present. No CLA mention. The `THIRD_PARTY_NOTICES/` link resolves | Pass |
| C-06 | REQ-012 / AC-010 | `git diff --name-status a0ded874b..e1ee19dd3` shows 26 files, exactly the mapping. A `jq 'del(.license)'` compare shows the 9 manifests differ only in `license`. No lockfile, `.github`, Dockerfile, electron-builder or build config was touched. `git diff --check` is clean. In a `git archive` copy, `pnpm install --frozen-lockfile --lockfile-only --ignore-scripts` exits 0 for the workspace (13 projects) and for the wechaty-sidecar lockfile. No code reads the `license` field or the `LICENSE` files beyond the `files` entries | Pass |

## Validation Confidence Scorecard

| Category | Score | Basis / Residual |
| --- | --- | --- |
| Requirement and AC proof | 95% | Every Slice 1 AC in scope was proven directly. The GitHub detection part of AC-001 is delivery's, after merge |
| Changed-boundary directness | 100% | File bytes, manifest fields and real tarballs were checked directly |
| Integration realism / mock gap | 95% | Real tarballs, no mocks. `npm pack` was used instead of `pnpm pack` (no `node_modules`); both include `LICENSE` and copy the `license` field unchanged |
| Environment / fixture fidelity | 95% | Clean checkout of the commit; official texts freshly downloaded |
| Failure / edge cases | 95% | The wrapped-line grep gap and the stray-LICENSE scan were covered. No lifecycle surface |
| User surface / browser / desktop | N/A | No UI, desktop or runtime change. Binaries are Slice 2 |
| Durable regression coverage | 90% | By the user's decision (2026-10-08) no test was added. The repeatable checker is Slice 2 (REQ-010 automated). Until then, drift is caught only by review |

- Overall: **96%** (simple average of the 6 applicable categories). No category is below 90%, every in-scope critical AC is proven directly, and the 95% target is met.
- Broader validation: **Not Required**. There is no runtime, UI or desktop behavior; the changed boundary was checked directly.

## Durable Coverage Changed

- None. No tests were added, updated or removed. Test-code review: `Not Required — direct low-risk route`.

## Compatibility / Persisted Data

- No backward-compatibility mechanism or legacy retention. Apache claims for AGPL components were removed outright. Persisted data: `Not Affected`.

## Cleanup

- Temporary downloads, tarballs, the `git archive` copy and the optional check script were deleted. The worktree is unchanged by validation. Pre-existing uncommitted Solution Designer edits (requirements-doc.md, solution-revision-record.md for SR-004) were not touched.

## Residual Risks (for Delivery)

- After merge: `gh repo view AutoByteus/autobyteus-workspace --json licenseInfo` should report `agpl-3.0` (AC-001 second part). `licensee` is not installed locally, so detection was not pre-checked. `LICENSING.md` does not match GitHub's licence-filename pattern, so it should not compete with `LICENSE`.
- Include the REQ-009 table, lawyer-review note and user confirmation of holder/contact.
- Slice 2 not done: licence in binaries/Docker, About line, CLA, automated checker.

## Latest Authoritative Result

- Result: **Pass**
- Final confidence: 96%, target met, no category below 90%
- Broader validation: Not Required
- Next recipient: per `get_handoff_rules`
