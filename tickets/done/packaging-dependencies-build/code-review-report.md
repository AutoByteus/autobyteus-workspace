# Code Review Report — autobyteus-345 (packaging-dependencies-build)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc / Investigation Notes / Solution Revision Record / Design Spec Reviewed As Context: `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md` (SR-001), `design-spec.md` (D-1…D-9)
- Supplemental Task Artifacts Reviewed As Context: `evidence/measurements.md` (M-1…M-10, inputs)
- Design Review Report / Architecture Review Revision Record: `design-review-report.md`, `architecture-review-revision-record.md` (ARCH-REV-001 Pass; ARCH-F-001…004)
- Implementation Handoff / Revision Record: `implementation-handoff.md`, `implementation-revision-record.md` (IR-001)
- Code Review Revision Record: `code-review-revision-record.md`; Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1; Review Scope: `Full Review`
- Trigger: implementation handoff IR-001 (Medium / High)
- Prior round, failure-origin and delivery fields: N/A

## Routing Classification Review

- Task size: `Medium`; Architectural risk: `High`; Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence: Confirmed. 27 files, mostly small edits in existing owners; High because every desktop and Docker release changes what it ships and how it installs.

## Review Scope

- Changed implementation and behavior reviewed: `files` list and dependency classes of the server; `--prod` deploys and `--frozen-lockfile` in the Dockerfile, both prepare scripts and the five workflow installs; `lib/npm-before.mjs` and its use in `prepare-server.mjs`; the stray-folder removal and Prisma-missing failure; the removed nested workflow; `print-graphql-schema.mjs`, `codegen-local.mjs`, `codegen.ts`; regenerated `generated/graphql.ts` (by size and by the drift test); declared imports (`check-declared-imports.mjs`) and the manifest/lockfile changes; the two template fixes; docs; the four test files by case list and targeted reads.
- Diff read: `efd28d5c4a..81f5feeb98` (non-ticket files). Recorded checks (IMP-01…IMP-09) were read, not rerun: code is unchanged since `4db26446cb` apart from comment edits in `9652bbd02e`.
- Explicit exclusions: the build-only desktop release run (macOS, Linux, Windows) and the end of `prepare-server.mjs` on Windows were not run by anyone yet.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: release artifacts carry only what runs, install from the lockfile, leave no stray folder, keep generated GraphQL current, and import only declared packages; nothing a user sees changes.
- Design-spec behavior map verified against the implementation: yes, D-1…D-9 each found in code.
- ARCH-REV-001 findings confirmed in code: ARCH-F-001 (declared-imports guard with a server class rule), ARCH-F-002 (8 manifests with closure check `test_install_from_lockfile.py`), ARCH-F-003 (codegen builds the server first; the drift test builds the schema from source), ARCH-F-004 (`--before` decided at script start, override, stop when unusable).
- Behavior-basis status: `Confirmed`. No new behavior; no ambiguity.

| Behavior ID | Status | Path / evidence |
| --- | --- | --- |
| BEH-001 | Confirmed | `files` + `prisma` in `dependencies` + `deploy --legacy --prod` in the three package makers; `server-package-contents.test.ts`; IMP-02/03/04 (startup passes on the deployed folder, on `resources/server`, in a Linux container) |
| BEH-002 | Confirmed (Windows tail unproven locally) | frozen installs everywhere (`grep` finds no `no-frozen-lockfile` left outside tickets); `resolveNpmBefore` + `--before=` in the staging install; IMP-01, IMP-06 |
| BEH-003 | Confirmed | both scripts remove `autobyteus-server-ts/autobyteus-web`; IMP-03 |
| BEH-004 | Confirmed | nested workflow gone; codegen scripts and drift test; declared-imports check; lockfile removes exactly `@nuxtjs/apollo`, `@rollup/plugin-graphql`, `@vue/apollo-option` |

## Supported Product Scenario And Reachability Gate

| Scenario | Kind | Trigger | Path | Outcome | Validity |
| --- | --- | --- | --- | --- | --- |
| SC-1 | Operational | A release build (desktop job or Docker image) | prepare script / Dockerfile → `deploy --prod` | Runtime-only package that starts | Supported Normal |
| SC-2 | Operational | Rebuild of an older commit | `AUTOBYTEUS_NPM_BEFORE` | Bounded Windows install | Supported Explicit Edge (SCN-004) |
| SC-3 | Contract | A schema change without regenerating the web file, or an undeclared import | drift test / declared-imports check | Fails in the routine suite | Supported Normal |

### Candidate Finding And Mechanism Gate

| Candidate | Observation | Evidence | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C-1 | Handoff deviation 1: AC-002 says "18% smaller or more than the base (827 MB measured)"; like for like the saving is 15.6% (987 → 833 MB du) | `IMP-02`, `measurements.md` M-1/M-3 | Reject (no defect) | The 827 MB base and the 674 MB candidate of M-3 were both measured before `prisma generate`; the generated client adds about 160 MB to both packages (987 − 827 = 160; 833 − 160 ≈ 673). So the absolute saving reproduces (827 − 674 = 153 MB before the generate; 987 − 833 = 154 MB after) and exceeds the 149 MB that 18% of the stated 827 MB base means. Only the percentage shrinks, because the denominator now holds the generated client. The figure in the AC is a pre-generate estimate, not a change of behavior or content |
| C-2 | Handoff deviation 1b: three `@types/*` directories stay in the virtual store | `IMP-02`: they are dependencies of `p-retry`, `protobufjs`, `type-graphql`, all production packages; none at top level; no vitest/typescript | Reject | A production package's own dependency cannot be removed by a `--prod` deploy; the contents intent (no development packages) is met |
| C-3 | Declaring `vue` surfaced two template type errors, fixed in `SearchableGroupedSelect.vue` and `ServerLogViewer.vue` | `refreshLogs(showLoading: boolean = true)` at `ServerLogViewer.vue:115`: the old `@click="refreshLogs"` passed the click event (truthy) and `refreshLogs()` passes the default `true`: same behavior. `reactive<CSSProperties>` is a type annotation only | Reject | Minimal, behavior-preserving; web specs pass (IMP-07); baseline 298 → 297 through removing a stale `@ts-expect-error` |
| C-4 | The Python checks (`test_install_from_lockfile.py`, `test_declared_imports.py`) are not run by any workflow | grep of `.github/workflows` and `TESTING.md`; the other `scripts/tests/test_*.py` files are not either | Reject | Same convention as the existing script tests; the server unit suite carries the two routine guards that need to run on every change (contents, GraphQL drift) |
| C-5 | `web-generated-graphql-current.test.ts` makes the server unit suite spawn the web codegen (about 10 s) and need the web dependencies | Design D-8/ARCH-F-003 chose the server suite as the routine runner; test timeout 180 s | Reject | Designed and bounded |
| C-6 | `rm -rf "${SERVER_REPO_DIR}/autobyteus-web"` | `SERVER_REPO_DIR="${WORKSPACE_ROOT}/autobyteus-server-ts"` set before, `set -e`; the mjs uses `serverSourceRoot` the same way | Reject | Fixed child of a derived path; cannot reach elsewhere |
| C-7 | `prepare-server.mjs` size and FU-005 | Effective non-empty lines (comments and blanks excluded): 489 before → 483 after, under 500; raw 585 → 584 | Reject | The change did not grow the file; FU-005 stays as the implementer's own record (it counts raw lines) |
| C-8 | FU-003 (`.server-packaging-stage/` left behind, not ignored) and FU-004 (verifier through a symlinked `/tmp`) | `IMP-06`, `IMP-02` | Follow-up already recorded | Pre-existing behavior of surrounding code; not caused by this change; the ticket works without them |

## Structural / Design Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Task design health assessment (Cleanup, Missing Invariant) preserved | Pass | each invariant has an automated check: contents test, lockfile/deploy source checks with mutations, declared imports, codegen drift |
| Spine clarity and preservation | Pass | DS-001 (shell) / DS-002 (Windows) / DS-003 (codegen) realized as written |
| Ownership boundary | Pass | `package.json` `files` and dependency classes are the one statement of what ships; the prepare scripts do not re-prune |
| Existing capability reuse | Pass | `pnpm deploy`, existing codegen config (`CODEGEN_OUTPUT`), existing verify-packaged-server script |
| Repeated coordination / empty indirection | Pass | `resolveNpmBefore` is its own small module with an injectable commit time; no pass-through layers |
| SoC / file placement | Pass | helper in `scripts/lib`, root check in `scripts/`, tests beside their kind |
| Dependency direction | Pass | server `src/` imports production dependencies only (checked by the guard); backend SDK moved to devDependencies because only type imports remain |
| Naming | Pass | |
| Duplication | Pass | One minor repeat: both prepare scripts carry the same removal and comment (two scripts for two shells) |
| Patch-on-patch | Pass | single round |
| Dead code removed | Pass | dead lockfile branches, Prisma-only devDependencies and prune step, `canuse-ok.txt`, nested workflow, `@nuxtjs/apollo`, the Prisma "skipping generate" branch, a stale `@ts-expect-error` |
| Tests clear and requirement-aligned | Pass | contents test lists exact files; mutation tests for the source checks; fixtures for the import classes; `npm-before` cases for override / commit / none / invalid |
| API/E2E readiness | Pass | build-only desktop release run named for API/E2E |

## Source File Size And Structure Audit

| File | Before (effective) | After | `>500` | Notes |
| --- | --- | --- | --- | --- |
| `prepare-server.mjs` | 489 | 483 | Pass | not grown |
| `prepare-server.sh` | 312 | 313 | Pass | |
| New: `check-declared-imports.mjs` 106, `codegen-local.mjs` ~50, `npm-before.mjs` ~35, `print-graphql-schema.mjs` ~30 | new | all small | Pass | |

## Legacy / Backward-Compatibility Verdict

All Pass. No compatibility mechanism added; no persisted-data transition (build inputs and outputs only).

## Docs-Impact Verdict

`Yes`, done: `electron_packaging.md`, `docker/README.md`, `autobyteus-web/README.md`. Delivery re-verifies them.

## Review Scorecard

- Overall score: 9.4 / 10 (summary only)

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 | Three build paths follow the designed order | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | `files` and the dependency classes are the single statement | — | — |
| 3 | API / Interface Clarity | 9.4 | Small CLIs with usage and explicit environment override | — | — |
| 4 | Separation of Concerns and File Placement | 9.4 | | — | — |
| 5 | Shared-Structure Tightness | 9.4 | No shared structure added | — | — |
| 6 | Naming and Local Readability | 9.4 | Comments say why | — | — |
| 7 | API/E2E Readiness | 9.3 | Linux container and clean-clone evidence strong; Windows tail and the three-platform release run not yet run | Windows | Build-only release run |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | Startup proven on the deployed folder, `resources/server` and a Linux container; the saving reproduces in absolute terms | Windows tail | as above |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | | — | — |
| 10 | Cleanup Completeness | 9.4 | | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None. The implementer's FU-003, FU-004 and FU-005 stand (FU-005 is not needed by the effective-line count, see C-7; the Solution Designer may drop it).

## Classification

Not applicable (Pass). Task size and architectural risk unchanged.

## Recommended Recipient

API/E2E engineer (primary pass rule); implementation engineer informed.

## Residual Risks

- Windows: `prepare-server.mjs` after the symlink check, `npm install --before` against the real registry, junction rules. API/E2E's build-only desktop release run (`workflow_dispatch`, `publish_release` false) is the proof, including the Linux Prisma engine validation.
- AC-002 as written (percentage). API/E2E should judge it by the absolute saving against the stated 827 MB base (at least 149 MB; measured 154 MB) and the contents, and the Solution Designer may correct the percentage wording in the requirements (a like-for-like figure is 15.6%).
- `--before` is a bound, not an identity (DEC-3).

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`; Material-Premise Gate: `Pass`
- Score Summary: 9.4 / 10, every category ≥ 9.3
- Recommended Recipient: API/E2E engineer
- Notes: The two AC-002 deviations are explained, not defects (C-1, C-2). The declared `vue` fixes are behavior-preserving (C-3).
