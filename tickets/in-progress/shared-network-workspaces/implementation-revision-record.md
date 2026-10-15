# Implementation Revision Record

Current code and `implementation-handoff.md` are authoritative. This record
indexes actual implementation work and escalation; absence of an earlier
record does not imply an earlier Pass or completed implementation.

## Revision index

| Revision | Trigger | Incoming finding | Classification | Related revisions | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / current report / round 2 | N/A | Design Impact (initial baseline) | SR-018, ARCH-REV-002; CRR/API-REV/DR N/A | Preparation stopped for IMP-D001; no production change |
| IR-002 | Architecture Reviewer / current report / round 3 | IMP-D001 | Implementation Complete | SR-019 / Approved SR-018, ARCH-REV-003; CRR/API-REV/DR N/A | Source implemented; personal local checks complete with unrelated baseline frontend failure; ready for source review |
| IR-003 | Code Reviewer / CRR-001 / round1 | CR-001 P1 | Local Fix Complete | SR-019 / Approved SR-018, ARCH-REV-003, CRR-001; API-REV/DR N/A | Restrictive-mask new-directory modes corrected; pending source re-review |
| IR-007 | Architecture Reviewer / ARCH005 / round5 | CR005 / API-F003 | Implementation Complete (reviewed design recovery) | SR021 / ApprovedSR018, ARCH005, CRR008, API003; DR N/A | Bounded same-ID failed-start completion implemented; local checks complete; source review required |
| IR-008 | Architecture Reviewer / ARCH006 / round6 | CR006 P1 / API-F004 | Implementation Complete (reviewed design recovery) | SR022 / ApprovedSR018, ARCH006, CRR010, API-REV004; DR N/A | Export expiry0 and hosted config lifecycle verification implemented; source review required |

## IR-001 — Correct the source-generation lease reuse premise

- Date: 2026-10-13.
- Trigger: `/software_engineering_team/architecture_reviewer`,
  `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/design-review-report.md`,
  ARCH-REV-002 Pass on Ready/Approved SR018.
- Prior authoritative implementation result: **N/A**.
- Incoming triggering findings: **N/A** (initial baseline). New finding:
  **IMP-D001**, not the historical outage finding D-001.
- Current result: **Design Impact**, implementation not complete and not ready
  for independent source review. Task size Large / architectural risk High
  retained; no downgrade or completed-code confirmation.
- Related revisions: SR-018 current, SR-017 retained choices; ARCH-REV-002
  current and ARCH-REV-001 history; CRR-* N/A, API-REV-* N/A, DR-* N/A.
- Why recorded: initial source tracing found that design-mandated existing
  managed-source leases do not exist. Current holders own workspace links;
  source Update/Remove independently deletes retired bytes. AGY similarly
  links a source without leasing it. Do not silently add source retention or
  bypass the source owner while implementing private profiles.
- Relevant boundaries: BEH002/005, REQ003/010 and preserved local/configured
  skill policy. No old-byte snapshot requirement is invented.
- Actual implementation delta: **no production code or test change**. Created
  canonical implementation handoff, this revision baseline, detailed finding
  `implementation-evidence/ir-001/source-lease-design-impact.md`, and exact
  read-only source-hash audit `implementation-evidence/ir-001/source-audit.json`.
- Source basis: `e642fd477d071e21d46a8d3b09c5370c5bbdba28`.
- Local validation: current source/docs/test inspection and artifact/diff
  checks only. No build/unit/integration/API/E2E execution or live NFS/runtime
  experiment. Existing test text was inspected, not counted as passed.
- Next recipient: fresh handoff rules select only
  `/software_engineering_team/solution_designer` for this Design Impact.
  Request a narrow technical ownership correction; no repeated user choice
  questionnaire. Successful message receipt is required before claiming sent.
- Remaining limits: all production implementation/self-check/source review/
  API-E2E/delivery work remains. Historical FR tests are feasibility only.
  DEC015/D-001 outage deferral remains; current source ownership finding must
  not reintroduce outage workers or expand v1 by assumption. No live resource,
  credentials, user data, provider or release changes were made.

## IR-002 — Implement SR019 private links and selected NFS service boundaries

- Date: 2026-10-13.
- Trigger: `/software_engineering_team/architecture_reviewer`, current
  `design-review-report.md`, ARCH-REV-003 Pass on Ready SR019 / Approved SR018.
  Design commit `4c28e7865b`; review commit `65b0e6e57a`.
- Triggering finding: **IMP-D001**, original IR-001 source-lease ownership evidence.
- Prior authoritative result: **Design Impact**, no production implementation in
  IR-001. Preserve that record; ARCH-REV-002's incorrect lease acceptance is history.
- Current authoritative result: **Implementation Complete**, ready for independent
  source review, **not** all-green repository/API-E2E or delivery qualification.
  Large / High confirmed; no classification downgrade.
- Related solution revisions: SR-019, unchanged Approved SR-018, retained SR-017
  choices; architecture ARCH-REV-003 current, ARCH-REV-001/002 historical. CRR-* N/A,
  API-REV-* N/A, DR-* N/A (not yet performed, not waived).
- Reason: implement the corrected private profile/source-owner contract and the
  approved selected storage/client/Nodes guide behaviors. IMP-D001 is resolved in
  current code by linked profiles that never acquire/delete source bytes, not by
  inventing source leases or copying skills.
- Behaviors: **BEH001–007**; current `implementation-handoff.md` maps each to actual
  owners and evidence limits. Approved requirements and approvals unchanged.
- Actual code delta: `c57ab71c90930a0c98e1310d07b0808d28dfbd14` adds standalone
  `autobyteus-nfs`, packaging/installer, selected Docker snapshots/receipts,
  optional launcher attachment, lazy shared-run binding, child-only Git environment,
  exact private Claude/Codex/Grok process/profile ownership and Nodes NFS Guide.
  Existing REST streams and AGY capsule/source cleanup policies remain authoritative.
  Separate narrow baseline corrections: `6717bcb221` system-Bash launcher quoting;
  `f34fc81aa2` isolated core traversal test fixture, no permission-policy change.
- Source audit:139 source/test/doc paths vs reviewed upstream, hashes and size
  checks in `implementation-evidence/ir-002/source-audit.json`. Source production
  hash `8267720954e31425f761b500fa6abdd88134b3e3bbd97b715c99a7fa058d202d`.
- Personal local checks: server686 files/5,402 tests pass (4 files/7 tests skip);
  core298/2,019 pass; narrow integration9/52 pass; server typecheck/build and web
  build pass; rendered guide8 cases pass; Go7 packages race/vet pass,4-target
  compile; launcher38 run/2 skipped, installer6 pass. Native metadata-only linked
  discovery passed; no provider/native support-tool execution implied.
- Full frontend checks also personally executed: original Nuxt611 files pass/1
  fail/2 skip (4,258 pass/3 fail/5 skip); Electron35 files pass/1 fail/1 skip
  (188 pass/3 fail/1 skip). Same unchanged updater false positive caused by stack
  path `shared-network-workspaces/.../appUpdateErrorClassifier`. Evidence and
  unmerged candidate in `updater-follow-up.md`; current source is not patched for
  this out-of-scope product behavior. Candidate-only green runs cannot supersede
  the authoritative baseline failures. Project Tasks-owner follow-up requested.
- Testing scope: user's broader testing request executed personally within the
  implementation skill; no new delegation. API/E2E and physical-system validation
  remain the designated downstream responsibility, not silently claimed done.
- Routing: refresh rules after persisting this package; Large/High completion
  selects Code Reviewer, not direct API/E2E. Full cumulative upstream package and
  all retained failures accompany this handoff.
- Limits: most privileged Go/platform paths not executed locally (numeric coverage
  report retained); no live mount/export/user node/provider/release operation.
  All selected real runtime/mode/healthy preview paths, independent physical
  Mac/Linux/Docker proof, docs sync, merge, explicit user verification and release
  gates remain. **DEC015/D-001 is deferred, not fixed**; no outage worker/probe/
  stream-lease/cwd trampoline, source-retention queue or shared-to-local fallback.


## IR-003 — Preserve new-directory modes across restrictive installer umask

- Date:2026-10-13. Trigger: `/software_engineering_team/code_reviewer`, canonical
  `code-review-report.md` / `code-review-revision-record.md`, **CRR-001 Fail**,
  **CR-001 P1 Local Fix**. Review `d4ac42107e`; custody supplement `caa318d795`.
- Prior authoritative implementation result: IR002 Implementation Complete; source
  reviewer subsequently found CR001. Current result: **Local Fix Complete**, ready
  for independent re-review, **not** a reviewer Pass or API/E2E handoff.
- Related revisions: Approved SR018 / Ready SR019, ARCH-REV003, CRR-001 current;
  IR001/IMP-D001 and IR002 preserved; API-REV N/A, DR N/A (not yet performed).
- Classification: task_size **Large**, architectural_risk **High**, unchanged.
- Why: normal fresh first installation carries077 into mkdir0755, creating0700
  executable/public parents and blocking intended nonroot access. No changed
  requirement/design or new supported failure scenario was necessary.
- Affected behavior: BEH001/005, SCN001/011/013, AC012/018/019. Approval authorities
  unchanged. D-001 remains deferred; source Update/Remove independent as in SR019.
- Delta commit: **dfeac830f468994255fdafc31f66cdbeee1852cc**. Only production owner
  `autobyteus-nfs/internal/platform/commands.go` now sets requested final modes on
  successfully newly created directories under the trusted parent; recursive new
  parents0755, private0700. Existing entries never chmodded/adopted. Production
  `RootDirectory` always binds real `TrustedPath`; private recursion is testable
  with an owned-fixture trust callback, not an exported or environment bypass.
- Durable tests: new `autobyteus-nfs/internal/platform/directory_modes_test.go` and
  extended `scripts/tests/test_nfs_installer_fixture.py`. Actual bootstrap to Go
  fixture checks077 at verify/create, two virtual OS layouts, all necessary new
  ancestors, private0700/0600 and public0755/0644, nonroot fixture exec/descriptors,
  and existing-path refusal/non-adoption. No real sudo/root paths touched.
- Personal validation: full7-package Go race/vet pass, existing Python6 pass plus
  Go-invoked permission fixture, all4 target builds and native version/refusal pass.
  Three disposable mutation controls fail exactly on missing final/node/ancestor
  modes. Logs, commands, cleanup and limits in `implementation-evidence/ir-003/`.
  No delegation.137 other IR002 audited paths unchanged; previous TS/UI results
  carried honestly, not claimed rerun. FUP001 full-suite failures remain unchanged.
- Size/persistence: one production owner78 ->86 nonempty lines; no hard limit or
  >220 production delta; tests outside that limit. No migration/compatibility,
  source-byte permission change, umask relaxation or new workflow machinery.
- Routing: refresh rules after persisting; existing Large/High Local Fix returns
  to Code Reviewer. Do not advance to API/E2E before reviewer Pass. CRR001 remains
  the authoritative Fail until independent review updates it.
- Limits: test trust substitutes UID ownership inside scratch, not live root-owned
  different-UID verification; both layouts exercised on native Mac, foreign builds
  not executed. Real privileged installer/OS/modes/Docker/native tools/assets/peer/
  restore/healthy previews, physical proof, docs/merge/user verification/release
  remain downstream. Main Task not closed; no live resource/provider/release action.

## IR-004 — Bridge native Apple cold activation to the first host mount

- Recorded:2026-10-14; execution evidence2026-10-13 UTC. Trigger:
  `/software_engineering_team/code_reviewer`, **CRR-003 Fail / Local Fix**, **CR-002 P1**,
  API-REV001/API-F001 failure-origin review. Input artifacts164e871e55 and receipt
  4ed9a12720. Prior IR003 Local Fix Complete was independently accepted by CRR002;
  CR001 remains resolved, not reopened. Latest CRR003/API001 Fail still governs.
- Current result: **Local Fix Complete, source re-review required**. Not a source
  reviewer Pass, API signoff, delivery or Task Done. Approved SR018 / Ready SR019 /
  ARCH-REV003 unchanged; IR001/IMP-D001 history preserved. DR N/A, not yet performed.
  Task size **Large**, architectural risk **High**, confirmed without downgrade.
- Supported behavior: BEH001/004, SCN001/011/013, AC012/018/019; preserve BEH005
  source identity/private-state/nonroot/consent/ownership contracts. Ordinary fresh
  native-Mac create must complete in one invocation, not require manual reconnect.
- Diagnosis: personally reproduced unchanged-source mount_nfs74/EPROGUNAVAIL.
  Passive trace confirms TCP111 initially not serving. Published Apple activation
  command/PID completion is not RPC readiness. Rejected candidates additionally
  exposed implicit rpcinfo lookup sending NFS NULL to port111 after lookup failure.
  Do not infer a required statd/NLM feature or ignored locallocks from error wording.
  `implementation-evidence/ir-004/startup-investigation.md` separates raw facts,
  primary contracts, candidate failures and limits; no exact kernel-cause claim.
- Source commit **174e480bd0cfaee29f22fd46b1922afbb274e56b**. Existing Apple backend
  `apple_apply.go` now awaits its `apple_startup.go` serving boundary; setup apply/
  lifecycle pass the validated selected endpoint. Observe both TCP v3 registrations,
  then actual NULL replies at explicit registered ports. Only known not-yet-ready
  conditions/missing mappings get a bounded startup observation window; invalid
  configuration/procedure/auth/version and unknown errors remain failures. No blind
  sleep, blanket mount retry, daemon-policy change or implicit-lookup fallback.
- Exact existing administrative lock and synchronous child ownership retained;
  source/UUID, settings blocks, mapall/nonroot, pending intent, CR001 modes, mount
  flags, job ordering and no intentional shared-to-local fallback unchanged. No
  persisted migration or compatibility path. DEC015/D001 deferred NOT fixed;
  no per-action worker/probe/stream lease/cwd trampoline or outage guarantee.
- Durable new `internal/backend/apple_startup_test.go`: ordering, absent/partial/
  wrong-version/UDP-only registrations, actual serving transitions, exact endpoint/
  explicit ports, invalid table/ports, fatal setup errors and unsuccessful bounded
  observation. Five changed files (four production); new owner98 nonempty lines,
  all production files below500 and per-file deltas below220.906 prior source/
  authority/evidence paths unchanged; API-owned af9f23 REST tests untouched.
- Personally executed final checks:7-package Go race/vet, Python6 pass plus child
  permission fixture executed through Go,4-target builds, native smoke and expected
  unqualified publishing refusal. Three disposable mutation controls fail on the
  intended assertions. No testing or implementation delegated.
- Native narrow regression: two complete fresh current-source Mac VM harnesses
  **Pass13.407s and11.496s**, real guest sudo/root installation under077, one public
  create and no manual reconnect. Original/mounted bytes and UUID match; source
  inode/device/owner/mode retained; private0700/0600, exact installed binary and
  running launchd job verified. A third current create passed16.975s but an extra
  harness assertion incorrectly required GID0 instead of root UID + private mode;
  overall Fail retained, harness corrected only. Baseline and three rejected
  candidate failures also retained rather than relabelled as passes.
- Final production hash497efd6abb0c2cfa4c740a87f005c529cbf026a6fa218b3acd345826f4a923da;
  guest binarye8c88d75a1ce43fcffd78f831dbfde38e8f4c11af06274251b600ea7bd5535c1,
  identical native crossbuild. Full commands/limits/raw packet diagnostics/cleanup
  in `implementation-evidence/ir-004/`. All8 exact owned clones/processes removed,
  cached public image retained; owned toolchain/scratch removed. No host shares,
  private credentials, user nodes, host mounts, paid providers, push or release.
- Next: fresh rules select source re-review of this Large/High Local Fix, before
  API owner reruns API-F001 and the remaining matrix. Current API001 confidence/
  failure remains authoritative. Current native tools/assets/peer/restore/modes,
  both-OS managed Docker clients, Linux native/Docker storage, mounted healthy
  previews, independent physicalMac/Linux/Docker, docs/finalization/user verification
  and authorized release remain gates. FUP001 stays PM-owned, no duplicate task or
  patch; Nuxt/Electron baseline failures and candidate-only green distinction remain.

## IR-005 — Productize the reviewed corrected Noble engine dependency

- Recorded2026-10-14. Trigger `/software_engineering_team/architecture_reviewer`,
  **ARCH-REV004 Pass / Ready SR020**, unchanged Approved SR018, resolving the design
  response to **CRR005 Fail / Design Impact CR-003 P1 / API002 API-F002**. Design
  957b052f4b222b7ddb14e148fd5439ba10122379; reviewc7f0376db65d09bcab93feeb3adb9288ece9d58a;
  incoming receiptd1aceecc4888fe8b1d58be898337473cd4be8243. Duplicate ARCH004 handoff
  deduplicated, not new work. Prior IR004 Local Fix Complete was accepted by CRR004
  and nativeMac cold create confirmed at API002's recorded scope; Linux dependency
  finding is separate. CR001/CR002/IMP-D001 scopes and all IR001–004 history retained.
- Current result: **Implementation Complete — SR020 recovery; independent source
  review required**. Not Code Reviewer Pass/API Pass/delivery. CRR005/API002
  Fail57.14%/broader Required remain current until their owners replace them.
  **Large/High confirmed**, no downgrade. DR N/A, not yet performed.
- Approved behaviors BEH001/004/005; SCN001/011/013, AC012/018/019 and preserved
  BEH002/003/006/007. Correct dependency at existing build/install boundary rather
  than weakening confined marker/nonroot reader, kernel/reference/defaultY,
  hard4.1/squash/allowlist/source identity or adding retries/fallback.
- Source commit **9992ffb30d4fbaab4852b87b2495738f1b5be908**,26 paths. New exact Noble
  source/distro-delta recipe, accepted98eb77c backport with production provenance,
  distinct4.3-8ubuntu1+autobyteus1 main/VFS pair, per-architecture typed manifest,
  actual corresponding modified source/build inventory/notices. Runtime embed
  validates fixed package identity/size/hash before mutation; existing Ubuntu
  install owner stages0700/0600 under admin lock, installs exact local pair plus
  distro deps, requeries installed state/version and cleans owned files/mask.
- `packaging/engine/`, backend engine_bundle/engine_staging/ubuntu_packages,
  setup Release/Apply, packaging/release/Dockerfile and release workflow are the
  changed owners. Same exact pair used native/Docker. Candidate artifacts built
  once and reused by publication via explicit candidate-run selection and lock
  match; changed identities invalidate qualification. No prototype hash inputs,
  host compiler/PPA/user extra command/caller sidecar/stock hosting fallback.
  Normal reconnect installs/upgrades nothing. Default release stays unqualified.
- Personal tests: full7-package Go race/vet; final race rerun includes complete
  engine metadata equality test. Python11 pass/1 standalone child skip (actually
  run via Go parent);4-target compile/native smoke/refusal;3 meaningful mutation
  failures. Actual production recipe arm64 build passes in one owned Ubuntu VM;
  actual package owner on a separate clean VM under077/admin lock passes16.840s,
  corrupt payload refused before mutation; already-installed0.097s. Same-pair
  Docker build38.796s and network-disabled inspection pass, exact executable hash
  native/container matches. **No public create/reconnect/export/mount in IR005**;
  narrow package-owner helper is not full CLI consent/setup proof.
- Real arm64 package/output identities in `implementation-evidence/ir-005/` are
  new production-recipe bytes, not designer manually preinstalled prototype.
  Full modified source/notices inspected. No amd64 package build/hosted workflow/
  product runtime/physical/UI signoff. Existing frontend unchanged, rendered loop
  N/A this delta. Detailed commands/scripts/logs/limits/cleanup/hash audit retained.
- `source-audit.json`:1030 prior source/authority/history paths byte-identical;
  all26 deltas hashed, no production file>500 nonempty or delta>220. Stock engine
  old path removed, no migration/version fallback/new source ownership. Main
  handoff updated; prior revision-record prefix byte-preserved. No source/API/
  design authority edited by implementation.
- Default source hash302cdaf6b87e0ec4b0456376a2adba66be1b7294306c01f4f3df93ef285d4a1c;
  tested-arm64 manifest source hash588a8826111e970bee40f59fe62163d56c730f965d35fe15971dfe99a54e33b6.
  Difference is actual package identities. Exact candidate retained ignored at
  `autobyteus-nfs/out/ir005-local-candidate/`; all11 files hashed in receipt. No
  committed deb/published artifact. Both owned VMs/processes/private caches and
  scratch/toolchain removed; no user resources/keys/nodes/providers touched.
- Next: fresh Large/High completion rule -> Code Reviewer, then API-F002 **fresh
  public create/reconnect without manual engine preinstallation first**, followed
  by full native/Docker/peer/current-tool/assets/restore/modes/healthy-preview/
  physical/user-verification/docs/finalization/release matrix. No delegation,
  release/merge/push or Task Done. D001/DEC015 deferral and IMP-D001 source/AGY/local
  policy unchanged. FUP001 PM custody and old Nuxt/Electron non-green retained;
  separate peer-network environment limit remains, not a product-test pass.

## IR-006 — Preserve gated publication across the skipped engine rebuild

- Recorded2026-10-14. Trigger `/software_engineering_team/code_reviewer`, **CRR006
  Fail / implementation-owned Local Fix / CR-004 P2**. Review28775788db8d1a3d1d54b86a29ebfac34e1a463b,
  receiptb1747fbdc3fe41f8aa8413f7e110a42ce9687704. Prior IR005 Implementation Complete
  led to CRR006 accepting CR003 remedy at source boundary but identifying this
  permitted publication-path defect. Not a new engine/runtime/API failure.
- Current result **Local Fix Complete — source re-review required**. Large/High
  confirmed. Approved018/Ready020/ARCH004 unchanged. CRR006 Fail and API002
  Fail57.14%/broader Required remain independent authorities; API-F002 still open.
  DR N/A. IR001–005 and all old failures/scoped resolutions preserved.
- Affected BEH001 distribution and preserved BEH004/005; SR020 one-command
  release/qualification contract, REQ012/019, AC011/019/020. Valid future authorized
  publish intentionally skips engine rebuild, so downstream default success
  gates skipped the candidate/image/binary/release chain. This is not authorization
  to publish or a failure of the correctly unqualified lock.
- Source commit **eb7934072a1f98832b7b6330a1bc6a7f348fd93d**. Only
  `.github/workflows/release-nfs.yml` and new
  `scripts/tests/test_nfs_release_workflow.py`. Four explicit !cancelled() job gates
  require every applicable direct prerequisite success; engine-inputs accepts only
  build-only+successful rebuild OR publish+exact skipped rebuild. Publication also
  requires intent and successful binary/signing matrix. Existing qualification,
  candidate identity, signer/notary and archive bounds untouched; no unconditional
  jobs, continue-on-error, qualified-pair rebuild, new owner or changed requirement.
- New stdlib source-expression/needs regression executes in prepare. Personal
  checks:17 Python tests/16 pass/1 existing standalone Go-child skip (not rerun via
  Go this round); actionlint1.7.11 syntax/expressions pass; default publication
  refuses as required. Five focused methods cover build-only/existing-candidate
  success, failed/cancelled/skipped prerequisites, cancellation and required
  identity/qualification/signing. Baseline10 assertion failures retained; six
  controls fail on intended assertions, not parser errors. All13 command receipts
  expected. No hosted runner/signing/publication executed; model is not that proof.
- Workflow277 ->283 nonempty lines,8 added/2 removed; test132 nonempty. No Go/
  engine/recipe/package/runtime/UI change; no migration/compatibility/dead fallback.
  1115 prior source/authority/history paths and11 ignored candidate files unchanged.
  Initial audit stopped because reviewer receipt appeared after incoming commit;
  corrected parent baseline retained, no source defect/data change hidden.
- Current default hash4568593b99bb3dff263e9824ceb7176e04a95ec90e3cd14a9f7421b4e43055ac;
  current aggregate with retained engine inputs5563645d23aaac13aaa26948490d68dfc12fef31775bb66156185f9052ab0acc.
  Workflow is hashed, so old IR005 CLI/metadata is a prior aggregate, not a current
  qualification. Reuse unchanged exact engine bytes but rebuild current CLI/metadata
  and record identities before API public tests. No new artifact build/qualification.
- All work personal/no delegation; only owned local temp copies/home used and
  removed, all subprocesses complete. No VM/container/mount/app/node/credentials/
  provider/hosted workflow/push/release/Task Done. Prior actual IR005 package/Go/
  Docker proof remains historical, not rerun. Frontend unchanged: rendered N/A.
- Return via fresh Large/High Local Fix rule to source reviewer. After Pass,
  API-F002 public fresh create/reconnect without engine preinstall first, then all
  remaining approved modes/clients/storage/peer/runtime/healthy preview/physical/
  user/docs/finalization/release gates. CR001/CR002 scopes, D001/DEC015 deferral,
  IMP-D001 independent source deletion/AGY/local policy, FUP001 PM custody and
  separate peer-network limit unchanged. No broad tests relabelled current pass.

## IR-007 — Complete selected Docker NFS startup after dependency proof

- Trigger `/software_engineering_team/architecture_reviewer`, ARCH-REV005 Pass
  on ReadySR021 / unchanged ApprovedSR018, review4cd2aae49b6e628084bc4d63fd6ef3b2719c3fc2;
  actual input50d9c9d0c883e1ad8d3a1808b9e980a7df4f132b adds only receipt/history.
  Findings CRR008/CR005 P1 / API003/API-F003. SR019/020 preserved; DR N/A.
- Prior implementation IR006 LocalFixComplete (subsequently CRR007 Pass); current
  independent authority CRR008 Fail / DesignImpact, API003 Fail57.14%/broaderRequired.
  API-F002 independently resolved at API003 fresh public no-preinstall nativeUbuntu
  create/reconnect scope. Current IR007 result **Implementation Complete, pending
  source review**, not a replacement for independent failure/runtime authority.
- Source `d318bd9db935affdf16d141ef4e88a6c0e4939b5`,15 scoped paths. BEH003,
  SCN009/013, REQ014/019, AC007/014/018/019 and preservation AC009/017.
  Existing locked Reconnect -> host proof -> selected-set coordinator -> current
  exact daemon/container/ownedvolume/policy/qualifiederror -> current-image daemon
  probe -> reinspection -> atomic bounded consumed incarnation -> same-ID Start
  -> actual API/sharedbinding/currentstate verification. No recreation/pull/
  configuration/policy/source/private-data/extra-job/outage-machinery changes.
- New docker/start_observation.go, start_recovery.go, volume.go; setup/reconnect_nodes.go.
  Snapshot only publicstate fields; shared readonly volume validator and existing
  Probe/VerifyStarted/Store reused. Status observational, one discovery per pass.
  Current mutable error/policy excluded from record key. Malformed/consumed fails
  closed; confirmed public reconnect retries once but never overrides restart=no.
  Safe detach removes exact attempts after attachment removal. No migration.
- Launcher/README distinguish ordinary running Stop from already-failed no-op;
  existing docker update --restart=no is durable veto, always-policy semantics
  unchanged. No invented manualStopped field/private veto. Opaque config exact;
  inspect Mounts array ordering alone ignored, actual entries unchanged.
- Personal final checks:7 Go packages race,51 top-level/105 subcases pass; vet;
  Python18/17pass/1 standalone Go-child skip with child executed via Go; shell
  guidance/syntax; four compile targets; empty-qualification publication refusal;
  seven intended mutation failures. No actual Docker/VM/root/mount/frontend/API run.
  Initial volume-negative assertion failures fixed/retained; pre-polish passing
  candidate and version-output harness error retained, no failures erased.
- Current binaries/metadata rebuilt with unchanged IR005 engine pair, no engine
  rebuild. Defaultsource968f6d000d4b6c2cc3c66cd3add5845cb30385cdad752fe831b564823db9b764;
  sameengine aggregate51f81cd187caf269ecffa83fecc35a4f665b70942716d7858fa7d964d3b335ed.
  Ignored ir007-local-candidate4-file inventory in build-result.json;11 old files
  unchanged.1350 prior active-package files verified unchanged,62634 total other
  tracked files matched input. Changed productionmax267/nonempty, no>220 delta.
- Large/High confirmed. Fresh primary completed-Large/High rule -> existing
  `/software_engineering_team/code_reviewer` only. After sourcePass API-F003
  fresh public setup + two ordinary whole-host reboots FIRST without manualStart/
  reconnect, same-object/API/bytes/UUID/private/source and normalStop/policyNo/
  unselected controls. Full remaining current-product/native-agent/physical/bothOS/
  preview/user/docs/finalization/release matrix retained. No150s SLA/outagegate.
- D001/DEC015 deferred NOTfixed; IMP-D001 sourceUpdateRemove/AGY/local retained;
  FUP001 PMcustody and peerNAT limit unchanged. Only MacDocker STORAGE deferred.
  No provider/liveuser resources/merge/push/release/TaskDone. Full artifacts and
  historical IR006 handoff retained; current canonical handoff/code authoritative.


## IR-008 — Correct healthy source freshness and hosted config lifecycle

- Date2026-10-15. Trigger Architecture Reviewer ARCH-REV006 Pass / design-review-
  report.md, SR022. Findings CRR010/CR006 P1 / API-REV004/API-F004.
  ApprovedSR018 and SR019/020/021 retained; DR N/A.
- Prior implementation result IR007 Implementation Complete/source review required;
  later CRR009 source Pass and API004 independently resolved CR005/API-F003 at their
  actual scopes. Current CRR010 Fail/API004 Fail57.14% concern distinct freshness.
  Exact previous canonical handoff retained at implementation-evidence/ir-008/
  prior-implementation-handoff-ir007.md; current code/handoff remain authoritative.
- Current result Implementation Complete, bounded reviewed design recovery;
  Large/High confirmed, independent source review required. Not CR006 product closure.
- BEH001/003/004/005, SCN002, REQ004/AC003/QR001 and REQ010/AC009/017:
  common GaneshaConfig adds EXPORT Attr_Expiration_Time=0; hosted Status calls
  VerifyGanesha before readiness; Detach calls backend VerifyGaneshaForDetach
  before node/mount/job/engine effects. Missing allowed only in teardown preflight.
  Existing Write/Verify/Ensure/exact-removal bodies unchanged.
- Source d65aeda24fc4b9a534a3941b194dd4a55b88c00c: eight paths. Ganesha generator/native
  config owner, setup status/lifecycle, backend/backend_test.go/cleanup_test.go,
  adjacent setup/hosted_config_test.go, README. No new state owner/migration/cache/
  reader/UI workaround, engine rebuild, source/private/node-policy mutation.
- No evidenced released predecessor transition. Old disposable fixtures use matching
  old candidate drained public detach BEFORE corrected reinstall on preserved source/
  marker. Different bytes retained/refused; disk equality is not loaded-policy proof.
- Local final race seven packages56 top-level140 subcases pass; vet; four compile
  targets; native version; Python18/17pass/1 Go-child standalone skip; shell syntax;
  qualification refusal; seven intended mutation failures. All implementation-local.
  Initial wheelGID0 scratch failure retained and corrected only in owned test env.
- Actual CLI/metadata rebuilt with exact retained IR005 pair; defaultsource
  ae8e023775c9f7ab060e469cc9770a34ccc1321a8ae9d338a95a70ae0cd15076;
  sameengine a6ef7dee582e9b4ba0edd7449bac4d292acfb944073502f0fb63bd8356653342.
  Four ignored current candidate files inventoried; all15 prior artifacts unchanged.
  All1041 incoming refs retained,1083 other input paths and five old dist trees
  unchanged. Scratch removed; no live resources or API/E2E run.
- Fresh configured Code Review route only, existing role, no spawning/duplicate API
  dispatch. After source Pass API-F004 FIRST corrected public native+managedHTTP
  exact fresh bytes within5s, warmed repeated1KiB/1MiB source writes, then complete
  remaining current-product/platform/native-agent/physical/preview/release gates.
- API004 CR005 reboot/Stop/policy/replacement/detach resolutions preserved, including
  empty-DNS HostConfig normalization caveat. CR001–004 scoped resolutions retained.
  DEC015/D001 deferred notfixed; IMP-D001 source/AGY/local unchanged; FUP001 PMcustody
  and separate peerNAT limit; only MacDocker STORAGE deferred. Empty qualification/
  unavailable Guide honest. No merge/push/tag/release/TaskDone/user-verification claim.
