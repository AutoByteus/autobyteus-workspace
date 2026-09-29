# Implementation Revision Record

The current code (both repositories) and `implementation-handoff.md` remain authoritative. This record holds the initial baseline and later implementation deltas.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `/architecture_reviewer` ARCH-REV-003 Pass → implementation round 1 | N/A | `Initial Baseline` (handoff classified `Design Impact`, see entry) | SR-009, SR-010 (+ two evidence-only clarifications), ARCH-REV-003; CRR/API-REV/DR N/A | Complete implementation in both repos. One design gap: installed apps that predate this change are not isolated (IMP-DI-001) |
| IR-002 | `/architecture_reviewer` ARCH-REV-005 Pass (SR-011/SR-012 resolve IMP-DI-001) → implementation round 2 | IMP-DI-001, ARCH-DR-005 | `Design Impact` resolution | SR-011, SR-012 (+ user decisions 2026-09-29: macOS-only validation, Linux sandbox is the user's), ARCH-REV-005; CRR/API-REV/DR N/A | Isolated-launch marker + fail-closed gate + packed-AppImage refusal; installed beta.5 refused, worktree build isolated |

## Revision Entries

### IR-001 — Initial implementation: isolated server env, disabled updates, lifecycle CLI, browser-automation attach-only/helper/recording, docs and skills

- Triggering role, report path, and round: `/architecture_reviewer`, `design-review-report.md` (ARCH-REV-003 Pass), implementation round 1.
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`. The handoff outcome is `Design Impact` for IMP-DI-001 only; everything else is implemented as designed.
- Prior authoritative result: N/A.
- Current authoritative result: workspace branch `codex/agent-isolated-app-recording` commits `6aa97db7f`, `6c05a961e`, `73fdd20fd`, `0d7ebe672`, `6f8183138`. mcps branch `codex/agent-isolated-app-recording` (worktree `/Users/normy/autobyteus_org/autobyteus_mcps-agent-isolated-app-recording`) commits `8d3198d`, `3f83b8a`, `038d1b5`, `99cc81e`, `9b7448c`.
- Related solution revision IDs: SR-009, SR-010, plus two evidence-only clarifications (skill-first validation channel; helper hit-testing / `OBSCURED`).
- Related architecture-review revision IDs: ARCH-REV-003.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: first implementation of the SR-009/SR-010 design.
- Approved behavior or requirement IDs affected: BEH-001..BEH-009; REQ-001..REQ-011, REQ-013..REQ-015.
- Implementation delta: see `implementation-handoff.md` §Reviewed Behavior Implementation Trace and §Key Files.
- Changed files or areas: workspace `autobyteus-web/electron/{server,updater,application}`, `shared/appUpdateTypes.ts`, `stores/appUpdateStore.ts`, `components/settings/AboutSettingsManager.vue`, localization, `scripts/electron-launch/` (new, extracted), `scripts/electron-e2e/` (imports), `scripts/isolated-app/` (new), root `package.json`, docs, `skills/autobyteus-isolated-app/`. mcps: `browser-automation/src/browser_automation/{runtime,script.py,application.py,cli.py,contracts.py,errors.py,presentation/,recording/,mcp/tools/}`, tests, `pyproject.toml`, README/SKILL.md, repo README, `docs/mcp-to-cli-mapping.md`.
- Local validation and result: see handoff §Local Implementation Checks Run. All targeted suites pass; live checks on the installed app with a scrubbed environment and on a worktree build pass.
- Next recipient or routing: `get_handoff_rules` → Design Impact recipient (IMP-DI-001).
- Remaining limitations or risks: IMP-DI-001; flaky unrelated Electron vitest specs; Linux and occluded-window recording are not validated here.

### IR-002 — Fail closed on the isolated-launch capability marker (IMP-DI-001)

- Triggering role, report path, and round: `/architecture_reviewer`, `design-review-report.md` (ARCH-REV-005 Pass on SR-012), implementation round 2.
- Triggering finding IDs: IMP-DI-001 (IR-001), ARCH-DR-005 (AppImage branch, resolved in SR-012).
- Classification: `Design Impact` resolution (design decision option B).
- Prior authoritative result: IR-001. The default `start` launched any installed build; pre-change builds leaked production settings (documented only).
- Current authoritative result: workspace commit `b28eef80b`; the mcps branch is unchanged (`9b7448c`).
- Related solution revision IDs: SR-011, SR-012; user decisions 2026-09-29 (macOS-only validation; Linux Chromium sandbox handling is the user's, never `--no-sandbox`).
- Related architecture-review revision IDs: ARCH-REV-004, ARCH-REV-005.
- Related code-review / API-E2E / delivery revision IDs: N/A.
- Why recorded: resolves IMP-DI-001 so REQ-002/QR-003 hold on every lifecycle path.
- Approved behavior or requirement IDs affected: BEH-001, BEH-003, BEH-009; REQ-001, REQ-002, REQ-010, REQ-011; AC-001, AC-002, AC-009.
- Implementation delta:
  - `autobyteus-web/build/isolated-launch/isolated-launch.json` (`{"isolatedLaunchContract": 1}`), shipped through a new `build/scripts/isolatedLaunchMarker.ts` constant in `build.ts` `extraResources` → `<resources>/isolated-launch.json`.
  - `scripts/electron-launch/appExecutable.mjs`: `resourcesDirForExecutable`, `isPackedAppImage` (suffix or `AI\x02` at offset 8 after the ELF magic; header read only), `readIsolatedLaunchContract` (throws `AppImageExtractionRequiredError` or `AppIsolationUnsupportedError`), `REQUIRED_ISOLATED_LAUNCH_CONTRACT = 1`.
  - `scripts/isolated-app/instanceLifecycle.mjs`: `start` order is now validate args → build → resolve executable → **gate** → control port → server port → data root → spawn. `restart` gates before stopping the running instance. Codes: `APP_ISOLATION_UNSUPPORTED` exit 3 (details `executablePath`), `APPIMAGE_EXTRACTION_REQUIRED` exit 2. `resolveExplicitExecutable` and the E2E harness are unchanged.
  - Docs: guide "Isolated-launch support" box replaces "App version"; the prerequisite changes; troubleshooting entries for both codes; the stale "production agents" row is removed; new "Linux" section (AppImage extraction; sandbox remedies are the user's decision). Skill and packaging doc updated.
- Changed files or areas: listed above, plus tests `scripts/electron-launch/__tests__/appExecutable.node-test.mjs`, `scripts/isolated-app/__tests__/instanceLifecycle.node-test.mjs`, `tests/integration/isolated-launch-marker.integration.test.ts`.
- Local validation and result:
  - node tests 55/55; electron server/updater vitest 103/103; build `tsc` OK.
  - Marker packaging test 4/4 on the rebuilt macOS bundle. It failed as expected on the pre-marker build.
  - Live from an unscrubbed agent shell: installed **1.4.91-beta.5** → `APP_ISOLATION_UNSUPPORTED` exit 3, nothing launched, no root created. Worktree build → started isolated (only Electron-owned server vars, 0 production files open, control port `127.0.0.1` only); restart keeps `ownsDataRoot`; stop removes the root and frees the ports.
- Next recipient or routing: `get_handoff_rules` → source review (Large/High).
- Remaining limitations or risks: Linux (AppImage marker inside the image, extracted-layout launch, sandbox) is not validated, per the user decision (macOS-only). The rebuild's final zip step was interrupted (7za exit 255 during a session pause); the `.app`/DMG were produced, and the zip is not needed for validation.
