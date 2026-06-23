# Implementation Handoff

Revision: 2 — updated after the architecture review installer-output clarification requiring nvm/Anaconda-style copy-paste persistent PATH commands when automatic profile update is not applied.

## Upstream Artifact Package

- Requirements doc: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/requirements.md`
- Investigation notes: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/investigation-notes.md`
- Design spec: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/design-spec.md`
- Future-state runtime call stack: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/future-state-runtime-call-stack.md`
- Baseline test log: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/logs/current-docker-launcher-tests.log`
- Design revision notes: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/design-revision-notes.md`
- Design review report: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/design-review-report.md`
- Artifact correction applied: `workflow-state.md` is intentionally excluded from this cumulative package.

## What Changed

- Added Bash installer PATH UX improvements in `scripts/public/docker/autobyteus-docker.sh`:
  - install-scoped `--no-update-path` / `--skip-path-update` parsing;
  - environment opt-out via `AUTOBYTEUS_DOCKER_INSTALL_SKIP_PATH_UPDATE=1`;
  - best-effort idempotent shell profile block for `.bashrc`, `.zshrc`, or `.profile`;
  - shell-safe quoted direct-path and current-shell `export PATH=...` guidance before bare `autobyteus-docker` next steps when the install dir is missing from current `PATH`;
  - concrete copy-paste persistent setup commands when automatic profile update is skipped, blocked by an existing non-equivalent managed block, or fails. The printed command block sets the detected profile path, sets the exact export line, uses `grep -qxF ... || printf ... >> <profile>` for idempotency, and includes `source <profile>`.
- Replaced the old `prefer_defaults` port allocation flag with runtime-owned `choose_ports_for_node(node_name, allow_friendly_preferences)` in `docker-runtime.sh`:
  - indexed nodes now prefer friendly sequential ports (`server-0` -> `8001/5908/6080/9228`, `server-1` -> `8002/5909/6081/9229`, etc.);
  - saved ports remain authoritative when present;
  - preferred-port collisions still fall back to random available ports;
  - bind/start retry clears selected ports and sets `allow_friendly_preferences=0` before retrying.
- Changed Bash read-only discovery defaults in `commands.sh`:
  - `urls` / `ports`, `workspace paths`, and `storage` show all managed nodes by default;
  - explicit single-node output is preserved via existing supported forms (`urls <node>`, `urls --name <node>`, `workspace paths --name <node>`, `storage --name <node>`);
  - ambiguous `--all` plus explicit name is rejected for changed read-only commands;
  - mutating/stream command targeting remains unchanged.
- Updated Bash usage text in `core.sh` for the changed read-only defaults and option semantics.
- Expanded script-level tests in `scripts/tests/test_public_docker_launcher_shared_workspace.py`:
  - isolated `HOME` for install/profile tests;
  - fake Docker label filter support;
  - installer profile/idempotency/skip coverage, including the new copy-paste persistent setup block and safe custom install-dir quoting;
  - sequential friendly ports, preferred-port fallback, and fake bind-failure retry coverage;
  - read-only default-all/single-node/ambiguous-target coverage;
  - mutating-command safety coverage.

## Key Files Or Areas

- `scripts/public/docker/autobyteus-docker.sh`
- `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh`
- `scripts/public/docker/autobyteus-docker.d/bash/commands.sh`
- `scripts/public/docker/autobyteus-docker.d/bash/core.sh`
- `scripts/tests/test_public_docker_launcher_shared_workspace.py`

## Important Assumptions

- This implementation keeps the approved Bash launcher scope. PowerShell behavior was not changed except existing cross-launcher contract tests still run.
- `CONFIG_HASH_VERSION` remains `v6`; allocation preference changes do not change desired container configuration.
- The installer uses a duplicate-safe managed profile block. If an equivalent profile entry already exists, it reports that status rather than printing duplicate persistent commands. If the managed block exists but does not obviously include the current install directory, it does not append another managed block automatically and instead prints the idempotent copy-paste persistent setup commands.
- `workspace paths` and `storage` keep `--name` as the explicit single-node form; positional node support for those subcommands was not added.

## Known Risks

- Real shell profile layouts vary. Profile writes are best-effort and non-fatal; output remains the authoritative current-shell guidance and now includes concrete persistent setup commands when the installer does not apply an equivalent profile update.
- Fake Docker now covers bind-failure retry at script level, but API/E2E should still validate representative real Docker behavior because daemon bind/start failure details can vary.
- Durable README/public docs may need delivery-stage sync for the Bash launcher install/read-only-default UX; command help is updated in this implementation.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: launcher UX behavior change with targeted local refactors.
- Reviewed root-cause classification: missing installer PATH-state invariant / misleading output ordering; local allocation-policy defect; explicit retry invariant coupling; inconsistent read-only targeting policy; mutating-command safety already correct.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): targeted local refactor now; no broad launcher/state/test-harness refactor; no config hash bump.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A.
- Evidence / notes: Implementation stayed in the approved installer/runtime/commands/help/test files, removed the old `prefer_defaults` allocator path, preserved command ownership boundaries, and added focused script-level coverage. Revision 2 carries forward the approved installer-output clarification without changing source ownership boundaries.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No` for changed read-only discovery defaults; existing saved-port preservation and random fallback remain required behavior, not compatibility wrappers.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes` — old boolean `prefer_defaults` allocation policy was removed from callers and replaced with `choose_ports_for_node(node_name, allow_friendly_preferences)`.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes` — effective non-empty source sizes after revision 2: `autobyteus-docker.sh` 236, `core.sh` 114, `docker-runtime.sh` 450, `commands.sh` 241. The larger Bash files remain under the 500-line hard guardrail; the additional installer output helpers are installer-local and not a new cross-file concern.
- Notes: Test-file growth is outside the source-file hard limit; test additions are focused durable launcher contract coverage.

## Environment Or Dependency Notes

- No real Docker daemon was used for implementation-scoped checks; the existing fake Docker harness was extended.
- Install/profile tests run under an isolated temporary `HOME` and do not touch the real developer/user profile.
- `pwsh` is not installed in this environment, so the existing PowerShell parse test remains skipped.

## Local Implementation Checks Run

- `bash -n scripts/public/docker/autobyteus-docker.sh scripts/public/docker/autobyteus-docker.d/bash/core.sh scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh scripts/public/docker/autobyteus-docker.d/bash/commands.sh` — passed.
- `python3 -m py_compile scripts/tests/test_public_docker_launcher_shared_workspace.py` — passed.
- `python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace scripts.tests.test_server_docker_cli_latest_defaults` — passed: `Ran 22 tests in 4.098s`, `OK (skipped=1)`.
- `git diff --check` — passed with no whitespace errors.

## Downstream Coverage Hints / Suggested Scenarios

- In a disposable real Docker launcher environment, create two or three nodes and verify friendly sequential ports when available.
- Verify `install --no-update-path` output includes the direct path, current-shell export, detected profile variable, guarded `grep -qxF ... || printf ... >> <profile>` persistent command, and `source <profile>`; also verify the default install path update remains duplicate-safe.
- Verify `urls`, `ports`, `workspace paths`, and `storage` default to all managed nodes with clear separated blocks, and explicit `--name`/positional `urls` single-node forms still narrow output.
- Verify `workspace apply`, `upgrade`, `destroy`, `stop`, and `logs` retain safe explicit targeting behavior.
- If practical, force a real Docker bind failure and verify retry allocates fresh/random ports rather than repeatedly selecting the same friendly preferred ports.

## API / E2E / Executable Coverage Investigation And Execution Still Required

API/E2E coverage investigation and execution are still required after code review. This handoff reports implementation-scoped script/unit checks only and is not API/E2E sign-off.
