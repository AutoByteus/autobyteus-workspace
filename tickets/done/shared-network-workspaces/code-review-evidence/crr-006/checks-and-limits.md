# CRR-006 independent review — evidence and limits

Input `3655801628e18032fe345db7a7058b618e921554`; IR005 source
`9992ffb30d4fbaab4852b87b2495738f1b5be908`; comparison basis
`d1aceecc4888fe8b1d58be898337473cd4be8243`. Entry Implementation Review,
**Full Re-Audit**: SR020 changes the typed release shape and build/embedded-package/
installation/publication spine beyond CR003's previous directory-read boundary.
All mandatory structural checks and ten scores were reconsidered, not just CR003.

## Personally performed

- Read approved requirements/scope, SR020 design/health/spines/transition/removal
  decisions, ARCH004 report/audit, cumulative solution/IR/CRR/API authorities and
  indexed operative evidence. Prior CR001/002 and CR003 checked before new findings.
- Inspected all26 delta paths, complete build -> source/recipe -> actual manifest ->
  CLI embedding/equality -> root-installed binary -> consent/lock -> existing
  install owner -> source/engine/mount/nonroot probe/job path. Inspected normal
  reconnect/detach and unchanged shared-workspace/profile consumer boundaries.
  DS002–005 unchanged authorities/source facts reused only after independent hash
  confirmation and macro ownership recheck, not relabelled as new execution.
- `source-audit.json`: independently compared1030 unchanged paths with input
  basis, verified26 deltas, all397 cumulative references, all11 retained candidate
  files. Read the actual corresponding-source archive in memory; exact current
  recipe/backport, original Ubuntu tar digest, modified Debian delta/changelog,
  notices confirmed. No extraction into user filesystem or installation.
- `source-size-audit.json`:109 source/config entries recounted against original
  source basis65b0e6e57a. Max473, none>500. Only workflow configuration has cumulative
  +277>220 (round delta+91); explicitly inspected as one coherent release pipeline,
  no size-driven split. All implementation-code deltas below220. Tests exempt.
- `run-reviewer-checks.py` + `checks-result.json`: current Python packaging,
  installer and launcher12 enumerated /11 pass /1 Go-child-only skip, then exact
  current source hash and deliberate unqualified publication refusal rc1. Clean
  HOME/TMPDIR/environment, no inherited provider/app configuration. Go child was
  NOT run by reviewer; IR005 Go-parent evidence remains implementation execution.
- Default production hash recomputed as
  `302cdaf6b87e0ec4b0456376a2adba66be1b7294306c01f4f3df93ef285d4a1c`.
- `workflow-path-audit.json`: parsed actual job dependencies/conditions, traced
  supported authorized publication, checked primary GitHub scheduler contract.
  CR004 is static source/contract evidence, **not an executed hosted workflow**.
  [GitHub needs semantics](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idneeds)
  documents skip propagation through dependency chains. The
  [publisher's runner issue2205](https://github.com/actions/runner/issues/2205)
  corroborates the same successful bridge followed by implicit-status skip shape.
  Direct web access to the issue/API was unavailable; a bounded read-only Python
  HTTPS fetch of the public API succeeded. No credential or remote mutation.
- First reviewer audit invocation selected `tickets` rather than worktree via
  parents[4]. Assertion stopped before checks/resources; `initial-check-path-error.json`
  retains that **reviewer harness error**. Corrected parents[5] invocation completed.
- Cleanup: test-owned temporary home/root removed; no active reviewer process,
  VM/container/service, host NFS/export/mount, credential, provider, workflow run,
  tag/publication or background task. IR005 candidate and five old untracked dist
  directories untouched. No production or durable-test edit; no delegation.

## Inspected, not rerun

IR005 full7 Go-package race/vet, final release-equality regression, four builds,
three expected assertion mutation failures, actual arm64 production-recipe build,
separate clean package-owner install under077/lock and same-pair Docker build and
network-disabled inventory/hash inspection. Raw `install-result.json` distinguishes
helper invocation from CLI setup. Narrow install16.840s/repeat0.097s, corrupt pair
refused before mutation; native/container executable hashes equal. Both VMs and
owned toolchain/scratch cleanup receipts inspected. No public create/reconnect,
mount or new UI proof exists in IR005. Designer prototypes had preinstalled engine
packages; they support SR020 selection, not fresh installer qualification.

## Retained gates and nonclaims

CR003's design/source correction is accepted at this boundary, but API-F002 remains
open: API002 Fail57.14%/broader Required unchanged. After bounded workflow fix and
source re-review, API must first run fresh public native Ubuntu create/reconnect
without manual engine preinstallation, default delegationsY/hard4.1/exact nonroot
identity, source/mounted bytes+UUID/modes/job. Use retained candidate exact bytes
or record a new build identity. Then complete the remaining approved modes,
Docker clients on both OSes, Linux native/Docker storage, peers, normal operations,
restart/detach/preservation, native runtime/assets/close/restore/modes, mounted
healthy desktop previews, physicalMac/Linux/Docker, docs/finalization/explicit
user verification and authorized release. Only MacDocker storage is deferred.
Mac peer NAT limitation remains separate; no network bypass authorized.

No all-green repository claim: historical current Nuxt/Electron each retain three
baseline updater failures (FUP001 PM custody); removed diagnostic-candidate passes
are not current source. No duplicate follow-up/patch/Task. D001/DEC015 outage
hardening stays deferred/not fixed; private links/independent source Update-Remove,
AGY/local behavior unchanged; no retention or outage machinery. No delivery/API
Pass, published installer, source waiver, merge/push/release or Task Done.
