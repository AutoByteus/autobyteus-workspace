# Handoff Summary — Custom Provider Model Context Metadata

## Status

**User-accepted; repository finalization and v1.4.47 release authorized.** The user explicitly reported the task done and requested finalization plus a new release. A mandatory final fetch retained `origin/personal@37660dd61347b630889a698769af5641566357bb` (`v1.4.46`) with no base advance, and the accepted SR-017 / IR-013 state passed a fresh 4-file / 12-test friendly-Qwen rerun. The user-facing state is unchanged from the accepted DR-010 package.

## Worktree / Branch / Target

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata`.
- Ticket branch: `codex/custom-provider-model-context-metadata`.
- Finalization target: `personal` / `origin/personal`.
- Latest tracked base: `origin/personal@37660dd61347b630889a698769af5641566357bb` (`v1.4.46`).
- Latest-base integration merge: `331ff94da3c2c9a2a07e11efff68f5307a4cfabb`.
- Protected reviewed/package checkpoint: `1d5340d37332df794bf82f97b61e05421527c76b`.
- Post-checkpoint and post-build divergence: ahead 18 / behind 0.
- Base ancestor check: Pass.
- Integrated-state evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/done/custom-provider-model-context-metadata/delivery-integrated-state-refresh.log`.

## Current Authorization

- Solution: SR-017.
- Architecture: ARCH-REV-011 Pass.
- Implementation: IR-013, retaining IR-012.
- Source review: CRR-019 Pass at 9.44/10.
- API/E2E: API-REV-010 Pass at 97.3%; every applicable confidence category is at least 96%.
- Durable-test determination: CRR-020 Not Applicable; API/E2E changed no repository-resident durable coverage.
- Unresolved findings: none.

## Delivered Behavior

### Friendly Qwen presentation with exact identity

- Live Qwen rows show `DeepSeek V4 Pro (Qwen)`, `DeepSeek V4 Flash 0731 (Qwen)`, and `GLM-5.2 (Qwen)` in Settings and shared live agent/team/application/member/binding selectors.
- Native names such as `qwen3.8-max` remain unchanged.
- Option, selected, and persisted values remain exact collision-safe selectors such as `qwen:deepseek-v4-pro`, `qwen:deepseek-v4-flash-0731`, and `qwen:glm-5.2`.
- Qwen requests continue to send exact unprefixed provider values: `deepseek-v4-pro`, `deepseek-v4-flash-0731`, and `glm-5.2`.
- Generic non-Qwen built-ins retain identifier labels; custom OpenAI-compatible models retain friendly names.
- A stored selector absent from the live catalog stays raw-visible and unavailable for repair; no label is guessed and no selector is cleared or replaced.

### Qwen setup and catalog

- Settings saves a probed Base URL/key pair through strict AppConfig/vault ownership and reports server-owned default/configured status.
- The current exact target catalog contains `qwen3.8-max`, `deepseek-v4-pro`, `deepseek-v4-flash-0731`, and `glm-5.2`; `qwen3.8-max-preview` remains absent.
- Refresh failures after a committed save preserve the committed configured state and show a warning instead of relabeling the save as failed.

### Readable custom-provider identity and legacy reset

- New custom OpenAI-compatible providers receive an immutable `provider_<name-derived-body>` ID; invalid derivation and canonical-name/ID collisions fail atomically.
- Legacy V1 credentials are discarded. Valid legacy names can map exact allowlisted selector prefixes before empty V3 is committed; old UUID secrets are removal-only afterward and are never resolved or copied.
- No old provider record, Base URL, credential, catalog group, reconnect state, or UUID alias survives reset.
- Users recreate desired providers with the existing form and a newly entered key. Reusing the same canonical name regenerates the same readable prefix.
- Missing selectors stay visible/unavailable and block launch/resume instead of silently falling back.

## Validation Summary

API-REV-010 directly passed:

- focused web behavior: 4 files / 12 tests;
- restart-backed Qwen lifecycle and exact outbound wire values: 1 file / 1 test;
- web boundary, localization, and literal guards;
- Nuxt production build with 15 prerendered routes;
- real Chrome Settings against the running Electron backend with zero visible duplicate-selector prefixes;
- real shared binding selection showing friendly text while retaining exact selector and live provider value;
- repository integrity, secret, temporary-resource, and cleanup checks.

Delivery then ran the complete README-guided Electron pipeline. DMG/ZIP integrity, arm64 executable, packaged node-pty helpers and spawn probe, built-server identity, `app.asar` renderer byte identity, and the packaged IR-013 shared-label branch all passed.

## Durable Documentation

Docs sync: Updated / Pass.

Updated in DR-010:

- `autobyteus-web/docs/settings.md`;
- `autobyteus-ts/docs/provider_model_catalogs.md`.

Prior readable-identity, secret-management, and migration docs remain accurate without further edits.

Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/done/custom-provider-model-context-metadata/docs-sync-report.md`.

## Electron Test Artifact

- Recommended DMG: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.46.dmg`.
- SHA-256: `b85c6a308ffe5f41ab5955b160358953232ff0ec54bdfa62e356c5d0c8c20aca`.
- ZIP: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.46.zip`.
- ZIP SHA-256: `834566db8dabdf9f00c9a766b639f6b2610c408579acb80e96df0ba6291362ca`.
- Build posture: local macOS arm64, no Developer ID/team signature and no notarization; the root executable carries only an ad-hoc linker signature.
- App data: `~/.autobyteus/server-data`. Back it up first if preserving existing state matters.
- Build report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/done/custom-provider-model-context-metadata/electron-build-mac-report.md`.

DR-010 overwrote DR-009's same v1.4.46 filenames. Verify only against the DR-010 checksums above.

## Suggested User Verification

1. Back up `~/.autobyteus/server-data` if it contains important state.
2. Install/open the DMG. Use right-click **Open** or Privacy & Security approval if Gatekeeper blocks the non-notarized local build.
3. Open Qwen in Settings and confirm the three Qwen-served duplicate models use friendly names rather than `qwen:...` labels.
4. Open a live agent/team/application/member or binding model selector and confirm its option and selected text remain friendly.
5. Select a Qwen duplicate and confirm ordinary save/launch behavior remains correct; do not send credentials in the verification response.
6. Confirm any unavailable stored selector remains raw-visible and blocking rather than being renamed, cleared, or replaced.

An explicit completion/acceptance response is sufficient.

## Finalization State

- Explicit user acceptance: Received on 2026-08-10.
- Finalization refresh: Pass; `origin/personal` remained at `37660dd61347b630889a698769af5641566357bb`, ahead 18 / behind 0 before final delivery edits.
- Finalization smoke: Pass; friendly-Qwen web selection suite passed 4 files / 12 tests.
- Release target: `v1.4.47`, the next patch after `v1.4.46`.
- Ticket archival, branch push, target merge/push, tag publication, workflow verification, and cleanup are authorized and in progress.
- This artifact will be refreshed with exact commit, tag, workflow, and cleanup results after publication.

## Bounded Residual Risk

Real Alibaba availability, credentials, quota, region policy, TLS behavior, undocumented payload variation, and future vendor drift were not exercised. Additional bounded risks are the ordinary recent-`RUNNING` delay, arbitrary interruption, approved unreachable old-secret orphan and stale-selector outcomes, POSIX-only permission semantics, package-wide typecheck limitations, future base divergence, and Gatekeeper behavior for the local non-notarized package.
