# Separate Baseline Product Item — Public Launcher Apostrophe Quoting

## Identity / Accountable Ownership
- Origin: fix-legacy-docker-workspace-builds, IR-001 finding IMPL-BASE-001, 2026-10-12.
- Disposition: Separate product follow-up, not a retirement blocker or a repaired issue. Current retirement preserves public launcher bytes (R2 REQ-006).
- Accountable intake/backlog owner: /project_task_manager for this Project; public Docker launcher technical recovery entrypoint: /software_engineering_team/solution_designer when separately scheduled/authorized. No execution assignment or user approval for a launcher patch is claimed here.
- Register as TODO in Project project_a1377344-25db-482a-97cc-ecfdb0fb495a; do not dispatch or add this repair to the retirement branch.

## Defect / Supported Scenario
User installs the public Bash launcher into a supported custom directory with spaces/apostrophes via AUTOBYTEUS_DOCKER_INSTALL_DIR and chooses --no-update-path. Printed copy/paste export/direct-path/profile commands must be valid for native macOS /bin/bash 3.2. Existing entry_shell_quote in scripts/public/docker/autobyteus-docker.sh instead produces invalid quoting for fixture input fixture's. This is a supported installer input, not arbitrary shell injection testing.

## Evidence / Causality
Implementation Engineer's test_bash_install_no_update_path_skips_profile_write fails on both bootstrap 2756d7b298ca5b203ebd2310d172b37a5d381b5c and current retirement source under Python 3.11. Isolated native Bash3.2 owner-function reproduction with fixed non-executable fixture input yields unexpected EOF/syntax error. Runtime-discrepancy rerun also fails. Public launcher sources are byte-identical in the retirement diff; this failure was not introduced by source deletion. No user shell profile or live Docker node was modified for evidence.

Exact durable originals in the retirement ticket:
- implementation-handoff.md (IMPL-BASE-001)
- implementation-evidence/ir-001/baseline-triage.log (base/current failures and Bash parser reproduction)
- implementation-evidence/ir-001/runtime-discrepancy.log
- implementation-evidence/ir-001/local-checks.log (original broad command remains non-green)
Attach report/log copies to the follow-up Project Task so evidence survives task worktree cleanup.

## Proposed Follow-Up Scope / Done Conditions (Not Yet Approved Implementation)
Investigate/correct public install-command quoting for supported macOS Bash3.2 and other already-supported shell paths. Preserve --no-update-path not writing profiles and safely quoted literal directory semantics. Add assertions that emitted commands actually parse/round-trip the literal fixture directory under supported shells, not just textual equality. Never eval arbitrary input, execute real Docker commands, write user's profiles or use current node data. Fix in an isolated separately authorized task with normal requirements/design/review/validation/Delivery gates. Retain this baseline attribution until actual fix proof exists.

## Registration Receipt
create_or_update_task confirmed TODO project_task_9599b2a7-3ae6-4e7f-9875-1e039f4db2e6 in project_a1377344-25db-482a-97cc-ecfdb0fb495a on 2026-10-12, with durable copied report/baseline-triage/runtime-discrepancy context. No delegation/start/fix/completion is claimed.
