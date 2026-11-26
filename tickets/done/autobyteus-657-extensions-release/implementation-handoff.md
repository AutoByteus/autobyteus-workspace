# Implementation Handoff — autobyteus-657: the extensions catalog public key built into the app

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Small / Low, no independent review selected; handoff rule "Small or Medium and Low" → `/api_e2e_engineer`.
- Requirements doc: `requirements-doc.md` (R-1…R-6, D-1…D-6). Investigation notes: `investigation-notes.md`. Solution revision record: `solution-revision-record.md` (SR-001). Design spec: `design-spec.md`.
- Supplemental: `published-catalog-2026-11-26/` (the published catalog, its signature, the public key).
- Design review report / architecture review revision record: `N/A — not applicable`.
- All paths in `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-657-extensions-release/tickets/in-progress/autobyteus-657-extensions-release/`.

## Current Implementation Summary

- Implementation cycle: `Initial`; revision record `implementation-revision-record.md`; current revision `IR-001`; related SR-001; other revision IDs N/A; triggering findings N/A.
- Commit: a80cd0218f on `codex/autobyteus-657-extensions-release` (base `origin/personal` @ b86817915a), plus the documents commit after this file. Not pushed.
- `EXTENSIONS_CATALOG_PUBLIC_KEY_PEM` (`autobyteus-server-ts/src/extensions/catalog/extension-catalog-source.ts`) is the exact text of `catalog-public-key.pem` (equal to the repository's at `main`; fingerprint = SHA-256 of the DER public key `75d4d2f80ed35374e7956d736aed66111e3eac76b911eb2367428a27dc64ad4c`). Its doc comment says how the key was created (D-5) and that it changes only together with the repository's key.
- Test `tests/unit/extensions/extension-parts.test.ts` "verifies the real published catalog with the built-in key (autobyteus-657), offline": the `catalog` release's two published files (fixture `tests/fixtures/published-extensions-catalog/`) verify with the default source (no overrides) → `verified`, voice-input 1.0.0 with the released package's URL and SHA-256; one byte more → `unverified`. The tests with their own test keys stay.
- RELEASE.md: "AutoByteus Extensions" now has the D-5 wording; "Extensions catalog check" says that since 2026-11-26 the key and first releases exist, so a failing check means something changed and is fixed before the tag (the two check bullets unchanged).
- `autobyteus-server-ts/docs/modules/extensions.md` §3 names the built-in key, its fingerprint, where it came from and that the two change together.

## Routing Classification (Mandatory)

- Task size `Small`; architecture risk `Low` (design-spec.md, Classification). `Confirmed`: one constant, one test with a fixture, three document passages; the existing trust path is unchanged.
- Selected route: `Direct API/E2E`. Lightweight implementation self-review completed: `Yes` (below).
- New design impact or escalation trigger: None. Every chain check passed.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| R-3 | The app carries the repository's public key, tested, merged into `personal` | `extension-catalog-source.ts` constant → `readExtensionCatalogSource()` default → `ExtensionCatalog` verify | Constant equal to the repository key (IMP-04); offline test (IMP-01); merge is delivery's |
| R-5 | The whole chain on an isolated instance | Built app → embedded node → published catalog (verified) → install → dictation | IMP-02 (real-release test, no overrides), IMP-03 (packaged app, isolated instance) |
| R-6 | RELEASE.md's Extensions catalog check passes | — | IMP-04 |
| D-5 | RELEASE.md key wording | RELEASE.md "AutoByteus Extensions" | Done, verbatim |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. No app release.

## Key Files Or Areas

`autobyteus-server-ts/src/extensions/catalog/extension-catalog-source.ts`, `autobyteus-server-ts/tests/unit/extensions/extension-parts.test.ts`, `autobyteus-server-ts/tests/fixtures/published-extensions-catalog/{extensions-catalog.json,extensions-catalog.json.sig}`, `RELEASE.md`, `autobyteus-server-ts/docs/modules/extensions.md`.

## Important Assumptions

- The private key file `~/autobyteus-catalog-signing-key/` was not opened, read or moved; nothing here needs it.

## Known Risks

- None new. GitHub reports `releases/latest` = `voice-input-v1.0.0`; nodes read the `catalog` tag's fixed URL, so Latest plays no part (IMP-04 note).

## Lightweight Implementation Self-Review (direct route)

- The constant is the exact PEM (trailing newline kept; `createPublicKey` reads it; fingerprint recomputed equal). No other code path changed; the development overrides still win when set (existing test "uses the built-in catalog URL unless a developer's catalog is set" passes).
- The new test proves the constant against the real published bytes offline and keeps a negative case; it does not reach the network.
- Docs match the code and the repository (fingerprint, secret name, the coordinated-change rule). No dead code, no compatibility path, no persisted-data change (the existing constant is filled).

## Task Design Health Assessment Implementation Check

- Change posture: configuration of an existing trust anchor; root cause N/A (no defect); refactor: none needed. Matched the design: `Yes`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: None. Legacy retained: No. Dead code in touched files removed: Yes (none found). Follow-ups: None. Shared structures tight: Yes. Deviations: None. Size guardrails: Yes.

## Persisted Data Transition Check

- Not Affected (design-spec.md: "The data contract and the persisted data are not affected").

## Environment Or Dependency Notes

- A fresh worktree needs `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prepare:source` before the route test (else `Cannot find module '.prisma/client/default'`).
- The real-release test and the isolated instance download the voice runtime 0.3.2 and its model (~2 GB) into temporary folders.

## Checks Run

Evidence folder: `evidence/` in this ticket folder.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck`; `pnpm build`; `vitest run tests/unit/extensions tests/unit/api/rest/extensions-routes.test.ts tests/architecture tests/unit/node-access` | a80cd0218f | macOS arm64, Node 22.23.1 | constant, catalog, routes, architecture rules | R-3 | Pass | `IMP-01-server-gates.log` | "[typecheck] PASS"; "build exit 0"; "Tests  142 passed (142)" |
| IMP-02 | `env -i … AUTOBYTEUS_VOICE_INPUT_REAL_E2E=1 pnpm test:voice-input-real-release`, no catalog overrides, temporary HOME and data dir | a80cd0218f | GitHub releases `catalog`, `voice-input-v1.0.0`; runtime 0.3.2 | built-in key → published catalog → install → transcribe en/zh/silence | R-5 | Pass | `IMP-02-real-chain.log` | "installed and ready in 112 s"; "Tests  1 passed" |
| IMP-03 | `pnpm --silent isolated-app start --build`; open Settings → Extensions, Install, dictate from the packaged window, Memory search; `isolated-app stop` | a80cd0218f (build 1.5.15-beta.2) | packaged app, e2e launch profile, own temp data root (removed) | packaged app + real node + desktop credential attacher | R-5 | Pass | `IMP-03-desktop-isolated.log`, `IMP-03-D1…D5-*.png` | catalogNotes 0 + Install enabled; "installed after 68 s", "ready after 91 s"; dictation status 200, the exact sentence, 380 ms; microphone button on Memory search |
| IMP-04 | key equality with the repository's raw file; `gh release view catalog … --json assets`; the catalog's entries | a80cd0218f | network | RELEASE.md Extensions catalog check | R-6 | Pass | `IMP-04-catalog-check.log` | "equals repository key: true"; both assets; "voice-input 1.0.0 57e0a541…" |

- Not run, and why: the full server unit suite and the web suite (the change is one constant read only by the catalog; the affected folders ran). Microphone capture in the packaged app (it needs the OS microphone permission dialog; the dictation request was sent from the packaged window with a spoken clip instead, the same request the recorder sends).

## Frontend Rendered-Result Check

- Not Applicable as a UI change (no frontend code changed). The packaged app's Extensions page was rendered as validation (IMP-03 screenshots): Voice Input from a verified list, Installing, Installed and on with Getting ready, On, and the Memory search microphone.

## Downstream Coverage Hints / Suggested Scenarios

- Rerun IMP-04 just before any beta/stable tag (RELEASE.md).
- A node without network access: the page shows "Could not reach the list of extensions" and an installed Voice Input keeps working (unchanged behavior, autobyteus-516).

## API / E2E / Executable Coverage Investigation And Execution Still Required

The design's Validation 1–4 are done here (IMP-01…IMP-04). Remaining for this route: API/E2E's own judgment of coverage, then delivery's finalization into `personal` (the design names it; no app release, a separate Task).
