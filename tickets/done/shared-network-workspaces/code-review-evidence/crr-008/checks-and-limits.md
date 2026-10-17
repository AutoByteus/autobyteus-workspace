# CRR008 checks and limits

Focused API003 failure-origin review, personally performed on2026-10-14. No
production/durable-test edit, worker/delegation, fresh VM/container/desktop,
mount, provider, credentials, network configuration or hosted workflow.

## Independent work

- Read approved scenario/restart/preservation requirements, SR020 lifecycle and
  selected-node design, CRR007/IR006 histories and API003 canonical report/ledger/
  investigation. Root DESIGN.md/TESTING.md and reviewer scenario gate apply.
- Traced `cli/run.go -> service.Supervise -> setup.Reconnect`, OS jobs, engine,
  direct Docker NFS volume, first-use recreation and read-only status. Checked
  configuration/reference/receipt ownership and preservation. No broad source
  structural audit or successful test-code review was triggered.
- Reviewed the exact archived public-create, lifecycle, diagnostic and repeated
  reboot harnesses/results, build provenance, ordinary reboot commands, raw
  journal ordering, same-node/config and source assertions, and cleanup receipts.
  Manual start is diagnostic only; timeout observations alone do not define a
  product recovery deadline. No mounted filesystem outage experiment was added.
- Ran `python3 -B .../crr-008/audit-failure-package.py`:625 incoming files exist,
  all169 API evidence-manifest entries match size/hash,22 focused source/authority
  files equal reviewed input,11 retained IR005 files match. Since inpute8ed5627
  only173 ticket/API evidence paths changed; no implementation or durable-test
  delta. Current input includes API receipt8f497a61 after reportf76cf11a.
- Script independently checked all15 second-reboot observations, distinct boot
  IDs, failed-start error, absent API, unchanged ID/Config/HostConfig, diagnostic
  start restoring readiness, reconnect not restoring client, host/source/marker
  preservation; checked seven raw public-native cases and nonroot/defaultY proof.
- Recomputed both source aggregates through actual `release.py --source-hash`;
  default4568593b99bb3dff263e9824ceb7176e04a95ec90e3cd14a9f7421b4e43055ac;
  retained actual arm64 manifest5563645d23aaac13aaa26948490d68dfc12fef31775bb66156185f9052ab0acc.
  This does not refresh or qualify any binary. The API's freshly regenerated
  native/Docker CLIs, not the older ignored IR005 CLI, executed these cases.
- Checked primary Docker documentation and upstream docker-v29.1.3 restore/start
  source. URL, fetch hashes and actual source line anchors are retained; distro
  binary equality to upstream is not asserted. Raw journal call sites agree with
  the mechanism. Initial wrong public tag lookup404 was corrected, not evidence.
- Initial reviewer audit root-depth assertion failed before file/product work;
  corrected path and full successful rerun retained in `audit-attempts.json`.
  It is a reviewer harness mistake, not a product finding.

## Evidence limits / cleanup

No new Go/Python product suite, VM reboot, Docker image, API, UI, native runtime or
physical-peer run by reviewer. API003 owns its actual execution results and
57.14% confidence; this review neither increases that confidence nor declares a
release. Evidence hashing is not general behavioral verification. No inference
that every platform/Docker version has the same failure or that a particular
repair must be used. No fabricated new deadline or all-stopped-node restart rule.

Reviewer created only this review directory and canonical report/history edits;
no external scratch/process/resource remains. API003 cleanup receipts record
public drained detach/preservation then disposal of three owned Linux clones,
current isolated desktop, tunnel, test image tag/audit container and scratch.
No live failing VM remains. All11 ignored IR005 artifacts and five preexisting
untracked dist trees are untouched. Existing public Mac cache/build cache retained.
No global prune, host network/user-node or credentials changes.
