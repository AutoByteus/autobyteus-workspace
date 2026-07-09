# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/home/autobyteus/workspace/autobyteus-workspace-fix-vnc-browser-bridge-recursion/.codex/tasks/fix-vnc-browser-bridge-recursion/requirements.md`
- Investigation Notes: `/home/autobyteus/workspace/autobyteus-workspace-fix-vnc-browser-bridge-recursion/.codex/tasks/fix-vnc-browser-bridge-recursion/investigation-notes.md`
- Design Spec: `/home/autobyteus/workspace/autobyteus-workspace-fix-vnc-browser-bridge-recursion/.codex/tasks/fix-vnc-browser-bridge-recursion/design-spec.md`
- Design Review Report: `/home/autobyteus/workspace/autobyteus-workspace-fix-vnc-browser-bridge-recursion/.codex/tasks/fix-vnc-browser-bridge-recursion/design-review-report.md`
- Implementation Handoff: `/home/autobyteus/workspace/autobyteus-workspace-fix-vnc-browser-bridge-recursion/.codex/tasks/fix-vnc-browser-bridge-recursion/implementation-handoff.md`
- Code Review Report: `/home/autobyteus/workspace/autobyteus-workspace-fix-vnc-browser-bridge-recursion/.codex/tasks/fix-vnc-browser-bridge-recursion/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review-passed handoff to API/E2E for the durable server Docker browser bridge recursion fix.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The reviewed requirement is to make the server Docker browser bridge durable and recursion-safe while preserving the root-side URL-opening experience. The source Docker layer copies `autobyteus-server-ts/docker/open-vnc-browser-url.sh` to `/usr/local/bin/open-vnc-browser-url.sh`, copies `xdg-open-root-bridge.sh` to `/usr/local/bin/xdg-open`, copies `exo-open-root-bridge.sh` to `/usr/local/bin/exo-open`, and sets `BROWSER=/usr/local/bin/open-vnc-browser-url.sh`. The server process runs as root; the browser/XFCE/DBus/VNC desktop session runs as `vncuser`.

The current required behavior is:

- Root calls to the opener must still switch once to `vncuser` with `DISPLAY=:99`, `XAUTHORITY=/home/vncuser/.Xauthority`, `XDG_RUNTIME_DIR=/run/user/1000`, and `DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus`.
- Already-`vncuser` calls must not call `runuser` again.
- Only root may use `runuser -u vncuser`.
- The post-switch desktop opener environment must include `BROWSER=` and must invoke `/usr/bin/xdg-open`, not unqualified `xdg-open` or `/usr/local/bin/xdg-open`.
- Unsupported non-root/non-`vncuser` callers must fail explicitly.
- The root wrappers must remain thin facades: root callers delegate to the opener; non-root callers pass through to the system openers.
- The fix is generic across default/latest and `zh` server image variants because the Dockerfile copies the same script for both base tags.

The implementation handoff's `Legacy / Compatibility Removal Check` was reviewed. It reports no compatibility mechanisms, no retained old behavior, and clean removal of the old unconditional `runuser` path. The code review report independently confirmed no remaining old unconditional branch, no inherited `BROWSER` post-switch behavior, and no unqualified opener lookup in the bridge.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `open-vnc-browser-url.sh` root invocation | Changed | R-001, R-003, AC-002, design DS-001/DS-003, implementation handoff | Durable coverage should prove root branch calls `runuser -u vncuser -- env ... BROWSER= /usr/bin/xdg-open <url>` exactly once. |
| `open-vnc-browser-url.sh` already-`vncuser` invocation | Added/Changed | R-002, AC-003, design uid branch guidance | Durable coverage should prove the already-`vncuser` branch skips `runuser`, clears `BROWSER`, and invokes the desktop opener command. |
| Inherited browser selection after crossing to `vncuser` | Removed | R-004, R-005, AC-002, design removal plan | Durable coverage should assert `BROWSER=` and `/usr/bin/xdg-open`; static/source-equivalent checks should guard against recursive `$BROWSER` and `/usr/local/bin/xdg-open` re-entry. |
| Unsupported non-root/non-`vncuser` uid behavior | Added | R-006, implementation handoff | Durable coverage should prove explicit failure and no opener/runuser dispatch. |
| Root wrapper behavior for `/usr/local/bin/xdg-open` and `/usr/local/bin/exo-open` | Preserved | R-007, AC-005, AC-006, design DS-002 | Durable coverage should prove root delegation and non-root pass-through remain intact using source-equivalent wrappers. |
| Dockerfile copy/env bridge injection | Preserved | R-008, Dockerfile.monorepo source, code review scope | Durable coverage should inspect Dockerfile copy destinations, chmod targets, and `ENV BROWSER` to prove default/latest and zh builds consume the same source script. |
| `browser-docker` ownership | Preserved / Out of source change scope | AC-007, investigation notes | No durable repository test needed in this worktree; record source evidence and no browser-docker change. |
| Full interactive `gh auth login` | Out of scope for hard acceptance | Design review residual risk, code review residual risk | Use non-secret shell/source-equivalent coverage; do not require account/browser interaction. |
| Built Docker image runtime installed-path validation | Not directly executable in this environment | Docker CLI is unavailable in the API/E2E environment (`docker: command not found`) | Cover runtime-installed-path invariants through Dockerfile source inspection and source-equivalent installed-path probes; record Docker build as not testable in this environment. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `scripts/tests/test_server_docker_cli_latest_defaults.py` | Python unittest coverage for server Dockerfile CLI version defaults, explicit override path, and release/build cache busting. | Adjacent Dockerfile executable coverage, not R-001 through R-008. | Still Valid | The test reads `autobyteus-server-ts/docker/Dockerfile.monorepo` but covers CLI install defaults only. | Retain; run only if broad script-test sweep is practical, but it does not cover this bridge fix. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` | Python unittest coverage for public Docker launcher storage/workspace/port behavior and Chromium profile mount path. | Adjacent Docker launcher behavior; only touches `/home/vncuser/.config/chromium`, not browser bridge scripts. | Out Of Scope | `rg` shows no references to `open-vnc-browser-url`, root wrapper scripts, or `$BROWSER` bridge. | Retain unchanged; not required for this fix. |
| `autobyteus-server-ts/tests/**/*.test.ts` | Backend unit/integration Vitest coverage for application/server services. | Server application behavior, not Docker browser bridge shell scripts. | Out Of Scope | File inventory shows application tests; no bridge script references. | Retain unchanged; not required for this fix. |
| `.github/workflows/release-server-docker.yml` | Release workflow builds server Docker images from `Dockerfile.monorepo` for default/zh variants. | R-008 release path, but not a repository-resident test assertion for bridge invariants. | Still Valid | Workflow references `autobyteus-server-ts/docker/Dockerfile.monorepo`; release builds would copy the changed source when run. | No workflow change; add local durable script tests for bridge invariants. |
| `autobyteus-server-ts/docker/open-vnc-browser-url.sh`, `xdg-open-root-bridge.sh`, `exo-open-root-bridge.sh` | Executable shell entrypoints, not tests. | Direct changed runtime boundary. | Needs Update (coverage missing, source already updated) | No existing durable test file asserts uid branch, `BROWSER=`, `/usr/bin/xdg-open`, wrapper root delegation, or non-root pass-through. | Add focused durable Python unittest coverage under `scripts/tests/`. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No existing durable test was found that asserts the old unconditional `runuser` or inherited-`BROWSER` behavior. | R-002 through R-005 and code review report confirm old behavior is removed. | New focused durable bridge coverage. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| COV-BRIDGE-001 | Root opener branch switches exactly once to `vncuser` and dispatches sanitized desktop opener command. | R-001, R-003, R-004, R-005, AC-002, AC-004 | `scripts/tests/test_server_docker_browser_bridge.py` | This is the primary regression boundary for the reported root-side browser auth flow and can be proven without interactive GitHub auth. |
| COV-BRIDGE-002 | Already-`vncuser` opener branch skips `runuser`, clears `BROWSER`, and calls system opener. | R-002, R-004, R-005, AC-003 | `scripts/tests/test_server_docker_browser_bridge.py` | This directly guards the exact `runuser: may not be used by non-root users` failure class. |
| COV-BRIDGE-003 | Unsupported uid fails explicitly without dispatching `runuser` or opener. | R-006 | `scripts/tests/test_server_docker_browser_bridge.py` | Ensures the new failure path remains intentional and safe. |
| COV-BRIDGE-004 | Root and non-root wrapper behavior remains a thin facade/pass-through. | R-007, AC-005, AC-006, design DS-002 | `scripts/tests/test_server_docker_browser_bridge.py` | Wrapper behavior is adjacent to the fix and must not silently start owning privilege/env policy. |
| COV-BRIDGE-005 | Dockerfile installs the three bridge scripts to the runtime paths, chmods them, and sets `BROWSER` to the opener. | R-008, AC-007, Dockerfile source evidence | `scripts/tests/test_server_docker_browser_bridge.py` | Docker build is unavailable here; source-level durable coverage guards the runtime image copy/env contract for both base variants. |
| COV-BRIDGE-006 | Shell scripts remain syntactically valid. | AC-001 through AC-006, implementation handoff checks | Command execution (`bash -n`), optionally as part of API/E2E execution evidence | Syntax is cheap boundary-local coverage for shell runtime scripts. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | No existing durable browser-bridge coverage exists to update. | N/A | N/A |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | No stale durable test exists for this scope. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TMP-BRIDGE-001 | Run `bash -n` on the opener and both wrappers. | Shell syntax validity for executable runtime scripts. | Command evidence is sufficient; durable test file focuses on behavioral invariants. |
| TMP-BRIDGE-002 | Run the new focused Python unittest directly. | All durable bridge scenarios pass in the current worktree. | The test file itself remains durable; command output is execution evidence only. |
| TMP-BRIDGE-003 | Run `git diff --check`. | No whitespace/conflict-marker errors in implementation plus durable coverage addition. | Repository hygiene check is execution evidence only. |
| TMP-BRIDGE-004 | Run a source-equivalent/manual probe against the current worktree if the durable test output needs deeper failure triage. | Confirms probe mechanics independent of the unittest harness. | Only needed for triage; remove temporary files after use. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full Docker image build and installed-path execution inside a freshly built container | Docker CLI is not installed in the API/E2E environment (`docker: command not found`). | A Dockerfile copy/chmod/env typo could escape runtime execution if not caught by source inspection. | Mitigated by durable Dockerfile source coverage and source-equivalent installed-path wrapper probes. Delivery/release can run image build in an environment with Docker if desired. No reroute required. |
| Interactive `gh auth login` account/browser flow | Requires account interaction and browser state; upstream explicitly did not make it the hard acceptance path. | Human-facing auth smoke is not executed end-to-end here. | Mitigated by invariant-focused probes that cover the reported recursion failure without secrets. No reroute required. |
| Actual desktop opener/Chromium tab opening in a live VNC session | Desktop opener behavior varies and may open real tabs; API/E2E environment has a live patched runtime but not a built image from this branch. | Desktop-specific branch behavior is not asserted. | Covered through invariant checks (`BROWSER=`, `/usr/bin/xdg-open`, uid branch). No reroute required. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | No requirement gap, design impact, unclear test validity decision, compatibility-only behavior, or local implementation defect was found during investigation. | N/A |

## Execution Plan

1. Add focused durable Python unittest coverage at `scripts/tests/test_server_docker_browser_bridge.py` for COV-BRIDGE-001 through COV-BRIDGE-005.
2. Run `bash -n` on `autobyteus-server-ts/docker/open-vnc-browser-url.sh`, `autobyteus-server-ts/docker/xdg-open-root-bridge.sh`, and `autobyteus-server-ts/docker/exo-open-root-bridge.sh`.
3. Run `python3 scripts/tests/test_server_docker_browser_bridge.py -v`.
4. Run `python3 scripts/tests/test_server_docker_cli_latest_defaults.py -v` as adjacent Dockerfile regression coverage.
5. Run `git diff --check`.
6. Record all pass/fail evidence and the Docker/interactive limitations in the execution coverage report.
7. Because repository-resident durable coverage will be added after the initial code review, route the cumulative package back to `code_reviewer` after execution instead of directly to `delivery_engineer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: No existing stale coverage was found. Durable coverage addition is warranted because the defect is a Docker shell boundary with no existing repository-resident browser-bridge regression tests, and Docker runtime build execution is unavailable in this environment.
