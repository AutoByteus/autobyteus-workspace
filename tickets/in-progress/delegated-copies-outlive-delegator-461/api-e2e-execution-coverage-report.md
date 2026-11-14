# API/E2E Execution Coverage Report

This report records what ran and the result. The plan is in `api-e2e-coverage-investigation.md`, which also holds the per-file test plan. The history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-012`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 12, on CRR-042. Code under test `5b455a9ec7` (web-only since `a4641a0985`; HEAD `47efe7fa9b` adds one docs line). Server `dist/` from round 11 (no server change since); the probes run the web from source (Nuxt dev).
- Prior round reviewed: API-REV-011 (`Fail`: F-57, F-59; F-56 rejected in CRR-041).
- Scope, per CRR-042: everything left, in this one round, so the fixes come back together:
  - CR-461-077 (F-57) and F-59 rechecks;
  - the stale rewrites (DLD, SSR, the seeded probes, PLN-09, BR-011);
  - API-P04; API-F01; the live `agent-initiated-collaborators`.
- Refusal wording: per FU-030, wording-only differences are recorded in `follow-ups.md` ("Collected differences"), not as failures. This round added DLP-004 and DCP-004.
- Deviations from the plan, and why:
  - **The base worktree's own install.** Its `node_modules` (root and web) were symlinks to the branch worktree's, so this round's first base runs resolved the branch's contract packages (base's web failed to load: "does not provide an export named `collaborationCopyAgentLaunch`"). I gave base its own `pnpm install --frozen-lockfile` and server build, then repeated the base runs. Only those repeats are used.
  - **Stale parts of the live suite are not rewritten** (LE-A1, LE-A2, LE-A3, LE-T1): under the agreed rule, rewrites wait for the fix when the round has product failures. LE-O1 is a product failure candidate (F-63).
  - **DLP-006 retired:** it strips stored files to the shape before the change while the server is down. DS-10 says the runtime reads only the converted shape (checklist item 6; no runtime repair), and the migration's own suites cover the conversion.
  - **Not Tested under the safety rules:** the delegated background-task live suites (Claude CLI or real Antigravity CLI login); the live suite's Claude root default (`AIC_ROOT_RUNTIMES=autobyteus` used instead, DeepSeek through the test vault).
- My own probe errors, corrected and rerun: the own-file readers first used camelCase on the GraphQL tree, whose members are snake_case (`launch_configuration`); BR-011 was first run without BR-008 … BR-010.
- Evidence folder: `evidence/api-e2e/` (round 12 files carry `r12`); raw logs under `/tmp/api461/`.

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Not Applicable` this round (`Fail`: failure-origin review requested)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-2 | `5b455a9ec7` (server `dist/` from round 11; web from source) | macOS 26.5.2 (Darwin 25.5.0), arm64 | Probe-owned stack: built server, Nuxt dev, headless Chrome; scripted AGY CLI, the Grok and LM Studio stand-ins where used | Clean env `env -i PATH HOME=<resolved temp> TMPDIR USER`; never the user's app or `~/.autobyteus` |
| ENV-4 | as ENV-2, and base `827f1e68dc` (its own install and build) | as ENV-2 | Two built-server nodes paired by invite (API-P04) | Owned by the probe |
| ENV-5 | `47efe7fa9b`, fresh clone | as ENV-2 | `pnpm install --frozen-lockfile`, `pnpm build:electron:mac -- --arm64` (unsigned) | API-F01 |
| ENV-6 | `5b455a9ec7` | as ENV-2 | In-process server, AutoByteus runtime on DeepSeek | `AUTOBYTEUS_TEST_VAULT`, `RUN_DEEPSEEK_E2E=1`, `AIC_ROOT_RUNTIMES=autobyteus` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F-57 recheck (CR-461-077) | SR-064 | Real browser | `runtime-switch-members-probe.mjs` | ENV-2 | Pass | `API-B03-r12-probes.txt` | RSM 7/7 | F-57 resolved |
| F-59 recheck (SDV-06) | SR-080 | Real browser | `stopped-delegator-views-probe.mjs --cases SDV-06` | ENV-2 | Pass | as above | both surfaces | From the Workspace page and the Projects page, every delegator kind |
| PMU | AC-007 | Real browser | `project-manager-ux-probe.mjs` | ENV-2 | Pass | as above | 25/25 | — |
| DLD (DLP, DCP, DCR, AFS, LRL, SIR, TLU) | AC-001 … AC-012; rule 2; SR-064; F-39 | Real browser | `delegated-launch-defaults-probe.mjs` | ENV-2 | **Fail** | `API-B03-r12-*.png` | see Findings | 14/29 in the full run, then the reruns; DLP-003, DLP-007, DCP-002, DCP-004 pass after the rewrites |
| SSR-001 … SSR-004 (rewritten) | SR-064, F-39 | Real browser | `--cases SSR-001,SSR-002,SSR-003,SSR-004` | ENV-2 | **Fail** (blocked by F-62) | `API-B03-r12-probes.txt` | the Saves | Every Save answered `RUN_ACTIVE`: the copy was live (`idle`) while its Settings showed it stopped |
| LRL base comparison | large-runs-load-less AC-003, AC-006 | Real browser | base `827f1e68dc`, `--cases LRL-001,LRL-004,LRL-005` | ENV-2 (base) | Pass at base | `API-B03-r12-probes.txt` | 3/3 | Base passes LRL-001 and LRL-004; the branch fails both (F-64, F-65) |
| `owner-scoped-file-reads` (seeded) | AC-001 … AC-012 | Real browser, phone | `--seed-to`, `--from-seed` | ENV-2 | Partly | as above | B-001 … B-007 Pass | T-API's two QR-002 checks were base's hub ownership; rewritten to rule 2 (run-id list and content of a delegated run are its own) after the run, so T-API's last form is not yet run |
| `projects-left-navigation` | AC-008 (REQ-007) | Real browser | with archive diagnostics | ENV-2 | Partly | as above | PLN 9/11 | PLN-04 not 461; PLN-09 Unclear (Findings) |
| BR-008 … BR-011 | restart | Real browser, real backend restart | `task-closure-tree-probe.mjs --cases BR-008,…,BR-011` | ENV-2 | Partly | as above | 3/4 | BR-011 "org: conversation after restart"; its failing step has varied across four runs (Unclassified) |
| API-P04 | Rule 3 (SR-057, SR-038) | Two nodes, real browser | the same probe at base and on the branch, each capturing the key shapes of every view frame and GraphQL answer (`p04-capture-probe.mjs`, a temporary copy of `remote-runs-in-tree-probe.mjs`, unchanged from base) | ENV-4 | **Fail** (F-66) | `API-P04-r12-peer-shape-compare.json` | 52/64 identical | The 6 others differ only by the peer row's `launches[]`; `StopDelegatedExecution` → `TerminateAgentRun` is rule 2 |
| API-F01 | build inputs | Fresh clone, release desktop build | TESTING.md "Fresh-start build" | ENV-5 | Pass | `API-B03-r12-probes.txt` | exit 0 | Prisma ARM64 and packaged terminal runtime checks, including the Electron-as-Node spawn probe; signing and other platforms Not Tested (runner only) |
| Live `agent-initiated-collaborators` | collaboration model on a real runtime | In-process server, DeepSeek | `vitest run tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` | ENV-6 | **Fail** (F-63) | `API-L-r12-live-collaborators-extract.txt` | 5 failed, 31 skipped | LE-O1: F-63. LE-A1, A2, A3, T1: stale (below) |

### Findings

- **Round 11's F-57 and F-59:** resolved.

| ID | Case | Expected (authority) | Observed (`5b455a9ec7`) | Preliminary Classification |
| --- | --- | --- | --- | --- |
| F-60 | DCP-001, DCP-005 (DCP-003 asserts the same) | V-11: "an edited agent shows no origin text. The edit becomes the run's own launch"; SR-064 | After a Save on a stopped copy, its card shows the new model with the old origin: DCP-001 "Gemini test · … · Agent default" (`data-source="agent_default"`; the Writer's agent default is the Alt model); DCP-005 a Team copy member "Gemini test · … · Team default". The save is stored on the copy's own run. The save path (`StandaloneStoppedRunSelectionUpdater` → `commitRunRuntimeSwitch`) leaves the run's `launchSource` | `Local Fix` |
| F-61 | DCP-003, AFS-002, DCR-001, DCR-002, DCR-003, DLP-004 (rerun) | U-B: "The rows, selection and Stop buttons stay"; a copy's own Settings card (autobyteus-366) | With Settings open, selecting a delegated copy in an Org run (running), or in a stopped Team run, shows the host's card (`existing-run-root-card`; the copy row selected). `resolveSettingsSubject` (`utils/runSettings/settingsSubject.ts`) finds no row for the copy in the editor's `delegated` rows, so the subject is `none`. In an Agent run, and in a running Team run, the copy's card shows | `Local Fix` (web) |
| F-62 | AFS-001, SSR-001, SSR-002, SSR-003 | REQ-001 (a delegated run outlives its delegator's Stop); rule 1 statuses; DS-13 (idle counts) | With its delegator stopped, a copy that is live (`agentRunCollaborationStatuses`: `idle`; sidebar: green dot and stop icon) shows "Stopped", no stop icon and an unlocked model in its own Settings. The user cannot stop it there, and its Save is refused: `RUN_ACTIVE` "This run became active through another connected workflow…" (agent copies and team copies) | `Local Fix` (web) |
| F-63 | live LE-O1 (DeepSeek) | TC-12 / A-6: an old prefixed address is refused with "Use /x"; contract §2.2: messaging needs the same open Task or the assigner | In an Org run, a delegated copy of the mounted `/squad` was told to message `/squad/mate`. Its lead's message reached the Org's own mounted mate (`…46c0ab09…`, the only mate created, by the earlier mounted step); the copy's mate (`…46cbd161…`) never started. Expected: refused, nothing reaching the mounted mate | `Unclear` (server admission; security-relevant: a copy reaches a configured member it shares no Task with) |
| F-64 | LRL-001 | large-runs-load-less AC-003, QR-005: a stopped Team opens with one projection and one file-change request, for the focused member | Two of each per member, for three members (two of them other Team runs' members) at one open. Base `827f1e68dc` passes the same case | `Local Fix` (web) |
| F-65 | LRL-004 | large-runs-load-less AC-006: a message to a Team whose stored message log is damaged is refused with the reason | The message shows in the conversation and the composer keeps it; the run stays stopped; no reason appears anywhere (no stream frame or GraphQL answer carries it). Base passes the same case | `Local Fix` |
| F-66 | API-P04 | SR-038 (REQ-009): a peer child's row carries each agent's launch (`launches`, read from the peer while the view is open); rule 3 | Every peer row in the Agent, Team and Org view snapshots and in `agentRunCollaboration`, `getAgentOrgRunInspection`, `getTeamRunResumeConfig` has no `launches` key during the whole run (peer reachable; the probe's peer checks pass). At base each has `address`, `runtime_kind`, `llm_model_identifier`, `source.origin`, `source.fallbacks` | `Local Fix` (server) |

**Unclear (needs the reviewer's reading):**
- PLN-09 (AC-008): "Archive all" on P's agent group after the squad's Stop shows "Archived 1 run. 1 failed." The one archive call captured succeeded; the failed one shows no reason. If the failed run was refused because a run it delegated to works (REQ-007), the reason must show (AC-008); which run and why is not in the evidence.

**Stale, rewritten this round** (base's paths; each now follows the requirements and design):
- `delegated-launch-defaults`:
  - TC-12 own-root addresses for a copy member's calls (DLP-003 `/unoffered`, `/engineer`; DLP-006, DLP-007 `/engineer`) and row keys (DCP-005 `/lead@…`);
  - the copy's own run for every stored launch (DCP-001, DCP-003, DCP-004 `getAgentRunResumeConfig`; DCP-005 the copy team's own file);
  - FU-030 wording (DLP-003, DLP-004, DLP-005 "not offered"; DCP-004 "{name} is running. Stop it, then save again.");
  - REQ-001 in AFS-001: the hub's Stop leaves its copies running; B is stopped by its own Stop before editing;
  - AFS-001's stored reads from each copy's own run (F-57's own-run check).
- `settings-saved-model-refresh-cases` (SSR): own-run saves (`UpdateStoppedAgentRunSelection`, `UpdateStoppedTeamRunSelections`), own-run reads, F-39 (a team-level Save keeps each member's own launch), TC-12 row keys, each copy stopped by its own Stop (REQ-001), SSR-003's read failure on any read after the committed write.
- `large-runs-load-less-cases`: LRL-004 reads the refusal from the view stream (no restore mutation under rule 2); LRL-005 allows the stream to follow the run through its restore (SR-064).
- `owner-scoped-file-reads`: T-API's QR-002 checks to rule 2.
- `projects-left-navigation`: PLN-09 records the archive answers and the window's text.

**Stale, rewrite waiting for the fix** (the live suite, LE-A1 … LE-T1):
- LE-A1 checks the delegator's `collaboration_tree.json` package (TC-13: logs in `agents/<id>/`; no delegator package);
- LE-A2 expects `coordinatorAddress: /squad/lead` and handoffs naming `/squad/mate` (TC-12: `/lead`, `/mate`);
- LE-A3 reads a copy member's conversation through the host's member projection (rule 2: its own team's projection);
- LE-T1 waits for the copy lead's tool events on the host Team's stream (rule 2: the copy's own stream) and `/squad/mate` (TC-12).

**Not 461 (recorded):** PLN-04 (the composer's model menu option for a new Team run); `existing-run-model-config` (base drift `817bd9950f`); phone MSP-50, MSP-51 (autobyteus-23).

**Wording only (FU-030):** DLP-004, DCP-004 added to `follow-ups.md` (with DLP-003, DLP-005, SIR-001 from round 11).

**Classified earlier:** SIR-002, not 461 (CRR-041). SIR-001: FU-030.

**Unclassified:** BR-011 (after a real backend restart; its failing step varies: "org: conversation after restart" this time).

**Retired with rationale:** DLP-006 (DS-10 item 6). The large-hub probe's input, log path and request-count expectations are the hub-hosted model's; it needs a redesign under rule 2, which waits for the fix.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 … AC-006 | Yes | rounds 8 … 10 (server, stories, live) | Proven | — |
| AC-007 | Yes | PMU 25/25, SDV-01 … 07 | Proven | — |
| AC-008 | Yes | rounds 8 … 10 (server); PLN-09 | Proven at the server; the rendered group archive is Unclear | — |
| AC-009 … AC-016 | mixed | rounds 8 … 10; API-P03 | Proven, except REQ-009's peer launches (F-66) | — |
| AC-010 (REQ-006) | Yes | DCP-001 … 005, AFS-001, SSR | Not Proven in full (F-60, F-61, F-62) | — |
| DS-12 (SR-064) | — | RSM 7/7; DCP; SSR | Not Proven in full (F-60, F-62) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 86% | 86% | Server criteria proven; AC-007 rendered; F-57, F-59 resolved | F-60 … F-66 | The fixes |
| Changed-boundary execution directness | 93% | 93% | Real browser, two nodes, real runtime, fresh-clone build | — | — |
| Cross-boundary integration realism and mock gap | 88% | 88% | Live DeepSeek run; base/branch capture | Scripted AGY elsewhere | — |
| Environment, configuration, identity, and fixture fidelity | 92% | 92% | Base given its own install | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 84% | 84% | Restarts, damaged logs, peers | F-65; BR-011 varies | The fixes |
| User-surface, browser, and desktop-shell confidence | 78% | 78% | PMU, SDV, RSM pass; desktop build | F-60, F-61, F-62, F-64 | The fixes |
| Durable regression coverage quality and relevance | 88% | 88% | DLD, SSR, LRL, osfr, PLN rewritten to the requirements | Live suite rewrite waiting | After the fix |

- Overall post-repository confidence: 87%
- Overall final confidence: 87%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-010: F-60, F-61, F-62)
- Any final applicable category below `90%`: `Yes`
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-60 … F-66; PLN-09; the live suite's waiting rewrite

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Execution mode: `Browser`, `Worker or Distributed`, live runtime
- The confidence gap it addresses, and the expected gain: rendered rule-2 Settings and lists; the peer view contract against base; the real runtime's addressing.
- Browser validation needed, and why or why not: yes. F-60, F-61, F-62, F-64 and F-65 are visible only in the rendered app.

## Desktop Application Validation

- Approach executed: probe-owned real stack; the fresh-clone desktop build (API-F01).
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven: signing, notarization and the other platforms (runner only).

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Migration Required` (DS-10)
- Cases proving the migration outcome: rounds 9 and 10 (no server change since).
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none new.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No` (DLP-006 retired)
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`.
  - `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs`: own-root addresses and row keys (TC-12); `ownAgentLaunch`; DCP-005's own-file check; FU-030 wording; the delegated rows' team address from the tree depth; SSR registration gets `gql`, `teamTree`.
  - `agent-settings-focused-cases.mjs`: AFS-001 own-run reads (F-57) and REQ-001 after the hub's Stop; AFS-002 own read.
  - `settings-saved-model-refresh-cases.mjs`: SSR-001 … SSR-004 rewritten (see Findings).
  - `delegated-copy-own-file-cases.mjs`: E6 own files, TC-12 trees, F-39.
  - `large-runs-load-less-cases.mjs`: LRL-004, LRL-005.
  - `owner-scoped-file-reads-probe.mjs`: the standalone member's own run route; B-003's selector; T-API's QR-002 checks.
  - `projects-left-navigation-probe.mjs`: PLN-09's diagnostics.
  - `stopped-delegator-views-probe.mjs`: SDV-06 from the Workspace and Projects pages.
- Added or updated paths attached for proportional test-code review: `Not Applicable` (Fail round)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Every probe run's model | Scripted AGY CLI; the Grok and LM Studio stand-ins | Deterministic (TESTING.md) | The live suite covers a real model |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe stacks, data roots, homes, peer nodes | Yes | The probes' `finally`; homes removed by the runner scripts | Removed |
| `p04-capture-probe.mjs` (in the branch and base worktrees) | Yes | Deleted after the capture; never committed | Removed |
| Base worktree `461-base-827f1e68` (its own install now) | Yes | Kept for the next base comparison | Kept |
| Fresh clone `/tmp/api461/r12-f01-clone` | Yes | Removed after the round | Removed |
| `/tmp/api461/` logs | Yes | Kept; extracts committed (home paths shortened, secret scan clean) | Kept |

## Preliminary Classification (On `Fail`)

- `Local Fix`: F-60, F-61, F-62, F-64, F-65 (web; F-60 and F-65 may touch the server), F-66 (server).
- `Unclear`: F-63 (server admission), PLN-09.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-010 / DS-12 in the rendered Settings (F-60, F-61, F-62); REQ-009's peer launches (F-66); TC-12 / §2.2 for an Org copy's prefixed address (F-63); large-runs-load-less AC-003 and AC-006 (F-64, F-65).
- Recommended owner: per the failure-origin review.
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review)
- Notes for the next round:
  - First: recheck F-60 … F-66 (DCP-001/003/005, AFS-001/002, DCR-001 … 003, DLP-004, SSR-001 … 004, LRL-001, LRL-004, live LE-O1, API-P04 with `p04-capture-probe` regenerated by `/tmp/api461/p04/make-capture-probe.py`).
  - Then: T-API's rewritten form; the live suite's rewrite (LE-A1 … LE-T1); the large-hub probe's redesign; BR-011.
