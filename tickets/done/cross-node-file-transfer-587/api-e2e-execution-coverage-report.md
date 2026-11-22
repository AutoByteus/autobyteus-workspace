# API/E2E Execution Coverage Report — cross-node-file-transfer-587 (autobyteus-587)

## Round

- Coverage investigation: `tickets/in-progress/cross-node-file-transfer-587/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-005`
- Test progress log: `api-e2e-test-progress.md`
- **Round 5 and trigger:** the code reviewer's CRR-011 Pass, a full re-audit at IR-007. HEAD `05ffe64554` (the code is `11b7ed5444`, documents only after). Since round 4: IR-004 (merge with autobyteus-591), IR-005 (SR-010/SR-011, DEC-009), IR-006/IR-007 (owner signatures). Plan and gaps: the investigation's "Round 5" section. Evidence: `evidence/API-R5/`.

  | Case | Decision | Result (`evidence/API-R5/` unless named) |
  | --- | --- | --- |
  | Whole server unit suite | Reused: IMP-29 on `11b7ed5444` (only documents since) | `Tests  8821 passed` |
  | API-02 typechecks | Reused: IMP-28; the server rerun after my test edits | server `1000 in 313 files (baseline 1000 in 313 files)` PASS (`API-02-server-typecheck.log`) |
  | API-12 fresh start | Rerun | fresh clone of `05ffe64554`: `install exit 0`; both typechecks PASS |
  | API-04 whole `test:integration` | Rerun (TESTING.md row: required owner inputs changed) | `Tests  517 passed`, 0 failed |
  | API-05 whole `pnpm test:e2e` | Rerun | `Test Files  128 passed`; `Tests  574 passed`, 0 failed |
  | API-06 two-server suite | Rerun, with RC-60 and RC-61 new, RC-19 and RC-57 tightened, RC-23's stale title fixed | `Tests  61 passed (61)` on the first run (`API-06/`) |
  | API-07 contract stories | Rerun after CR-587-05 (API-11b) | run 1: §5.2 ✓, §5.3 ✓; §5.1 differed only at S25 (B's temp workspace, the documented peer-start note, extended to S25's team). Run 2, §5.1: ✓, 0 differences in every step, S18/S19/S25 included (`stories/`) |
  | API-07a (diagnostic) | contract stories with `CONTRACT_STORIES_CONTINUE=1` against the old fixture, before the model change | every server difference: `copiedFrom` (S1, S5, S17, O5), `counterpart` (S18, U9), and S25 (DEC-009) with its S26/S27 effects. Exactly what the updated model now states (`stories-before/`) |
  | API-11b model | New | fixture regenerated, `--check` matches, walkthrough exit 0; probe after S18/S19 and after the assigner sets T7 to TODO (`model/`) |
  | API-08 CPW | Rerun | run 1: M-26 expected the pre-SR-011 text (stale); run 2: 14/14 |
  | API-09 MSP-08, MSP-93 | Rerun (MSP-93 continues a closed run on the node path) | MSP-08 Pass. MSP-93 run 1 Fail: its send lacked `node`, so `NODE_REQUIRED` (RF-14, stale test). After the fix, run 2 Pass (`msp/`) |
  | API-10 tracked imports | Rerun | passed, 103006 files |
  | API-13 autobyteus-22's Team suite | Rerun | 11/12; TF-04 as round 4 (`interruptAck` null, released), FU-005, base |

- Round 4 and trigger: the code reviewer's CRR-006 Pass of IR-003, the merge with `origin/personal` `6533d7be04` (autobyteus-22, team-run-follows-definition) as `575c4ec9ed`. HEAD `72b84f3c33` (documents only after the merge).
- **Case IDs from round 4:** autobyteus-22 added its own `RC-51` to the two-server suite, which the base already holds; this ticket's RC-51 … RC-54 are now **RC-55 … RC-58**. Round 1–3 records and evidence keep the old IDs: RC-51 → RC-55, RC-52 → RC-56, RC-53 → RC-57, RC-54 → RC-58. Both cases had called `record("RC-51", …)`, so the receipt kept only one of them (IMP-13's run included).
- Round 4 rerun plan, following TESTING.md § Rerun by impact. `git diff --name-only a3e86ad971 72b84f3c33` includes both contract packages (`autobyteus-team-stream-contracts`, `autobyteus-collaboration-stream-contracts`, `src` and `dist`) and `typecheck-baseline.json`. That is a shared foundation, so every case is Rerun. Runs already made on `575c4ec9ed` count:

  | Case | Decision | Evidence (`evidence/API-R4/` unless named) |
  | --- | --- | --- |
  | Whole server unit suite | Reused: IMP-11 on `575c4ec9ed` | `Tests  8764 passed` |
  | API-02 typechecks | Reused (IMP-10); rerun after my renumbering | server `1004 in 314 files (baseline 1004 in 314 files)` PASS; web `86 in 36 files` PASS (`API-06/API-06-two-server.log`) |
  | API-12 fresh start (build inputs: contract packages, baseline) | Rerun | `API-12-fresh-start-typechecks.log`: fresh clone, `install exit 0`, both typechecks PASS |
  | API-04 whole `test:integration` | Rerun | `Tests  517 passed`, 0 failed |
  | API-05 whole `pnpm test:e2e` | Rerun | `Test Files  128 passed`, `Tests  574 passed`, 0 failed |
  | API-06 two-server suite | Rerun after renumbering (IMP-13 ran it before) | `Tests  55 passed (55)`; the receipt holds `RC-51` (autobyteus-22) and `RC-55` … `RC-58` apart |
  | API-07 contract stories §5.1–§5.3 | Rerun | red, not because of 587: FU-002, plus FU-006 (autobyteus-22's `copiedFrom`, which the 461 model lacks; §5.1 now stops at S1 and §5.3 at O5) |
  | API-08 CPW | Rerun | 14/14 |
  | API-09 MSP-08 | Rerun (the merge changed the web's run tree and Team view) | `[mobile-shell] MSP-08 Pass` |
  | API-10 tracked imports | Rerun | passed, 102898 files |
  | API-13 autobyteus-22's gated Team suite (new) | Run: it drives the merged Team root with this ticket's `remoteFiles` | 11/12. TF-04 fails twice on the merged branch, the second time alone at lower load, **and also on the base `6533d7be04` in a fresh clone without 587's code**. The leaving member is interrupted and released, but no `AGENT_COMMAND_ACK` arrives. It predates this ticket: FU-005 (urgent) |
  | API-11 model check | Still valid | the model, stories and fixture are unchanged |
- Round and trigger: round 3; the code reviewer's CRR-004 Pass of IR-002. Delivery's DEL-03 found ten stale unit tests after its merge of `origin/personal` (`3be417f8df`); IR-002 (`e295b74b81`) fixed them. Round 2: the code reviewer's test-code review CRR-002 Fail, T-001 (`api-e2e-test-review-report.md`). Round 1: the code reviewer's CRR-001 Pass (code `e327ba2467`).
- Round 3 rerun plan, following TESTING.md § Rerun by impact. The validated commits are `71be9e9e8e` (rounds 1–2) and HEAD `008981c6bd`. `git diff --name-only 71be9e9e8e 008981c6bd` covers:
  - the merged base: server `src` in the work journal, busy runs and runtime handover notices, none of it in this ticket's files; an additive `journal_reads` case in `agy-failure-cli.mjs`; web app-update and notification files; iOS icons; documents;
  - IR-002: three server unit test files and two `AgentTeamRunManager` constructions.

  | Case | Decision | Reason / evidence |
  | --- | --- | --- |
  | Whole server unit suite | Reused (IMP-06 on `e295b74b81`, `8698 passed`) | Only documents changed after it. Round 1 relied on IMP-03's affected set instead of this suite, which is how the stale constructions reached delivery. The check is now in TESTING.md (below) |
  | API-02 typechecks | Reused (DEL-01 on the merged base; IMP-08/09 on `e295b74b81`) | both at baseline |
  | API-06 two-server suite | Reused (DEL-02 on the rebuilt merged server, `Tests 54 passed (54)`) | no ticket source or two-server test changed after it |
  | API-04 whole `test:integration` | **Rerun** on `008981c6bd` (after `pnpm -C autobyteus-server-ts build`) | the merged server `src` | 
  | API-05 whole `pnpm test:e2e` | **Rerun** | the merged server `src` and web |
  | API-08 CPW | **Rerun** | the merged runtime-handover notice builder and the AGY fixture |
  | API-10 tracked imports | **Rerun** | new tracked files |
  | API-07 contract stories | Not rerun | still red only for FU-002 (the base holds no fix); its 587 steps are unchanged since the round-2 rerun |
  | API-09 MSP-08 | Still valid | the merged web files (app update, notifications, About settings) are not on the Messages view's path; the server side is in API-05 |
  | API-11 model check | Still valid | the model, stories and fixture are unchanged |
- Prior round reviewed: round 1 (API-REV-001). Round 2 changes only the contract stories' authority (the 461 model and its stories) and the regenerated fixture: case API-11, and API-07 rerun for §5.1. The other cases of round 1 stand, since no test or source they run changed.
- Deviations from the plan, and why:
  - Found while running: the two-server RC-19 (a peer removed; under RF-14 the reply names its node, so the refusal is the unknown-node text); the contract stories' S18/S19 drivers (beta's lead messaged M without `node`); `node-access-model`'s signed peer message (no `files`, so 400). Each was rewritten to the approved behaviour.
  - The capturing proxy of the two-server suite re-encoded every body as UTF-8 text, which would corrupt binary pieces. It now forwards raw bytes and gains a `tamper` hook (AC-003).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-file-transfer-587/tickets/in-progress/cross-node-file-transfer-587/evidence/`

## Routing Classification

- Task size: `Large`; Architectural risk: `High`; Input route: `Reviewed`; Successful-output route: `Code Review`; test-code review: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime / Build | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | code `e327ba2467` (HEAD `17ee6b7858`, documents only after the code); tests as committed in the API/E2E test commit | macOS 26 (Darwin 25.5.0), arm64 | Node 22.23.1; this worktree's `autobyteus-server-ts/dist` (`pnpm -C autobyteus-server-ts build`, exit 0), Brief Studio package (`test:integration:prepare`) | Scripted AGY CLI; `env -i`; test-owned nodes alpha, beta (and theta, zeta, gamma/delta/epsilon where the suite starts them), capturing proxies between alpha and beta; files of random bytes behind real format headers (`.mp4` `ftyp` box, `%PDF-1.4`, PNG signature): 20 MiB, 5 MiB, 3 MiB, 2 MiB, 150/120/60/40 KiB |

## Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-004, AC-005 (unit), AC-007 (unit), AC-008, AC-009 (Codex/Claude configs, DEC-008 (b)), AC-011, AC-010 (in-process) | server unit; in-process two nodes; fresh clone | Reused: IMP-01, IMP-03, IMP-04, IMP-05 | — | Pass | (implementation handoff rows) | — | Ran on `e327ba2467`; no `src` change since (HEAD changes are ticket documents and my tests only). |
| API-02 | — | typechecks of my test edits | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck` | ENV-1 | Pass | `API-02-web-typecheck.log`; server result in the progress log | `[typecheck] production errors: 0; test-file errors: 86 in 36 files (baseline 86 in 36 files)`; server `test-file errors: 1005 in 315 files (baseline 1005 in 315 files)` | Both at baseline after the edits. |
| API-04 | wire, all | whole server integration suite | `pnpm -C autobyteus-server-ts test:integration`; then the three failed files alone after their fixes | ENV-1 | Pass (after test fixes) | `API-04-integration.log` | `Tests  13 failed \| 501 passed \| 69 skipped (583)`, then `Tests  29 passed \| 8 skipped (37)` | All 13 failures were tests made untrue by this change, rewritten to the new behaviour: the Team manager now needs `remoteFiles` (8 constructions; TypeError 'outgoing'), Claude's MCP config now sets `timeout: 3_600_000` (RF-6/DEC-008), and `node`'s description now says it is required across nodes (RF-14). |
| API-05 | wire, all | whole ungated server E2E | `env -i PATH HOME=<fresh temp> TMPDIR pnpm test:e2e` | ENV-1 | Pass | `API-05-e2e.log`, `API-05-e2e-full.log.gz` | `Test Files  128 passed \| 155 skipped (283)`; `Tests  574 passed \| 731 skipped (1305)`; `EXIT 0` | Load average about 21–30 at start; no load failure. Gated suites ran separately (API-06 … API-09). |
| API-06 | AC-001, AC-002, AC-003, AC-005, AC-006, AC-007, AC-010, RF-7, RF-11, RF-14, QR (gate) | two built servers (and a third, theta) through capturing proxies, scripted AGY | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture> env -i … vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | ENV-1 | Pass | `API-06/API-06-vitest.log`, `API-06-receipt.json`, `API-06-rc19-receipt.json`, server logs `.gz` | Run 1 `Tests  1 failed \| 53 passed (54)` (RC-19's expectation); run 2 `✓ RC-19 AC-102: after a peer is removed …`; receipt `RC-51.order` = status, three PUTs of the 20 MiB `.mp4` at 0/8388608/16777216, one each for the PDF and PNG, then `delegated-runs`, then the `work_packet`; `facts[*]` `readOnly: true, links: 2, sameAsStore: true`; `RC-52.tooBig: 413`; `RC-53.offsets: [8388608,16777216]`; `RC-54.uploads: [1,0]`, `afterBothLinks: 1` | RC-19 asserted the old linked-route text for a reply after peer removal; under RF-14 the reply names its node, so the unknown-node refusal is right; rewritten and rerun. RC-51 … RC-54 new; 37 existing cross-node sends now name their node; RC-06/RC-08/RC-22/RC-19 assert `NODE_REQUIRED`; RC-09 asserts the RF-3 refusals; RC-20 audits pieces and the status route. |
| API-07 | RF-14 (contract) | gated contract stories §5.1–§5.3 on two built servers | `RUN_AGY_FAILURE_E2E=1 … vitest run tests/e2e/projects/collaboration-contract-stories.e2e.test.ts` | ENV-1 | Fail (not caused by this ticket; FU-002) | `API-07/API-07-contract-stories.log`, `contract-stories-5.*.json` | Run 1: S18 refused `NODE_REQUIRED` (driver without node). Run 2: `✓ §5.3 O0 … O9`; S18 and U9 differ only by `…counterpart: not in the contract ({"address":"/lead","nodeId":"srv_…"})` | The S18/S19 drivers now name the node (RF-14); with it S18 is delivered as the model says. The remaining difference is 565's `counterpart` field on unrelated and cross-node lines, which the 461 model does not know; U9 is a one-node story untouched by 587. The 565 round did not run this gated suite (my miss). Follow-up FU-002, urgent. Round 2 rerun of §5.1 against the regenerated fixture (`API-11/API-07-rerun-5.1.log`): `Tests  1 failed \| 2 skipped (3)`; S18's whole difference is the same two `counterpart: not in the contract` lines. |
| API-08 | reply-instruction wording | gated prompt wording suite | `RUN_AGY_FAILURE_E2E=1 … vitest run tests/e2e/…/collaboration-prompt-wording.e2e.test.ts` | ENV-1 | Pass | `API-08-cpw.log` | `Tests  14 passed (14)` | — |
| API-09 | RF-14 on the phone stack | built mobile web bundle + server | `pnpm -C autobyteus-web build:mobile-web`; `test:e2e:mobile-shell --cases=MSP-08` | ENV-1 | Pass | `API-09/API-09-mobile-shell.log`, `mobile-shell-probe.json`, `MSP-08-standalone-messages.png` | `[mobile-shell] MSP-08 Pass` | MSP-08's PTM send to its linked remote run now names the node. |
| API-10 | — | tracked imports | `python3 scripts/check_repository_artifact_hygiene.py --only tracked-imports` | ENV-1 | Pass | `API-10-tracked-imports.log` | `Tracked-import check passed. Tracked files scanned: 102275` | — |
| API-11 (round 2, T-001) | RF-14 (REQ-009, DEC-006, AC-010) in the contract's executable model | the 461 model (`tickets/done/delegated-copies-outlive-delegator-461/evidence/collaboration-model/`), its stories, the generated fixture `autobyteus-server-ts/tests/fixtures/collaboration-contract/contract-states.json` | `python3 -I …/export_contract_states.py <model> <fixture>` (regenerate), then with `--check`; `python3 -I <model>/walkthrough.py`; `python3 -I evidence/API-11/T001-model-node-probe.py <model> S18`, then `S19` | ENV-1, Python 3.9.6 | Pass | `API-11/API-11-model-rf14.log`, `API-11/T001-model-node-probe.py` | `contract-states.json matches the model`; the fixture diff is `2 insertions(+), 2 deletions(-)`, S18's and S19's `call` texts only; after S18, for each of the three senders, `node=None: REFUSED NODE_REQUIRED`, `node='node-c': REFUSED NODE_MISMATCH`, right node `DELIVERED`; after S19, M without node `REFUSED NODE_REQUIRED`, another run of A without node `REFUSED TASK_AGENT_RESOURCE_CLOSED`, right node `REFUSED TASK_AGENT_RESOURCE_CLOSED` | `send_by_run_id` takes `node`. Its new `_node_rule` follows the server's order, traced in `global-agent-run-message-router.ts`, `standalone-root-message-delivery.ts` `deliverExact`, `cross-run-message-delivery.ts` `peerRunAdmission` and `remote-message-send.ts`: a wrong node is `NODE_MISMATCH` first. Without node, the sender's own root, when it links the run (delegator or delegated, closed or not), answers `NODE_REQUIRED`. Otherwise this node's Task entries answer: `CLOSED` when all are closed, else `NODE_REQUIRED`. The texts are those of `remote-refusal-codes.ts`. `node-c` stands for a third registered peer. The states are unchanged, because S18/S19 already passed the right node. |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-only / accepted-risk part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-06 (RC-51) | Proven | — (20 MiB `.mp4`, not 300 MB: same piece, resume and verify paths) |
| AC-002 | Yes | API-06 (RC-51: the task agent's reply with a file returns to alpha, `files_sent: 1`, alpha's fact `sameAsStore: true`; the PM case by `run-messages` to `bystander`, path `received_files/<scout run>/notes.pdf`, SHA-256 equal) | Proven | The requirement's "linked, no `node`" is superseded by RF-14 (DEC-006): the reply names its node; without it it is refused (AC-010). |
| AC-003 | Yes | API-06 (RC-52 `damaged` via the proxy's tamper hook; `mismatch` signed piece of other content) | Proven | Wording of the reason: OBS-1. |
| AC-004 | Yes | API-01 (unit), API-06 (RC-09: outside workspace, link out, folder) | Proven | — |
| AC-005 | Yes | API-06 (RC-52 `oversize`, `forgedOversize`, `tooBig` 413), API-01 | Proven | — |
| AC-006 | Yes | API-06 (RC-53: proxy cuts the link mid-upload; the call names `render.mp4`, no message sent; partial 8 MiB; resume) | Proven | — |
| AC-007 | Yes | API-06 (RC-54: uploads `[1,0]`; history deletes through the app's mutation; link count 1 after both; after a 25 h clock set-back, the cleanup run by the next history delete removes the unlinked store entry and the partial, and keeps the bytes a run still links (the 20 MiB `.mp4`)), API-01 | Proven | — |
| AC-008 | Yes | API-01, API-04, API-05 (local `reference_files` suites unchanged and passing) | Proven | — |
| AC-009 | No | API-01 (Codex `tool_timeout_sec`, Claude `timeout` in materialized configs; API-04's Claude config test) | Proven for Codex/Claude/AutoByteus by DEC-008 (b); `Accepted Unverified Risk (DEC-008)` for AGY/Grok/ACP | Signed-in runtimes may not be used by tests (TESTING.md); FU-001. |
| AC-010 | Yes | API-06 (RC-51 `noNode`, `wrongNode` with theta, then delivered), API-01 | Proven | — |
| AC-012 (round 5) | Yes | API-06 (RC-60) | Proven | — (a new Agent copy and a new Team copy from a saved Task, the files in the entry agent's folder; the existing copy with `node`, refused without or with the wrong node and nothing sent; a context file outside the workspace travels, the same file as a reference file is refused) |
| AC-011 | No | API-01 (path policy and scanner unit tests) | Proven by unit (planned evidence) | A Memory Hub export end to end was not run (planned, low risk). |

## Observations For Review (not acceptance failures)

| ID | What | Evidence | Why not a Fail | Suggested owner |
| --- | --- | --- | --- | --- |
| OBS-1 | A piece damaged in transit is refused by the receiver's gate (the signed body hash no longer matches: 401 `NODE_CREDENTIAL_INVALID`). The sender reports it as `REFERENCE_FILE_TRANSFER_FAILED` with the reason "This node and node \"beta-node\" are not paired, so nothing was done there. The user can pair them again on the Nodes page". The file is named and nothing is delivered, but the reason misleads: the nodes are paired, and re-pairing does not help. | `API-06/API-06-receipt.json` `cases["RC-52"].damaged.message` | AC-003 requires that verification fails, nothing is delivered and the agent is told which file. All three hold, and the code is RFC-001 § 5's code for a refused piece. The wording comes from the peer client's generic 401 mapping (autobyteus-437). | Code reviewer / Solution Designer: a piece's 401 could be worded as "refused the piece (damaged in transit, or the nodes are no longer paired)" |
| OBS-2 | After the peer is removed, a reply without `node` to the linked run is refused `NODE_REQUIRED` naming the raw node ID: "This agent runs on node \"srv_…\"; pass node: \"srv_…\" with its run id." The agent cannot pass that; before RF-14 the text said the node "is no longer a registered peer of this node". With `node` (as RF-14 asks) the refusal is the clear unknown-node text. | `API-06/API-06-rc19-receipt.json` `cases["RC-19"].fromBetaNoNode` | The send is refused and nothing is sent (AC-102 of 191 holds). The design names `peerName(nodeId)` for this refusal, whose fallback for an unknown node is the ID; the case of a removed peer was not considered. | Solution Designer (design wording of DS-005 for a removed peer) |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository | Final | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 96% | API-01, API-06 | AC-009 on AGY/Grok/ACP (DEC-008) | FU-001 |
| Changed-boundary execution directness | 75% | 96% | API-06 (real gate on raw bodies, real body limit, real HTTP, real filesystem) | — | — |
| Cross-boundary integration realism and mock gap | 70% | 94% | API-06 | scripted AGY instead of a model; files up to 20 MiB | a 300 MB run (time and disk only) |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | API-05, API-06 (`env -i`, fresh homes, built dist) | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | 95% | API-06 RC-52/53/54, RC-19 | the narrow race of a Task closing between placement and log commit (recorded residual) | — |
| User-surface, browser, and desktop-shell confidence | N/A | 95% | API-09 | server-only change | — |
| Durable regression coverage quality and relevance | 85% | 95% | RC-51 … RC-54 and the updated suites | API-07 red for FU-002 | FU-002 |

- Overall post-repository confidence: 78%. Overall final confidence: 95%.
- Calculation method: the lowest applicable final category (94%) weighed with the others; repository-only evidence could not reach the real gate, body limit or filesystem.
- Every critical acceptance criterion directly proven: `Yes`.
- Any final applicable category below `90%`: `No`.
- Default final confidence target of `95%` met: `Yes`.
- Confidence-limiting residual risks: AGY/Grok/ACP tool-call limits (FU-001); OBS-1 and OBS-2 wording; the narrow race named in the review.

## Broader Validation Decision (Mandatory)

- Decision: `Required` — executed.
- Execution mode: `Worker or Distributed` (two and three built servers, capturing proxies), `Browser` for MSP-08 only.
- Gap addressed: the real gate hashing an octet-stream body, the scoped 8 MiB limit, real link counts and history delete, a real broken connection.
- Browser validation: only MSP-08, because my 565 probe case messages a linked remote run; the change is server-only otherwise.

## Persisted-Data Transition Checks

- Approved decision: new data only (the node store `<data>/received_files`, per-agent `received_files/`); no migration.
- Existing data: the two-server fixtures' run histories and Task records start without received files and keep working (API-05, API-06 old cases).
- No version branch or fallback observed. Residual risk: none found.

## Compatibility / Legacy Scope Check

- Requirements/design introduce compatibility in scope: `No`. Observed in implementation: `No`. Durable coverage only for compatibility: `No`.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage updated this round: `Yes` (commit `eaf53c5c7b`).

| Path / Test | Change | Case IDs |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Added RC-51 … RC-54; Updated RF-14 sends, RC-06/08/09/19/22, RC-20 audit, forged bodies, `CapturingProxy` (raw bytes, `tamper`) | API-06 |
| `autobyteus-server-ts/tests/e2e/node-access/node-access-model.e2e.test.ts` | Updated (`files: []`) | API-05 |
| `autobyteus-server-ts/tests/e2e/projects/collaboration-contract-stories.e2e.test.ts` | Updated (S18/S19 drivers name the node) | API-07 |
| `autobyteus-server-ts/tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts` | Updated (`remoteChannel`, `remoteFiles`) | API-04 |
| `autobyteus-server-ts/tests/integration/agent-execution/claude-session-manager.integration.test.ts` | Updated (`timeout: 3_600_000`) | API-04 |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Updated (node description) | API-04 |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated (MSP-08 names the node) | API-09 |
| Round 5: `remote-delegation-two-server.e2e.test.ts` | Added RC-60 (AC-012), RC-61 (R1 order); RC-19 asserts `NODE_NOT_PAIRED` on both sides; RC-57 asserts the in-transit code and text exactly; RC-23's title no longer claims the DEC-009-replaced refusal; header | API-06 |
| Round 5: `collaboration-contract-stories.e2e.test.ts` | S25's driver: a saved Task to a new peer copy, bound, then stopped on node B; the peer-start known note names S25's team | API-07 |
| Round 5: `collaboration-prompt-wording.e2e.test.ts` | M-26's expected text follows SR-011 | API-08 |
| Round 5: `autobyteus-web/tests/e2e/mobile-closed-delegation-cases.mjs` | MSP-93's continuation names its node (RF-14) | API-09 |
| Round 5: the 461 model `model.py`, `stories.py`; `contract-states.json` regenerated | `counterpart`, `copiedFrom`, the no-node rule, 591's cross-node continuation, DEC-009's S25 (CR-587-05) | API-11b, API-07 |
| Round 2: `tickets/done/delegated-copies-outlive-delegator-461/evidence/collaboration-model/model.py` (the contract stories' authority) | Updated (T-001): `send_by_run_id(…, node=None)`; `_node_rule` with the RF-14 rule; texts `NODE_REQUIRED`, `NODE_MISMATCH` | API-11 |
| Round 2: `…/collaboration-model/stories.py` | Updated: S18's and S19's operations and call texts pass `node: "node-a"` | API-11, API-07 |
| Round 2: `autobyteus-server-ts/tests/fixtures/collaboration-contract/contract-states.json` | Regenerated (S18/S19 call texts) | API-11, API-07 |

- Paths attached for proportional test-code review: `Yes`. No removals.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Model runtimes | scripted AGY CLI fixture | tests may not use the founder's accounts | AC-009 on AGY/Grok/ACP unmeasured (DEC-008) |
| Network faults | capturing proxy (tamper, cut link) | deterministic | — |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup Action | Result |
| --- | --- | --- | --- |
| Test-owned servers, data dirs and temp homes | Yes | suites stop their servers and remove their temp dirs; `env -i` homes in `$TMPDIR` | no process left (checked) |
| `/tmp/api587` logs | Yes | kept summaries in the evidence folder | kept |
| built `dist/` of the SDK packages | Yes | untracked build outputs, not staged | left untracked |

## Latest Authoritative Result

- Result: `Pass`.
- Criteria not proven, user-only, or accepted risk: AC-009 for AGY/Grok/ACP, `Accepted Unverified Risk (DEC-008)`.
- Evidence decisions requested: `None`.
- Round 5 result: **Pass.**
  - CR-587-05 is done: the 461 model states 565's `counterpart`, 22's `copiedFrom`, IR-005's no-node rule, 591's cross-node continuation and DEC-009's S25. The gated contract stories pass in all three sections, and this ticket's S18/S19/S25 run there with zero differences.
  - AC-012 and the R1 order are proven over real HTTP (RC-60, RC-61); NODE_NOT_PAIRED and the in-transit wording are pinned exactly (RC-19, RC-57).
  - Three stale tests were rewritten to the approved behaviour: CPW M-26 (SR-011 text), MSP-93 (RF-14 `node`), and the stories' S25 driver (DEC-009).
  - Still red on the base only: autobyteus-22's TF-04 (FU-005).
  - Next recipient from `get_handoff_rules`: `/code_reviewer` (test-code review of round 5's test changes).
- Next recipient (round 4) from `get_handoff_rules`: `/code_reviewer` (test-code review of IR-003's merged test files and my RC-55 … RC-58 renumbering, round 4).
- Round 4 result: Pass. Every case this ticket's code reaches passes on `575c4ec9ed`. Two gated suites are red on the base itself:
  - the contract stories: FU-002 and FU-006, the 461 model lacks fields from 565 and autobyteus-22;
  - autobyteus-22's TF-04: FU-005, which fails identically on `6533d7be04` without 587.

  The cross-node steps of §5.1 are not reached in this run (it stops at S1). RF-14 on the merged code is proven by the two-server suite (RC-06, RC-08, RC-19, RC-22, RC-55).
- Round 3 results on HEAD `008981c6bd` (`evidence/API-R3/`):
  - API-04: `Tests  514 passed | 69 skipped (583)`, 0 failed;
  - API-05: `Test Files  128 passed | 156 skipped (284)`, `Tests  574 passed`, 0 failed;
  - API-08: `Tests  14 passed (14)`;
  - API-10: `Tracked-import check passed. Tracked files scanned: 102566`.
- Guide change (round 3): TESTING.md § Choosing the path gains a row. When a change adds a required input to a server owner that tests construct directly, run the whole server unit suite and the whole `test:integration`, and search for the owner's constructions; the typecheck baseline hides stale ones. This is the check delivery proposed (DEL-03).
- Notes:
  - Round 2 resolves T-001 (API-11): the 461 model now states RF-14, and S18/S19 pass the node in the model as in the driver.
  - API-07 is still red, but not because of this ticket. The cause is 565's `counterpart`, which the contract model lacks; it is tracked as FU-002 (urgent). Every 587 step of that suite behaves as the contract says.
  - OBS-1 and OBS-2 are now FU-003 and FU-004.
