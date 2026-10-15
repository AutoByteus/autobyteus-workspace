# API/E2E Execution Coverage Report — API-REV-009

## Latest authoritative result

**Pass — 95% confidence. Affected integrated repository validation complete;
API008 command-only shared-filesystem Pass95% remains valid. Cleanup Complete.**

INT01–06 all Pass. Fresh current builds/typecheck and **66 unique tests /12files**
passed; the six-case REST suite passed again after adjacent suites (72 executions,
not72 unique tests). No in-scope failing, blocked or unstarted case remains.
No production or durable test was edited by API009.

The filesystem verdict is still based on **FS01–FS17 Linux-command evidence**,
not the application. This continuation validates IR011's repository test-fixture
merge/lifecycle only. It does **not** reinstate UI/editor/API product acceptance,
repeat the VM campaign, claim live-editor closure or extend platform qualification.
[User direction](evidence/api-e2e/api-rev-008/user-command-only-direction.json)
controls over older application-gate wording. No Designer contact/approval loop.

## Round, package and ownership

- Input HEAD **bd57ef932dcd9e12c8470f0a1accbce0928d7ae5**: reviewer handoff-receipt
  only after review8082eb2478016b9a1ac0402a937846c5906e54df. Actual integrated
  source merge **a4afd758a9766274b08f675c04952b19913fff0c**, recovery4f44d115 +
  personal5096011674. IR011 handoff1ea11e4eea; source/runtime unchanged by the receipt.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`,
  branch `codex/shared-network-workspaces`; Task
  `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`; **Large / High / Reviewed**.
- Current upstream: implementation-handoff.md/history IR011; code-review-report.md
  /history CRR017 Pass; api-e2e-test-review-report.md CRR016 prior Pass; delivery
  history/handoff-summary DR001. DR001 is Delivery's last verdict, not overwritten
  here. Delivery's integrated evidence judgement and finalization remain downstream.
- ApprovedSR025/DEC017 and technicalSR023/ARCH007, historicalARCH008/SR024, requirements,
  design, investigation and solution history remain context, qualified by later
  direct user command-only direction. No new source/architecture decision. Legacy
  check clean; IR011 persisted-data transition **Not Affected**. Keep IR010.
- Own investigation/ledger prepared before execution, then updated per case.
  Personal execution, no delegation. No target merge/push/tag/release/deployment,
  TaskDone or user verification. No release remains guide default.

## Scope and validity decisions

IR011 reconciles only the REST fixture (**6add/2del**); its six test bodies are
byte-identical to the prior reviewed ticket. Composed runtime is suite-owned;
public workspace removal runs while process authorities live; active lookup and
registered-root lookup must be absent afterward; afterAll closes Fastify before
removing its data root. Base route-only private-map/per-test-close cleanup was
correctly not transplanted. Existing helper and workspace manager are unchanged.
This is the established TESTING.md owned-lifecycle contract and DR001 Local Fix,
not a new shared-filesystem requirement.

The REST, workspace unit, explorer integration and search-content HTTP suites
remain **Still Valid** for their boundaries. No stale/disabled assertion or
uncovered material changed behavior requires more durable coverage. Real network
and lifecycle checks complement unit doubles. Imported composition's additional
service wiring and search's relative locators receive focused integrated proof.
Browser/editor/agent/platform suites are **Out Of Scope**, not Passed by omission.

Cumulative af9f23/IR010 test work already received CRR016 proportional Pass. Only
IR011's small REST lifecycle delta needs fresh successful-test review now; its
helper is reused unchanged. No test deletion or framework change in this round.
Temporary E9 runners/audits are evidence, not production/durable framework edits.

## Environment and commands

Read current root AGENTS.md/DESIGN.md/TESTING.md, server AGENTS.md/README Tests,
package.json/vitest.config.ts, integration prerequisite script and Prisma setup.
No nearer testing guideline or policy conflict. Five preexisting dist trees are
not suitable current build proof and were left untouched.

Owned scratch `ab-nfs-api009-it7j_h8l` archived every tracked file except root
`tickets/`; all **7,330** files matched original source before/after execution.
Fresh filtered frozen dependency install (Brief Studio closure10/13packages),
normal `test:integration:prepare` builds current server/shared/SDK/devkit/Brief
Studio outputs and generates Prisma. Private HOME/TMPDIR/cache/test SQLite DB;
clean PATH/HOME/TMPDIR/CI/NO_COLOR only. No provider gates/keys, credentials,
user app data, VM, Docker or browser. Owned test listeners use loopback/port0.

Exact argv, cwd, tool versions, process IDs, timing, exit status and log hashes:
[E9/checks-result.json](evidence/api-e2e/api-rev-009/checks-result.json).
Runner: [run-integrated-checks.py](evidence/api-e2e/api-rev-009/run-integrated-checks.py).

1. `pnpm --filter @autobyteus-example/brief-studio-authoring... install --frozen-lockfile`
2. `pnpm -C autobyteus-server-ts test:integration:prepare`
3. `pnpm -C autobyteus-server-ts typecheck`
4. `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts --no-watch`
5. Same Vitest invocation for `tests/unit/workspaces`.
6. Same invocation for `tests/integration/file-explorer/file-explorer.integration.test.ts`
   and `tests/e2e/file-explorer/search-content-http.e2e.test.ts`.
7. Repeat step4 after adjacent suites; verify owned REST/search fixture dirs absent.

## Acceptance-Criteria Proof — current integration round

Evidence root: `tickets/in-progress/shared-network-workspaces/evidence/api-e2e/api-rev-009/`.
[Machine summary](evidence/api-e2e/api-rev-009/final-summary.json), canonical ledger.
These are repository-maintenance obligations, not an application acceptance gate.

| Basis / cases | Result and direct proof | Limit |
| --- | --- | --- |
| TESTING current source/build; DR001/IR011 readiness / INT01 | Pass: [checks-result](evidence/api-e2e/api-rev-009/checks-result.json), install/prerequisite/typecheck exit0; [scope audit](evidence/api-e2e/api-rev-009/scope-audit.json) | Focused integrated source/build, not whole imported-base product qualification |
| TESTING public teardown/owned lifecycle; SCN006/REQ011/AC010 retained regression / INT02 | Pass6: [REST log](evidence/api-e2e/api-rev-009/workspace-rest.log); real composed runtime/public removal, active undefined/registration null; normal app.close | One actual socket HTTP/GraphQL journey, five Fastify injection controls; no NFS/browser claim |
| Workspace lifecycle/registration/shared binding regression / INT03 | Pass48/9files: [workspace log](evidence/api-e2e/api-rev-009/workspace-unit.log) | Units include doubles; not storage-kernel or live runtime proof |
| Imported relative locators/tree/mutations/content integration / INT04 | Pass12/2files: [adjacent log](evidence/api-e2e/api-rev-009/adjacent-explorer.log); actual temporary files, socket search→PDF/text/containment | Separate route-only search fixture; no UI/PDF rendering claim |
| Composed fixture remains repeatable after adjacent suites / INT05 | Pass6 repeated: [repeat log](evidence/api-e2e/api-rev-009/workspace-rest-repeat.log); owned fixture directories absent after both REST runs | Repeat execution, not additional unique coverage; no forced timing/invented scenario |
| TESTING cleanup / AC011 API-owned resources / INT06 | Pass: [cleanup](evidence/api-e2e/api-rev-009/cleanup.json), no owned processes/cwds; scratch/DB/cache/build removed; original source and294 protected files unchanged | Does not close Delivery cleanup/finalization |

## Acceptance-Criteria Proof — carried command-only filesystem result

API008 remains **FS01–FS17 Pass95%**. [Scope audit](evidence/api-e2e/api-rev-009/scope-audit.json)
verifies exact unchanged NFS/launcher/workspace/IR010 paths, ten critical API008
files against its commit and thirteen nested carried receipts against recorded
hashes. Whole server has unrelated integrated-base changes; it is **not** called
byte-identical. No new application image-on-NFS qualification is inferred.
The full prior report remains in git at a53c133a262ca859e8b8103c737a0ce385019aa5;
original current proof is directly linked below, not repeated runtime work.

| Scoped criteria / cases | Evidence and carried disposition |
| --- | --- |
| AC001/017/018 same original source/real NFS topology; FS01 | [LN setup](evidence/api-e2e/api-rev-008/LN-command-setup-result.json), [LD setup](evidence/api-e2e/api-rev-008/LD-command-setup-result.json): actual NFS mountinfo/marker/UUID, one Ubuntu VM/two generic shell containers |
| AC003/004 exact bytes/operations/visibility; FS02–06 | [LN commands](evidence/api-e2e/api-rev-008/LN-commands-result.json), [LD commands](evidence/api-e2e/api-rev-008/LD-commands-result.json): reciprocal cat/cmp/hash, binary/Unicode/append/truncate/rename/delete;48warmed visibility samples, max LN0.060970s/LD0.056318s <=5s, no cache flush |
| AC004/005 concurrency/locks/Git; FS07–10/12 | Same receipts:160independent files,400atomic replacements/13031complete-only reads, exclusive-create one winner, fcntl conflict/release, coordinated Git/index-lock controls |
| AC006/008/009 permissions/private state; FS11/14/15 | Same command receipts plus [scoped carry](evidence/api-e2e/api-rev-008/command-carried-evidence.json): UID/GID/mapall, execute/denial; source/selected/unselected/private configuration and bytes |
| AC007/014/017/019 lifecycle/source safety; FS13–15 | Same scoped carry: original API007 LN/LD ordinary reboots/Stop intent/reconnect/current references/source-replacement refusal/restoration, exact credited subcases; raw harness failures not promoted wholesale |
| AC006/009/014/017 safe detach; FS16 | [LN detach](evidence/api-e2e/api-rev-008/LN-command-detach-result.json), [LD detach](evidence/api-e2e/api-rev-008/LD-command-detach-result.json), carried busy/no-drain refusal; no forced/lazy unmount/source deletion |
| AC011 API-owned cleanup; FS17 | [API008 cleanup](evidence/api-e2e/api-rev-008/command-cleanup.json), [filesystem final summary](evidence/api-e2e/api-rev-008/command-final-summary.json): exact owned resources gone, original caches/builds retained |

Same-kernel/cache two-container proof is **not** independent-client/kernel,
Mac/cross-OS/physical/external-join/authenticated-agent/publication qualification.
Those scopes remain deferred/unproven, NOT Passed. No application/editor/API
acceptance or all-editor-scenarios claim. No user-only dependency is required to
finish this bounded command-only filesystem increment.

## Attempts, warnings and cleanup

- Archive attempt1 stopped before installation/tests: BSD tar `--exclude=tickets`
  also excluded611 nested historical ticket files, unlike the planned root-only
  exclusion. [Original diagnostic](evidence/api-e2e/api-rev-009/archive-attempt-1.json)
  and runner retained. Corrected to explicit top-level entries excluding root
  tickets, reused same scratch and enforced all7330 hashes. No product failure,
  ignored assertion or source/test edit. Initial plan shorthand named review8082;
  actual recorded/tested HEAD was its receiptbd57, source identical.
- Install emitted initial missing devkit-bin/default Prisma-schema warnings and
  the existing ignored @google/genai build-script notice. Normal preparation
  builds devkit, invokes its actual CLI and generates Prisma with explicit schema;
  all exit0. No install-policy relaxation. Expected SQLite experimental and
  negative-path diagnostics retained in logs, not suppressed or misread as failures.
- REST/search fixture directories already absent after suites. Workspace-unit
  temporary leftovers and test DB were confined to owned scratch, then removed.
  No surviving owned command/cwd process. Scratch, dependencies, cache, builds,
  SQLite DB/journal removed. **286 preexisting dist files +8 retained engine files**
  unchanged. Current tracked non-ticket source aggregate unchanged. No global prune.

Raw staged whitespace check reports terminal blank lines in captured test logs and
empty context lines in the git patch. Preserved original bytes/hashes; source/docs/
executable-only check passes. Initial commit chain stopped before commit, not a
test failure; [disposition](evidence/api-e2e/api-rev-009/artifact-whitespace.json).

## Confidence / broader-validation decision

Scores below are for API009's affected integration, not a whole-product score.
API008 retains its separate seven-category95% command-only score.

| Mandatory category | Post-repository / final | Evidence, residual and potential gain |
| --- | ---: | --- |
| Requirement/scoped acceptance proof |95%|All INT obligations direct; FS evidence audited at exact scope. Only negligible single-run-environment uncertainty; no new required journey missing. |
| Changed-boundary directness |95%|Actual public removal/registry/composed shutdown plus repeated suite, not only mocks. Additional VM/UI work cannot improve this test-fixture boundary. |
| Cross-boundary realism/mock gap |95%|Socket GraphQL/HTTP and real filesystem/registry; units' doubles explicitly not physical proof. No changed external integration. |
| Environment/configuration/identity/fixtures |95%|Clean current7330file archive/frozen install/current builds/private data and exact source audit; no credentials/old dist. Other OS qualification stays separate. |
| Failure/edge/lifecycle/recovery |95%|Containment/delete/missing/guard controls, public teardown and fresh repeat; safe own cleanup. No new storage recovery behavior changed. |
| User-surface/browser/desktop shell |N/A|No renderer/shell change or acceptance here; CLI evidence remains API008. Not N/A to disguise a requested live editor case. |
| Durable regression quality/relevance |95%|Six bodies preserved, two public teardown postconditions, existing valid adjacent suites; no weakened/skipped tests. Proportional IR011 test review remains workflow gate. |

Simple average of six applicable categories **95%**. No applicable category below90,
critical scoped obligation missing or material broader-validation uncertainty.
**Broader validation: Not Required for API009**, because repository execution
already reaches the actual changed public lifecycle and integrated socket/reader
boundaries with current builds. Not merely because units passed. API008 broader
filesystem validation was Required and executed; no concrete integration change
warrants repeating it. No additional user-only check is designated.

## Residuals and next gate

Historical API007 combined Fail82.14%, API006 Blocked67.86% and earlier failure
receipts are preserved. DR001 remains Delivery-owned until its resumed gates.
D001/DEC015 outage limitation, IMP-D001 and FUP001 dispositions unchanged.

IR010 original peer-refresh correction stays. **CR-FUP002** pending-Save later-edit
exception remains unresolved, nonblocking per explicit user disposition in Task
`project_task_a4f90984-add2-4300-983d-de54ded3032b`; no repair, retest, duplicate
Task/notification or new original live-editor closure. Application retained
regressions are not filesystem verdict gates.

No new in-scope finding. Successful durable-test review **Required — Large/High**:
request proportional review of IR011's REST6add/2del against fresh API009 evidence,
carrying CRR016's cumulative test review, then normal Delivery continuation.
Own four canonical docs and selected critical evidence accompany the fresh-rule
handoff. No immediate Delivery, release or completion action by this role.
