# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/ryan-zheng/autobyteus-org/autobyteus-workspace-intel-terminal-prompt-hang/tickets/intel-mac-terminal-prompt-hang/requirements.md`
- Investigation Notes: `/Users/ryan-zheng/autobyteus-org/autobyteus-workspace-intel-terminal-prompt-hang/tickets/intel-mac-terminal-prompt-hang/investigation-notes.md`
- Design Spec: `/Users/ryan-zheng/autobyteus-org/autobyteus-workspace-intel-terminal-prompt-hang/tickets/intel-mac-terminal-prompt-hang/design-spec.md`
- Design Review Report: `/Users/ryan-zheng/autobyteus-org/autobyteus-workspace-intel-terminal-prompt-hang/tickets/intel-mac-terminal-prompt-hang/design-review-report.md`
- Implementation Handoff: `/Users/ryan-zheng/autobyteus-org/autobyteus-workspace-intel-terminal-prompt-hang/tickets/intel-mac-terminal-prompt-hang/implementation-handoff.md`
- Code Review Report: `/Users/ryan-zheng/autobyteus-org/autobyteus-workspace-intel-terminal-prompt-hang/tickets/intel-mac-terminal-prompt-hang/code-review-report.md`
- Implementation Local Fix Handoff: `/Users/ryan-zheng/autobyteus-org/autobyteus-workspace-intel-terminal-prompt-hang/tickets/intel-mac-terminal-prompt-hang/implementation-local-fix-handoff.md`
- Current Investigation Round: 2
- Trigger: Code-review pass for refreshed Intel macOS packaged Terminal prompt hang implementation, received 2026-06-18.
- Prior Investigation Reviewed: Round 1 investigation and Round 1 execution failure were reviewed after code-reviewed Local Fix.
- Latest Authoritative Investigation: Round 2

## Current Requirement And Design Basis

The approved current behavior to prove is:

- Packaged Intel macOS must ship an executable `node-pty/prebuilds/darwin-x64/spawn-helper`.
- Runtime helper repair must target the helper adjacent to the native module that `node-pty` actually selects, not the first helper found by static directory order.
- Release validation must fail a package whose selected macOS helper is missing, wrong-architecture, or non-executable; it must cover staged `autobyteus-web/resources/server` and final `.app/Contents/Resources/server`, and run a spawn probe when host-compatible.
- Backend terminal startup failures must include actionable selected-helper diagnostics and send a typed terminal error frame before closing with `1011`; the frontend must preserve/display the server-sent diagnostic rather than replacing it with a generic websocket error.
- Full packaged Intel runtime validation remains required beyond source/unit checks: build fresh x64 package, validate static package state, validate packaged server websocket/API prompt output, and open Terminal in the packaged UI.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean: no backward-compatibility mechanisms were introduced, old static-first helper selection is no longer the primary runtime policy, and fallback search is current-arch-first only when node-pty selected resolution cannot be loaded.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Runtime node-pty helper resolution in `autobyteus-ts` | Changed | REQ-002, AC-003; design `DS-004`; code review summary says selected-helper repair is owned by `node-pty-bootstrap.ts`. | Existing unit/integration coverage is valid and should be executed; packaged runtime probe should additionally prove real x64 selected helper can spawn. |
| macOS package server-resource helper permissions | Changed | REQ-001, REQ-003; design `DS-002`; implementation handoff says prepare/afterPack normalize helper modes. | Existing release-validator script/workflow coverage is valid; final execution must build a fresh x64 app and run the validator against staged and final server roots. |
| Terminal startup failure protocol and frontend error preservation | Changed | REQ-004, AC-004; design `DS-003`; implementation handoff and code review identify backend error frame plus frontend preservation. | Existing backend handler and frontend composable tests are valid; final execution should run them and, where feasible, fixture/force a startup failure path. |
| Existing terminal websocket lifecycle | Preserved | REQ/AC require normal terminal behavior to keep working after the fix. | Existing backend E2E remains valid and should be executed. |
| Packaged UI Terminal tab path | Changed/Preserved | AC-001 requires user-visible packaged Terminal prompt/output. | No durable packaged UI harness exists; use temporary Playwright/Electron or manual-equivalent executable probe against fresh app. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/tools/terminal/node-pty-bootstrap.test.ts` | `ensureFileIsExecutable` chmods helpers and resolver uses node-pty selected native dir instead of stale build helper. | REQ-002, AC-003, DS-004. | Still Valid | Directly covers selected-helper invariant and non-executable helper repair. | Execute in final validation. |
| `autobyteus-ts/tests/unit/tools/terminal/isolated-pty-session.test.ts` | Isolated PTY startup waits for bootstrap repair, handles close/start races, write/resize/read/close lifecycle. | DS-004 lifecycle correctness. | Still Valid | Still asserts current startup/lifecycle behavior and race safety. | Execute in final validation. |
| `autobyteus-ts/tests/integration/tools/terminal/isolated-pty-session.test.ts` | Real isolated PTY repairs a non-executable `node-pty` helper before starting bridge. | REQ-002, AC-003, DS-004. | Still Valid | Covers real dependency mutation/repair path on host-compatible Intel macOS dev install. | Execute in final validation. |
| `autobyteus-server-ts/tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts` | Real terminal websocket opens PTY in requested cwd/default home, rejects invalid cwd, and releases sessions under churn. | AC-001 supporting backend behavior; DS-001. | Still Valid | Current behavior still requires real PTY websocket output and cleanup. | Execute in final validation. |
| `autobyteus-server-ts/tests/unit/services/terminal/terminal-handler.test.ts` | Parses/encodes terminal messages, writes/resizes, connects/disconnects, sends startup error frame and 1011 close reason. | REQ-004, AC-004, DS-003. | Still Valid | Directly covers backend visible-error behavior for failed startup. | Execute in final validation. |
| `autobyteus-web/composables/__tests__/useTerminalSession.spec.ts` | Websocket URL/session behavior, UTF-8 input/output, server startup error preservation, close reason fallback. | REQ-004, AC-004, DS-003. | Still Valid | Covers frontend preservation of backend diagnostic and normal terminal stream handling. | Execute in final validation. |
| `autobyteus-web/components/workspace/tools/__tests__/Terminal.spec.ts` | Terminal component connects from workspace metadata, server-home default, explicit target, target switching, font/refit behavior. | DS-001 UI terminal surface. | Still Valid | Exercises component connection behavior but not a real packaged app. | Execute in final validation; augment with temporary packaged UI probe. |
| `autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs` | CLI validates package node-pty helper presence, executable bit, architecture, selected-helper path, and host-compatible spawn probe. | REQ-001, REQ-003, AC-002, AC-003. | Still Valid | It is the durable package boundary guard required by the design. | Execute against staged and built app server roots after fresh x64 package build. |
| `.github/workflows/release-desktop.yml` macOS package-validator steps | CI invokes the package runtime validator for staged resources and final `.app` server; app-binary spawn probe when host-compatible. | REQ-003. | Still Valid | Workflow wiring is part of durable release coverage. | Static review already passed; final execution will validate analogous local commands. |
| `autobyteus-web/scripts/prepare-server.sh`, `prepare-server.mjs`, `build/scripts/afterPack.ts` | Package prep and afterPack normalize node-pty `spawn-helper` execute bits. | REQ-001, DS-002. | Still Valid executable coverage by build/package flow | These are not test files but are executable package lifecycle hooks. | Exercise by fresh x64 package build; inspect resulting helper modes. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None | N/A | No relevant existing durable coverage was found that asserts obsolete static-first helper selection or silent terminal startup close. | Requirements/design reject static-first helper authority and silent close; existing changed tests now assert selected-helper/error behavior. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None | N/A | Existing durable unit/E2E/package-validator coverage is adequate for repository-resident coverage in this stage. | N/A | Remaining proof requires fresh package and local host-compatible runtime execution, best kept as temporary executable validation because packaged app paths and local installed-app state are environment-specific. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | No repository-resident durable coverage update is planned before final execution. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| PKG-001 | Build fresh macOS x64 Electron package with Python 3.11 if needed for `node-gyp`/electron-rebuild. | End-to-end packaging hooks run and produce x64 `.app`/DMG/zip. | Build outputs are local/environment-heavy; release workflow already owns durable CI build coverage. |
| PKG-002 | Run `verify-packaged-terminal-runtime.mjs --platform darwin --arch x64` against `autobyteus-web/resources/server` and built `.app/Contents/Resources/server`; run `--spawn-probe` when host-compatible. | Staged and final server roots contain executable selected x64 helper and can spawn through node-pty. | The durable validator script remains in repo; local execution evidence belongs in report. |
| PKG-003 | Temporary packaged-server websocket/API probe launching built app binary as Node on an alternate port with isolated data dir. | `/rest/health` is OK and `/ws/terminal/:sessionId` receives initial shell output/prompt instead of empty `1011` close. | Environment-specific harness should not be committed; it targets this local package artifact. |
| UI-001 | Packaged UI probe/manual-equivalent automation opening the fresh x64 `.app`, navigating/opening Terminal, and observing prompt/output or error surface. | User-visible Terminal tab in packaged app reaches prompt/output. | Requires local desktop app launch and fixed port `29695`; durable coverage would be brittle without a project-owned desktop E2E framework. |
| ERR-001 | Existing backend/frontend forced startup error tests plus, if feasible, temporary fixture/probe forcing package/node-pty startup failure. | Startup failures show backend diagnostics in frontend state rather than generic websocket error. | Durable forced-error coverage already exists in unit/composable tests; packaged forced-failure mutation would be destructive to local artifact and should remain temporary if attempted. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Apple Silicon packaged runtime on actual arm64 hardware | Current validation host is Intel/x86_64 macOS. Static arm64 helper validation may be possible if arm64 helper is present; host-compatible spawn probe cannot run. | Low/Medium; release workflow includes arm64 job and host-compatible gating. | Record as not locally executed; CI/release arm64 job remains required outside this Intel host. |
| Signed/notarized production artifact behavior | Local build can be unsigned if Apple signing env is unavailable. | Low for this fix; helper chmod happens before signing and validator inspects final local app. | Delivery/release should run signed CI pipeline before publishing. |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None currently identified. | N/A | Upstream requirements/design/implementation/review agree on selected-helper invariant and error propagation. | N/A |

## Round 2 Resumption Addendum

After Round 1 failed PKG-001, implementation added and code review passed a Local Fix that cleans `autobyteus-ts/dist` before `autobyteus-ts` builds. This removes stale ignored CLI/TUI output from runtime dependency verification without adding legacy `ink` or `react` dependencies. The Local Fix does not change terminal runtime, server websocket, frontend terminal, package validator, or package chmod behavior.

Coverage decisions from Round 1 remain authoritative: no stale durable terminal coverage was found, no repository-resident durable API/E2E coverage changes are required in this API/E2E stage, and execution should resume by rechecking PKG-001 first, then running PKG-002, PKG-003, UI-001, and ERR-001 evidence as feasible against the fresh package artifact.

## Execution Plan

1. Execute current valid durable terminal/package-related tests: `autobyteus-ts` unit/integration terminal tests, `autobyteus-server-ts` terminal unit/E2E tests, and `autobyteus-web` terminal composable/component tests.
2. Build a fresh macOS x64 packaged app locally. If the default Python lacks `distutils`, set `PYTHON=/usr/local/bin/python3.11 npm_config_python=/usr/local/bin/python3.11` for electron-rebuild.
3. Run packaged terminal runtime validator against staged `autobyteus-web/resources/server` and built `.app/Contents/Resources/server`, including host-compatible `--spawn-probe` where possible.
4. Inspect final packaged `node-pty` helper modes/architectures and selected-helper diagnostics.
5. Run a temporary packaged-server websocket/API probe against the fresh built app binary on an alternate port to prove health and initial terminal prompt/output.
6. Run packaged UI validation opening the Terminal tab in the fresh x64 app. Temporarily stop and restore the installed `/Applications/AutoByteus.app` only if the fixed port `29695` is occupied and UI validation cannot otherwise run.
7. Write the execution coverage report with evidence paths and route to `delivery_engineer` if no repository-resident durable coverage changed, or back to `code_reviewer` if durable coverage is changed.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing durable coverage is current and adequate. Final API/E2E work should focus on executing valid durable tests plus local packaged runtime/UI probes. This artifact was created before final test execution or durable coverage edits.
