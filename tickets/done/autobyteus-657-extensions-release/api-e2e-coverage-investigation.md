# API/E2E Coverage Investigation — autobyteus-657: the catalog public key built into the app

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (R-1…R-6, D-1…D-6)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001)
- Design Spec: `design-spec.md`
- Supplemental Task Artifacts: `published-catalog-2026-11-26/`
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct route)
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `N/A` (becomes `API-REV-001`)
- Current Investigation Round: 1; Trigger: implementation handoff IR-001 (`/implementation_engineer`, direct route)
- Prior Investigation Reviewed: none. Latest Authoritative Investigation: this document.

Paths are in `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-657-extensions-release/tickets/in-progress/autobyteus-657-extensions-release/`. Code under test: `codex/autobyteus-657-extensions-release` @ 45645fb079 (code a80cd0218f), base `origin/personal` @ b86817915a.

## Current Requirement And Design Basis

`EXTENSIONS_CATALOG_PUBLIC_KEY_PEM` holds the public half of the key that signs the published catalog (R-3), so an app built from this branch verifies the real catalog, installs Voice Input and dictates (R-5); RELEASE.md's Extensions catalog check passes (R-6); the private key never leaves the secret and the founder's backup (R-1); the repository is public (R-2); RELEASE.md carries D-5's wording.

## Supported Scenarios And Real Usage

- Scenarios: the owner opens Settings → Extensions on an app built from this branch and sees Voice Input from a verified catalog, installs it and dictates (R-5); the release engineer runs the Extensions catalog check before a tag (R-6); a tampered or foreign catalog is refused (trust anchor).
- Added: a catalog signed by another key, or changed by one byte, shows `unverified` (the offline test's negative case; API-02 checks it with Node's own crypto).
- Unsupported/contrived: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Built-in catalog key | Changed (empty → real PEM) | design Change table | key equality, fingerprint, signature check, real chain |
| Every node's catalog status with the default source | Changed (`unverified` → `verified` against the published catalog) | composition root reads `readExtensionCatalogSource()` | real-release test (IMP-02), packaged app (IMP-03) |
| RELEASE.md, module doc | Changed (docs) | D-5 | wording compared with D-5 |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | constant read by `ExtensionCatalog` | offline test (IMP-01) | the real network chain | real-release test, packaged app (IMP-02, IMP-03) |
| API / transport / contract | No | — | — | — | — |
| Frontend component / state | No (renders `verified`) | — | — | — | — |
| Browser integration / user journey | Yes (page shows a verified list) | — | — | — | packaged app (IMP-03) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No code change | — | — | — | — |
| Desktop shell / Electron-specific integration | No code change; the packaged attacher is exercised by IMP-03 | — | — | — | — |
| Process / lifecycle | No | — | — | — | — |
| Persisted-data transition | No (Not Affected) | — | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes (GitHub releases) | catalog + package download | — | publication state can change after the implementation's check | independent re-check now (API-02) |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-657-extensions-release`; pnpm monorepo, Node 22.23.1, macOS arm64.
- Testing guideline: `TESTING.md` (root). Also `RELEASE.md` § Extensions catalog check, `DESIGN.md` rule 12.
- Conflicting instructions: none. TESTING.md "Both typechecks, whatever the change touches": IMP-01 ran only the server typecheck → API-01 runs the web typecheck.
- Changed build-input paths: none (`RELEASE.md`, a server doc, a server source constant, a server unit test and its JSON fixture; none is in TESTING.md's build-input list; no new import between packages, no tsconfig/package.json/workflow change) → no fresh-start build, no build-only release run.
- Secrets: none needed (public URLs; `gh` reads secret names only).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Choosing the path | both typechecks | `pnpm -C autobyteus-web typecheck` |
| `RELEASE.md` § Extensions catalog check | R-6 | key equals the repository's raw file; `gh release view catalog … --json assets`; the catalog lists voice-input |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/extensions/extension-parts.test.ts` "verifies the real published catalog with the built-in key (autobyteus-657), offline" | the built-in key verifies the published bytes; one byte more → unverified | R-3 | Still Valid (new) | IMP-01; API-02 confirms the fixture equals the published bytes | Reuse |
| same file, "uses the built-in catalog URL unless a developer's catalog is set" and the test-key catalog tests | overrides still win; verify/refuse logic | R-3 | Still Valid | IMP-01 | Reuse |
| `tests/real-release/voice-input-extension.real-release.test.ts` | real chain | R-5 | Still Valid | IMP-02 (no overrides) | Reuse |

No other test reads the constant or asserts `unverified` for the default source (grep of `autobyteus-server-ts/src`, `tests`, `autobyteus-web`).

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R1 | R-3 | server typecheck, build, extensions + architecture + node-access tests | Reused | IMP-01 | ran on a80cd0218f; HEAD adds documents only |
| API-R2 | R-5 | real chain, no overrides | Reused | IMP-02 | same commit; log shows install and en/zh/silence |
| API-R3 | R-5 | packaged app, isolated instance | Reused | IMP-03 | same commit; log and five screenshots judge it |
| API-01 | R-3 | web typecheck (compiles server source through cross-package tests) | Existing Test | `pnpm -C autobyteus-web typecheck` | TESTING.md: both typechecks |
| API-02 | R-3, R-4, R-6 | published catalog and package, now | Temporary Probe | `probes/api-e2e/chain-check.mjs` with Node's crypto | independent of the app's verifier; publication can change after IMP-04 |
| API-03 | R-1, R-2 | key hygiene, repository state | Temporary Probe | secret gate; private-key markers in the branch, ticket folder and every commit of the extensions repository; `gh repo view`; `gh secret list` (names) | R-1/R-2 acceptance |

- Test progress log needed: `No` (short cases).

## Durable Coverage To Add / Update / Remove

None.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| The full server unit and web suites | the constant has one production reader (the composition root) and one test reader; no test depends on the key being empty | negligible | No | — |
| Microphone capture in the packaged app | unchanged by this change; proven in autobyteus-516 (API-10, emulated device) | negligible | No | — |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed: `Yes`. Durable coverage changes: `No`. Reroute: `No`.
