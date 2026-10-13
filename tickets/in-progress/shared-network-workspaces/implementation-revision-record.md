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
