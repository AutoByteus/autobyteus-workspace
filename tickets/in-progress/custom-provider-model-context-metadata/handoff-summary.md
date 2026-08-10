# Handoff Summary — Custom Provider Model Context Metadata

## Status

**Ready for hands-on user verification.** The SR-016 readable-identity package is integrated with the latest tracked personal base, passed current source/API/E2E/browser validation, has synchronized durable documentation, and was rebuilt as a verified macOS arm64 Electron 1.4.45 package. Repository finalization remains held until explicit user acceptance.

## Worktree / Branch / Target

- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata
- Ticket branch: codex/custom-provider-model-context-metadata
- Finalization target: personal / origin/personal
- Latest tracked base: origin/personal@3cddeec6b93602da172fec2e7b9a80acc7c05117
- Integrated implementation merge: ea8dbfd2d4f78312806bee7a41f38daa6a0e9a06
- Protected reviewed/build checkpoint: 7f02e49f6897b3c2715d2c7e2fb712a424514f82
- Fresh divergence before delivery-only docs/reports: ahead 14 / behind 0
- Base ancestor check after build: passed
- Integrated-state evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/delivery-integrated-state-refresh.log

## Current Authorization

- Architecture: ARCH-REV-010 Pass.
- Implementation: IR-012.
- Source review: CRR-016 Pass, 9.40/10; CR-005 resolved.
- API/E2E: API-REV-008 Pass, 96.9%; required broader validation completed.
- Durable-test determination: CRR-017 Not Applicable; API-REV-008 changed no repository-resident durable coverage.
- Unresolved findings: none.

## Delivered Behavior

### Readable custom-provider identity

- New custom OpenAI-compatible providers receive an immutable provider_<name-derived-body> ID from the normalized user-entered name.
- ASCII words remain readable; non-ASCII code points use deterministic u<hex> tokens.
- Browser input remains name, Base URL, and key only. Invalid derivation and canonical-name/ID collisions fail atomically without a UUID, counter, suffix, provider record, or readable-ID secret.
- Model identifiers remain exact openai-compatible:<providerId>:<modelValue> values.

### Legacy reset and selector transition

- V1 inline credentials are discarded rather than saved. Valid V1 stages only secretless V2 metadata.
- The final required readable migration waits for the five exact prior selector/name-snapshot writers.
- Valid V2 names derive transient old-to-readable prefixes. Only exact allowlisted agent/team defaults, bindings, application launch profiles, resumable metadata, and improver-session selectors are attempted; model suffix bytes remain unchanged.
- Empty V3 is atomically published after selector attempts and is the reset commit.
- Old UUID vault consumers are removal-only after the commit. Values are never resolved, copied, re-encrypted, aliased, or used as fallback.
- Invalid/colliding data and individual unsafe/read-only/concurrently changed selector targets retain sanitized warnings; stale selectors remain for manual reselection.
- Startup proceeds only when the readable migration is SUCCEEDED or SUCCEEDED_WITH_WARNINGS.

### User recreation and missing selections

- No old provider record, Base URL, credential, custom catalog group, reconnect state, or UUID alias survives reset.
- Users recreate desired providers through New Provider and supply name, Base URL, and a new key.
- Reusing the same canonical name restores the readable selector prefix when the exact model suffix is advertised.
- Different names or unavailable model suffixes require manual reselection.
- Missing selectors stay raw-visible and unavailable and block launch/resume instead of clearing or falling back.

### Retained Qwen and metadata behavior

- Qwen Settings saves a probed Base URL/key pair through strict AppConfig/vault ownership; existing file mode survives a restrictive POSIX umask.
- Exact configured/default status and compensation boundaries remain value-free.
- Current exact Qwen models remain qwen3.8-max, qwen:deepseek-v4-pro, and qwen:glm-5.2; preview remains absent.
- Custom model numeric metadata remains advertised value -> exact built-in value -> unknown, with no URL/alias/fuzzy inference.

## Validation Summary

API-REV-008 passed:

- AppConfig: 1 file / 27 tests.
- Core identity/metadata/Qwen: 5 files / 24 tests; opt-in live file 4 tests skipped.
- Server migration/store/service/GraphQL/gate: 12 files / 91 tests; one platform skip.
- Critical durable E2E: 4 files / 12 tests.
- Focused web: 6 files / 33 tests.
- Server and web production builds plus boundary/localization guards.
- Real Chrome -> Nuxt -> built backend -> loopback Qwen Settings journey, including restrictive umask/mode preservation and narrow layout.
- Integrity, generated-secret absence, process/runtime cleanup, and evidence scans.

Delivery then completed the full README-guided Electron pipeline and artifact verification on the protected integrated state.

## Durable Documentation

Docs sync: Updated / Pass.

Updated:

- autobyteus-ts/docs/llm_module_design.md
- autobyteus-ts/docs/llm_module_design_nodejs.md
- autobyteus-server-ts/docs/modules/llm_management.md
- autobyteus-server-ts/docs/modules/secret_management.md
- autobyteus-web/docs/settings.md

Report: /Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/docs-sync-report.md

## Electron Test Artifact

- Recommended DMG: /Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.45.dmg
- SHA-256: afbe2e992e082a00a79095f7d589c9219ea8c522594df9cb393a50ff78f1e5d6
- ZIP: /Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.45.zip
- ZIP SHA-256: 5f53b1e8e0e4cc80f8bb13ca73d2ded5080589005b5c5b470eb31dd730f91eaf
- Build posture: local macOS arm64; no Developer ID/team signature and no notarization; root executable carries only an ad-hoc linker signature.
- App data: ~/.autobyteus/server-data. Back it up first if preserving existing state matters.
- Build report: /Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/electron-build-mac-report.md

The DR-007 build overwrote the same 1.4.45 filenames used by DR-005. Verify against the DR-007 checksums above.

## Suggested User Verification

1. Back up ~/.autobyteus/server-data if it contains important state.
2. Install/open the DMG. Use right-click Open or Privacy & Security approval if Gatekeeper blocks the non-notarized local build.
3. If legacy custom providers exist, confirm startup finishes and provider records are reset rather than silently carrying old credentials.
4. Recreate a provider through Settings -> API Key Management -> New Provider using the same name, Base URL, and a new key.
5. Confirm its readable provider ID and models return, and an exact migrated selector becomes usable only when its model suffix exists.
6. Confirm any still-missing selector remains visible as unavailable and blocks rather than clearing or selecting a fallback.
7. Confirm Qwen Base URL/key save and restart behavior remains correct.

Do not send credentials in the verification reply. An explicit completion/acceptance response is sufficient.

## Finalization State

- Ticket remains in tickets/in-progress.
- Ticket branch push: not started.
- Merge into personal: not started.
- Version/tag/release/deployment: not started.
- Archive and worktree/branch cleanup: not started.
- Next action after acceptance: refresh origin/personal again; if user-facing state remains unchanged, complete finalization in the documented order.

## Bounded Residual Risk

Real Alibaba availability, credentials, quota, region policy, TLS behavior, undocumented payload variation, and future vendor drift were not exercised. Additional bounded risks are the ordinary recent-RUNNING delay, arbitrary interruption, approved unreachable old-secret orphan and stale-selector outcomes, POSIX-only permission semantics, possible future base divergence, package-wide typecheck configuration limitations, and Gatekeeper behavior for the local non-notarized package.
