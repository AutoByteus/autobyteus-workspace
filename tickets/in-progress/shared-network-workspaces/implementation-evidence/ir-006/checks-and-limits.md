# IR006 — CR004 release-job gating Local Fix

2026-10-14. Personal implementation/checks only; no delegation. Large/High
confirmed. Source re-review required; CRR006 Fail and API002 Fail57.14% remain
independent authorities until their owners replace them. Approved018/Ready020/
ARCH004 unchanged; CR003 remedy accepted at source boundary, API-F002 still open.

## Defect and bounded correction

CR004 concerns authorized future publication after all existing gates, NOT current
permission to publish. The intended reuse-candidate branch skips engine-packages.
The successful engine-inputs bridge did not override default success gating on
its downstream transitive dependents. GitHub documents skip propagation across
needs chains and implicit success unless a status function is present. Its
recommended cancellation-aware alternative to always is !cancelled().
[Needs contract](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idneeds),
[status functions](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions#status-check-functions).
The review's publisher-runner issue2205 is supporting historical context, not a
new hosted run. Initial fresh local regression fails on actual old conditions.

Source fix `eb7934072a1f98832b7b6330a1bc6a7f348fd93d` changes only workflow and new
stdlib regression. Four job-level gates explicitly use !cancelled():

- engine-inputs requires prepare success AND either build-only + successful
  package build, or publication + exactly skipped rebuild. Failed/cancelled or
  unexpected rebuilt publication inputs cannot pass through.
- engine requires prepare and validated engine-inputs success.
- binaries requires prepare/candidate/image success; matrix/signing failures are
  still fatal, no continue-on-error or unconditional release action.
- publish requires publication intent plus successful prepare/candidate/image/
  complete binary matrix. Existing qualification checks, candidate identity
  match, Mac signing/notarization, archive bounds and final qualification remain.

New regression runs in prepare before metadata/qualification or package actions.
No new owner, changed requirement, dependency, engine rebuild or gate relaxation.

## Personal checks

Exact clean environment/commands/return codes/timings in `run-local-checks.py` and
`checks-result.json` (13 commands, all expected outcomes). Owned TemporaryDirectory
removed; no host services, VM/container/mount/node, credentials/provider, hosted
workflow, artifact upload/tag/push or release executed.

- `baseline-gates.log`: first focused test against unchanged CRR006 workflow fails
  (5 methods,10 assertion failures). Fixed conditions pass in `fixed-gates.log`.
- Current four-file Python packaging suite: **17 enumerated,16 pass/1 skip**.
  The existing Go-child fixture is not run standalone and was not rerun through Go
  this round. Its actual IR005 Go execution is historical, not a fresh pass.
- Five focused methods read actual top-level workflow needs/conditions and evaluate
  the documented boolean/status subset: complete build-only success, complete
  existing-candidate success with skipped rebuild, per-prerequisite failed/
  cancelled/unexpected-skipped states, cancellation after completed prerequisites,
  exact allowed rebuild skip, immutable candidate/qualification/signing gates.
  Matrix result models failed signing as binaries failure. This is a bounded
  source-driven nonpublishing scheduling model, **not GitHub's hosted runner**.
- Actionlint1.7.11 verifies current YAML/expression/needs syntax. Shellcheck and
  pyflakes disabled explicitly; unchanged embedded build/sign scripts not newly
  qualified. Raw version/lint logs retained.
- Six negative controls: old workflow, unconditional engine, omitted binary/signing
  result, ignore cancellation, publish on build-only, allow failed rebuild bridge.
  Every control fails intended assertions (not parse/compile errors). Temporary
  workflow files only; production workflow never mutated for controls.
- Actual default-lock `release.py --check-publish` correctly refuses. No qualification
  set, no candidate-run selected, no signing material used.
- Source hashing and whitespace checks pass. Workflow277 ->283 nonempty lines,
  8 insertions/2 deletions. Exact new test count in source-audit.json;
  tests outside production size guardrail. No production Go/Python/runtime change.

No Go/VM/Docker/native-agent/UI/broad suites rerun for this workflow-only fix.
IR005 Go/build/package-owner/Docker evidence remains scoped historical proof;
CRR006 inspected it but neither reviewer nor this round reran it. FUP001 baseline
Nuxt/Electron failures remain PM-owned, no new notification/task/patch.

## Source identity and retained candidate

`source-audit.json` records actual receipt baseline,2 changed paths, untouched
upstream/runtime/history and11 unchanged retained candidate files. The initial
comparison against review28775788db stopped on the newly committed reviewer
receiptb1747fbdc3; `audit-attempts.md` preserves that audit-only adjustment.
No upstream reviewer artifacts were overwritten.

Workflow is included in the production aggregate; new default source hash
`4568593b99bb3dff263e9824ceb7176e04a95ec90e3cd14a9f7421b4e43055ac`;
current source with the unchanged measured arm64 engine manifest hash
`5563645d23aaac13aaa26948490d68dfc12fef31775bb66156185f9052ab0acc`.
These are NOT rebuilt CLI hashes. IR005 retained CLI/release metadata still carry
prior workflow aggregate. Do not relabel them current qualification. Reuse exact
unchanged engine package/source/notices bytes, but generate current CLI/metadata
with the new source hash for downstream public validation. No implicit engine
rebuild or source/recipe/package-identity change needed; no new qualification.

## Required order / limits

Return source re-review first. Then API-F002 fresh PUBLIC create/reconnect on the
specified Ubuntu24.04.5/ext4/kernel7.0.0-38/defaultY/nonroot1000:109/no groups,
original nonempty source/hard4.1 with bytes/UUID/private modes/job checks and
**no manually preinstalled engine or probe bypass**, using current metadata/build.
Full remaining both-OS native/managedDocker clients, Linux native/Docker storage,
peer/preservation/normal operations/restart/detach/Git/locks, real native tools/
linked unread assets/peerclose/restore/modes, healthy mounted desktop previews,
physicalMac/Linux/Docker and user-verification/docs/finalization/release gates
remain. Hosted workflow/signing/publication is not exercised by these checks.
Only MacDocker storage is deferred; peerNAT environment limit unchanged.

CR001 and scoped CR002/API-F001 retained. D001/DEC015 outage machinery deferred
NOT fixed; IMP-D001 current-source links/independent Update-Remove/AGY/local policy
unchanged. No API confidence/Delivery/Task Done or release claim.
