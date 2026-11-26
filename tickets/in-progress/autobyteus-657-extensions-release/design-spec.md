# Design Spec — autobyteus-657: build the catalog public key into the app; RELEASE.md wording

## Solution And Approval Basis

- Solution revision: SR-001 (requirements-doc.md R-3, R-5, R-6; decisions D-4, D-5).
- Approved: the founder's word covers every step of autobyteus-657 (PM 2026-11-26: "You delegate to appropriate agent to fulfill the whole thing"); D-4/D-5 delegated by him ("You decide I trust your reasonable decisions"). User approval of this design: not separately required (within his word).
- Design status: `Ready`.
- Authorities read: autobyteus-516 design-spec.md and extension-contract.md §3 (archived `tickets/done/autobyteus-516-extensions/`), `DESIGN.md`, RELEASE.md "Extensions catalog check" and "AutoByteus Extensions".
- Base: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-657-extensions-release`, branch `codex/autobyteus-657-extensions-release`, `origin/personal` @ b86817915a (refresh before finalizing).

## Current State (done before this change, by the Solution Designer on the founder's word)

- `AutoByteus/autobyteus-extensions` is public; main @ 5427a1a. `catalog-public-key.pem` was added at fc0f1f1, fingerprint `SHA256:75d4d2f80ed35374e7956d736aed66111e3eac76b911eb2367428a27dc64ad4c`. The secret `EXTENSIONS_CATALOG_SIGNING_KEY` was set 2026-11-26T18:44:46Z, and the GitHub check "Check the signing key" passed (run 45878362925).
- Release `voice-input-v1.0.0`: `voice-input-1.0.0.tar.gz`, SHA-256 `57e0a541be18f3af12b0b18c177dfe98f29b63952dfed5dcef8903670a8caf8d`, pinned to voice runtime 0.3.2.
- Release `catalog` (run 45878674419): `extensions-catalog.json` (894 bytes) and `.sig`. Downloaded without login, the signature verifies with `catalog-public-key.pem`, and it lists voice-input 1.0.0. A copy of the published bytes is in `published-catalog-2026-11-26/` in this folder.
- The app on `personal`: `EXTENSIONS_CATALOG_PUBLIC_KEY_PEM = ""` (`autobyteus-server-ts/src/extensions/catalog/extension-catalog-source.ts:25`), so every node answers `unverified`.

## Change

| File | Change |
| --- | --- |
| `autobyteus-server-ts/src/extensions/catalog/extension-catalog-source.ts` | `EXTENSIONS_CATALOG_PUBLIC_KEY_PEM` = the exact text of `catalog-public-key.pem` (the copy is in `published-catalog-2026-11-26/catalog-public-key.pem`; equal to the repository's at fc0f1f1). Doc comment: say how it was created (D-5) and that it changes only together with the repository's key, as a coordinated change. |
| `autobyteus-server-ts/tests/unit/extensions/` (the existing catalog tests, `extension-parts.test.ts`) | One test: the built-in key verifies the real published catalog. The fixture is the two published files from `published-catalog-2026-11-26/`, kept under the tests' fixtures. This proves the constant is the real signing key's public half, offline. Keep the existing tests that use their own test keys. |
| `RELEASE.md` | AutoByteus Extensions, line ~675: replace "The founder creates the key pair himself; it is never generated, printed or committed by an agent." with the D-5 wording (requirements-doc.md). Extensions catalog check (line ~250): replace "the key and the first releases are the founder's to create" with: since 2026-11-26 both exist, so a failing check means something changed and must be fixed before the tag. Keep the two check bullets as they are. |
| `autobyteus-server-ts/docs/modules/extensions.md` | Where it says the key is empty or still to be created: the key is built in (fingerprint above), plus where it came from. |

No other code change. The data contract and the persisted data are not affected: the change fills an existing constant.

## Validation (on an isolated instance only; never the founder's `~/.autobyteus`)

1. Server unit tests, type check and build (existing gates).
2. The real chain without overrides. Run the server's opt-in real-release test `test:voice-input-real-release` (`autobyteus-server-ts/tests/real-release/voice-input-extension.real-release.test.ts`) against the published catalog with the built-in key: no `AUTOBYTEUS_EXTENSIONS_CATALOG_*` overrides, a temporary data dir. Expected: catalog `verified`; Voice Input installs (package + runtime 0.3.2 + model); the clip is transcribed.
3. The desktop app built from this branch, started with the e2e launch profile (`ELECTRON_LAUNCH_PROFILE=e2e`, its own data root and port): Settings → Extensions shows Voice Input from a verified list; Install works; dictation works. A screenshot of each.
4. RELEASE.md's Extensions catalog check:
   - the built-in key equals `https://raw.githubusercontent.com/AutoByteus/autobyteus-extensions/main/catalog-public-key.pem`;
   - `gh release view catalog --repo AutoByteus/autobyteus-extensions --json assets` lists both assets;
   - the catalog lists voice-input.

## Classification

- task_size: `Small` (one constant, one test, three document passages).
- architectural_risk: `Low`. It fills an existing trust-anchor constant on the existing path, with no new owner, route, persistence or contract. The trust decision itself was made in autobyteus-516 and approved there.
- Escalation trigger: anything beyond these files, or a chain check that fails for a reason other than this constant.

## Not in scope

The app's beta or stable release (a separate Task, on the founder's word). The release hold on `personal` ends when this change is merged and the check passes. The Solution Designer reports that to the PM.
