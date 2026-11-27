# Handoff Summary

## Summary Meta

- Ticket: `autobyteus-657-extensions-release` (Project Task `autobyteus-657`; requested by `/project_task_manager` for the founder): make the extensions catalog real, then lift the release hold set by autobyteus-516.
- Date: `2026-11-26`
- Classification: `task_size: Small`, `architectural_risk: Low`; route: direct low-risk (no architecture review, no source review, no test-code review).
- Current Status: `Verified from evidence; finalized on personal; no app release` (the finalization record is in `release-deployment-report.md`).
- Branch: `codex/autobyteus-657-extensions-release`, base `origin/personal` `b86817915a` at bootstrap and at delivery (the base had not advanced; integration method: already current).
- Delivery rounds: `DR-001` delivered (`delivery-revision-record.md`).

## Delivery Summary

- Delivered scope:
  - **The app carries the catalog's public key.** `EXTENSIONS_CATALOG_PUBLIC_KEY_PEM` (`autobyteus-server-ts/src/extensions/catalog/extension-catalog-source.ts`) holds the exact text of `catalog-public-key.pem` from `AutoByteus/autobyteus-extensions` (Ed25519, fingerprint `SHA256:75d4d2f80ed35374e7956d736aed66111e3eac76b911eb2367428a27dc64ad4c`). A node can now verify the signed catalog; Voice Input is offered and installs.
  - **A durable offline test** (`tests/unit/extensions/extension-parts.test.ts`, fixture `tests/fixtures/published-extensions-catalog/`): the two files the `catalog` release published verify with the built-in key and no overrides, and one extra byte does not.
  - **Docs:** RELEASE.md (the D-5 key wording; the catalog check's last sentence), `modules/extensions.md` §3.
- Done before this change, by the Solution Designer on the founder's word (they are the ticket's Current State, not code in this repository): the public repository `AutoByteus/autobyteus-extensions` (main `5427a1a`), the key pair created on the founder's Mac by his approved script, the secret `EXTENSIONS_CATALOG_SIGNING_KEY`, release `voice-input-v1.0.0` and release `catalog`.
- Docs synced by delivery (`docs-sync-report.md`): RELEASE.md (a date taken out of the catalog check; the "AutoByteus Extensions" section names the repository's third workflow, *Check the signing key*).
- Durable coverage: the offline test above (added by implementation).

## Delivery's round

- **DR-001** fetched the base (unchanged), audited the evidence, reran RELEASE.md's Extensions catalog check itself with Node's own crypto (below), synced the docs and finalized. It found no defect and no follow-up.

## Verification Summary

- Verified from evidence by delivery. Every critical requirement (R-1 to R-6) is directly proven; nothing needs the user's check. No evidence decision (`DEC-*`) accepted an unverified risk.
- Final confidence 96% (the default target of 95% is met; no category below 90%).
- Key evidence opened by delivery (details in `release-deployment-report.md`):
  - R-3, R-6: API-02 `"keyEqualsRepositoryBytes": true`, `"signatureVerifiesWithBuiltInKey": true`, `"tamperedVerifies": false`, the fixture equal to the published bytes, the catalog listing `voice-input 1.0.0` with SHA-256 `57e0a541…caf8d` and the package's `extension.json` equal to the entry, pinned to runtime 0.3.2.
  - Delivery's own rerun just now (a separate script, not API/E2E's): key equals the repository's raw `catalog-public-key.pem`; Ed25519; the live catalog's signature verifies; one extra byte does not; both fixture files equal the live ones; `gh release view catalog` lists both assets; the repository is `PUBLIC`.
  - R-5: IMP-02 (real-release test, no overrides): "installed and ready in 112 s", 1 test passed; IMP-03 (packaged app, isolated instance, screenshot opened): the list is verified with no unverified note (`"catalogNotes":0`), Install takes 68 s, ready at 91 s, dictation from the `file://` window gave the exact sentence in 380 ms.
  - R-1, R-2: API-03: Secret Gate pass; no private-key markers in the branch, the ticket folder or any of the repository's 5 commits; `PUBLIC`; the secret's name is listed (names only).
  - Gates: IMP-01 server typecheck, build, 142 tests; API-01 web typecheck production errors 0, test files at the baseline (85 in 35).

## Residual Risks For The User

- **The app's own release is not done and is a separate Task on the founder's word.** The release hold set by autobyteus-516 ends with this merge; RELEASE.md's Extensions catalog check must be rerun before every beta and stable tag.
- The founder's own backup of the private key is his to confirm; no agent opened the key file, and nothing here needed it.
- GitHub shows `releases/latest` as `voice-input-v1.0.0`, not the `catalog` release. Nodes read the fixed `catalog` tag URL, so it plays no part.
- Not re-run (unchanged by this ticket): microphone capture in the packaged app, signing and notarization, and other operating systems' installs.

## Follow-ups

None new. The Solution Designer still holds FU-001 to FU-005 of autobyteus-516.

## Release

- No release: none was asked for ("the app's own release stays a separate Task on the founder's word"), and `RELEASE.md` makes none the default. No `release-notes.md` (see the docs sync report: autobyteus-516's notes already describe the feature).
