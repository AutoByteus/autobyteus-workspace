# API/E2E Coverage Investigation — Ubuntu AppImage Conditional Sandbox

## Investigation meta and authority
- Round: 1; trigger: CRR-002 source-review Pass; prior API/E2E result: N/A (no prior record).
- Worktree: `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/ubuntu-appimage-sandbox-investigation`.
- Authority: `requirements-doc.md` (SR-001 approved SR-002), `investigation-notes.md`, `solution-revision-record.md` (SR-005), `design-spec.md`, `architecture-design-handoff-sr005.md`, `design-review-report.md` and `architecture-review-revision-record.md` (ARCH-REV-002 Pass), `implementation-handoff.md` and `implementation-revision-record.md` (IR-002), `code-review-report.md` and `code-review-revision-record.md` (CRR-002 Pass), and `evidence/implementation-local-checks-ir001.md` / `ir002.md`. All paths are under this ticket unless stated otherwise. Delivery revision: N/A. API revision record: pending first completed result.
- Classification: Medium / High; reviewed route. Successful result returns to Code Reviewer for proportional test-code review (or Not Applicable if no durable test changes).

## Approved behavior and changed boundaries
- BEH-001 / AC-001,003,004: no-flag GUI and embedded server startup on restricted Ubuntu; only exact early Chromium sandbox fatal with exit 133 and <=30 s permits a one-shot no-sandbox fallback, logged without writing host AppArmor/sysctl.
- BEH-002 / AC-002: direct and desktop entry converge; a sandbox-capable host retains **actual renderer isolation**, even if `unshare` probe is falsely negative/missing. Absence of `--no-sandbox` alone is insufficient.
- BEH-003 / AC-005: Node-mode and explicit argv preserved; real ELF remains usable.
- BEH-004 / AC-006: x64/ARM64 AppImage layout, updater metadata, and older-to-newer update/relaunch preserved.
- Changed surfaces: desktop package/build hook, shell/Chromium process launch, startup diagnostic and release workflow. No domain API, web-equivalent renderer behavior, auth, data schema, persisted-data transition, worker or distributed change. Approved persisted decision is Not Affected; no migration or compatibility-only coverage is justified. Existing user data must not be touched.
- The initial restricted-host release v1.4.78 abort and explicit-flag startup are diagnosis evidence, **not** proof of this implementation.

## Project instructions and environment
| Path | Instruction / discovery |
| --- | --- |
| `autobyteus-web/AGENTS.md` | Run one-shot tests; never `git add .`; release/tag is Delivery-owned. |
| `autobyteus-web/README.md` | `pnpm test:e2e:electron` can launch a package with isolated E2E port/data root; `--skip-build`, `--executable`, adapters. |
| `autobyteus-web/docs/github-actions-tag-build.md` | Native x64/ARM64 `pnpm build:electron:linux:{x64,arm64}`; workflow-dispatch build-only possible, no release without authorization. |
| `autobyteus-web/package.json`, `build/scripts/build.ts`, `.github/workflows/release-desktop.yml` | Build, focused test, artifact layout and updater metadata gates; x64 CI ubuntu-22.04, ARM64 ubuntu-24.04-arm. |
| `autobyteus-web/resources/server/AGENTS.md` | Server test rules; no server source changed. |
| `autobyteus-web/docs/electron_packaging.md` | Packaged Electron E2E isolation contract. |

- Host is Ubuntu 26.04 x64. Native `make`/`g++` absent from `/usr/bin`, but a pre-existing extracted local toolchain at `/tmp/autobyteus-local-toolchain-resolute/root/usr/bin` passes version checks; validate usable compile before relying on it. `sudo` is unavailable non-interactively. Worktree `autobyteus-web/node_modules` links to shared checkout; do not reset shared installs. Use isolated `AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE=e2e`, nondefault port and fresh E2E data root only. No secrets, account, production data, or browser development path are needed for shell policy. Do not disturb user's running app. ARM64 native runner/capable Ubuntu host/updater fixture availability must be investigated.

## Existing durable coverage inventory and decisions
| Path / scenario | Relevant IDs | Decision | Rationale / action |
| --- | --- | --- | --- |
| `autobyteus-web/scripts/test-appimage-launcher.mjs` (9 deterministic cases) | AC-001–003,005 | Still Valid | Stubbed positive, negative, missing, ambiguous probe, fatal gate, Node/argv, status, signal and hook behavior match SR-005; run it, but it bypasses package/Chromium. |
| `autobyteus-web/scripts/verify-linux-appimage-layout.mjs` | AC-002,005,006 | Needs Update | Assertions are valid, but real 535 MiB artifact extraction emits >1 MiB path list; `execFileSync` default captured stdout fails `ENOBUFS` before assertions. Suppress child stdout for extraction without masking stderr; rerun on new artifact. |
| `.github/workflows/release-desktop.yml` artifact/metadata and Node-server steps | AC-005,006 | Still Valid | CI checks both native architectures; workflow text alone is not a passing CI result. |
| `autobyteus-web/scripts/run-electron-e2e.mjs`, `tests/e2e/electron-launch-profile-probe.mjs` | AC-001,005 | Still Valid | Existing isolated desktop lifecycle harness; use if it works with actual AppImage executable, otherwise temporary shell-specific probe. |
| `autobyteus-web/electron/**/__tests__`, `electron/vitest.config.ts` | Regression | Still Valid | Broader Electron suite, indirect for package startup. |
| Browser/Nuxt component E2E probes | None | Out Of Scope | No web-equivalent UI behavior changed; browser cannot prove Chromium sandbox or AppImage packaging. |

No stale or compatibility-only test identified; no removal. No durable change planned initially: existing launcher and layout verification are requirement-aligned, while host-specific runtime and update tests need real artifacts/hosts; reassess if a repeatable assertion gap is found.

## Planned executable cases (ledger initialized separately)
| ID | Requirement | Surface / expected evidence |
| --- | --- | --- |
| AE-001 | AC-001–003,005 | Focused launcher 9/9, zero skip, production source and fixture distinction. |
| AE-002 | AC-001–006 | Build native x64; verify layout and updater metadata; retain build log. |
| AE-003 | AC-001,003,004 | New x64 AppImage direct and desktop-equivalent no-flag launch on restricted Ubuntu 26.04; GUI/server readiness, one retry, diagnostic, host-policy before/after. |
| AE-004 | AC-005 | New package Node mode/argv, real ELF `process.execPath`/server behavior. |
| AE-005 | AC-002 | Capable host direct/desktop and actual renderer sandbox state, including false-negative probe if feasible. |
| AE-006 | AC-006 | Native ARM64 artifact/layout/metadata and packaged smoke. |
| AE-007 | AC-006 | Older-to-newer updater download, install and relaunch against isolated state. |
| AE-008 | Regression | Electron unit suite and build/Electron TypeScript checks after narrow checks. |

Repository order: AE-001 then TypeScript/shell checks and AE-008; AE-002 artifact build/verification; broader AE-003–007. For long builds record ledger checkpoints. Temporary probes only for host policy, renderer process state and update journey; they are not durable because they require external distro/architecture/release matrix. Broader validation is **Required**: focused tests mock actual ELF and packaging, while every critical acceptance criterion demands packaged and/or cross-host proof. Browser path is not selected because the changed boundary is Electron package/process security, not web UI.

## Pre-execution assessment
- Post-repository scorecard: pending actual rerun. Provisional risk is critical in requirement proof, directness, integration, host fidelity and shell confidence until new package/host evidence exists; no Pass can be inferred from CRR-002 or existing v1.4.78 logs.
- Safe setup: use local toolchain only if verified, build into worktree's `electron-dist`, isolate process/data root, capture logs and policy values. Do not trigger tag/publish. If artifact/hosts/updater cannot safely be provided or emulated, record exact dependency and leave those cases unproven.
- Proceed to execution: Yes. Reroute before execution: No. Latest investigation will be updated after execution and any changed validity decision.

## Evidence-driven coverage decision update — 2026-09-24T11:46Z
Native x64 build succeeded using the pre-existing extracted toolchain (not system `make`/`g++`). New artifact SHA-256 and numeric blockMapSize metadata are in `evidence/api-rev-001/x64-artifact-checks.log`. The durable layout verifier failed with `ENOBUFS` because `--appimage-extract` produces >1 MiB stdout, not because the artifact failed an assertion. This is an API/E2E-owned `Local Fix` to the verification harness. Make the narrow stdout-handling correction before rerunning AE-002; no production launcher or policy change.

## Post-repository execution and confidence (after AE-001, AE-008, AE-002)
| Order | Command / configuration | Result | Evidence |
| --- | --- | --- | --- |
| 1 | `node --test autobyteus-web/scripts/test-appimage-launcher.mjs` | Pass 9/9, zero skip | `evidence/api-rev-001/launcher-suite.log` |
| 2 | `bash -n`, `corepack pnpm --dir autobyteus-web transpile-build`, `transpile-electron`, `test:electron --run` | Pass; Electron 152 pass, 1 skipped | `evidence/api-rev-001/{shell-check,transpile-build,transpile-electron,electron-suite}.log` |
| 3 | Native x64 `pnpm --dir autobyteus-web build:electron:linux:x64` with extracted local GCC/make and temporary pnpm shim | Pass; 535 MiB x64 AppImage | `evidence/api-rev-001/x64-build-retry.log` |
| 4 | Linux metadata validator and `verify-linux-appimage-layout.mjs` on new x64 artifact | Pass after narrow verifier stdout fix | `evidence/api-rev-001/{x64-artifact-checks,x64-layout-recheck}.log` |

Initial build attempt failed `spawn pnpm ENOENT` from missing CLI PATH, corrected with an owned shim; no code defect. Initial layout checker failed `ENOBUFS` from capturing extraction path output; test-harness stdout handling was updated and the actual artifact passed. Durable coverage **updated**: `autobyteus-web/scripts/verify-linux-appimage-layout.mjs`, suppress extraction stdout while retaining stderr, assertions and 120 s timeout. No test removed.

| Category | Post-repository score | Basis and gap |
| --- | ---: | --- |
| Requirement/AC proof | 50% | Critical AC-002/006 still missing, despite x64 layout/metadata and stub launch paths. |
| Changed-boundary directness | 75% | Real x64 package built/inspected; startup policy still stubbed. |
| Cross-boundary realism/mock gap | 65% | Hook/package real; actual Chromium/embedded server and update not run. |
| Environment/config/fixture fidelity | 50% | Native restricted Ubuntu x64 and release-flavor build, but required capable/ARM64 hosts and staged newer feed absent. |
| Failure/edge/lifecycle/recovery | 75% | Deterministic fatal/status/signal stubs; no actual fallback or relaunch. |
| User-surface/desktop-shell | 65% | Real package layout, no GUI or renderer process observation. Browser is inapplicable to this shell-specific policy. |
| Durable regression quality | 90% | Focused nine cases and layout checker, but host security/update remain externally dependent. |

Overall post-repository confidence: **67.1%** (simple mean of 7 categories). Critical AC directly proven: No. Applicable categories <90: six. Default clean target: No. Broader validation: **Required**, selected project desktop/lifecycle/CLI, not browser. Expected gain: actual restricted-host GUI/server/fallback/diagnostic and Node behavior; capable-host renderer, native ARM64 and older-to-newer updater still require appropriate external targets. No live API or web UI can substitute for actual Chromium sandbox state.

## Latest investigation status after broader attempts
- AE-003/004 supplied real restricted Ubuntu 26.04 x64 GUI/server/fallback/Node evidence; no browser-dev test was needed. Both direct and desktop-marker first windows were obtained via the project Electron Playwright adapter, and the explicit marker probe captured exact fatal → one retry and warning. Host policy values were unchanged.
- **Broader-validation decision now: Blocked for completion** after the available safe project desktop/CLI path. AE-005 actual sandbox-preserving renderer state needs a namespace-capable host; this Ubuntu 26.04 host returns EPERM and host policy must not be changed. AE-006 needs a native ARM64 runner/host; local machine is x86_64 with no ARM64 emulator/container. AE-007 needs an authorized staged newer-version update feed; old and new local AppImages are both 1.4.78. These are not validly replaceable by stubbed tests or the passing x64 metadata file.
- Final confidence and latest authoritative result are in `api-e2e-execution-coverage-report.md`: **Blocked / 70.0%**. Durable test-code delta remains the stdout handling in `autobyteus-web/scripts/verify-linux-appimage-layout.mjs`; no production source changed in this round. No unresolved requirement ambiguity or design-impact finding was found; the missing evidence is environmental/release-matrix access.
