# API/E2E Execution Coverage Report

## Round

- Coverage investigation (the plan): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-004`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 4, after code review CRR-011 passed IR-008 (`26c6240f33`, review records `29a1bf23a8`). Since API-REV-003 the package changed:
  - two `origin/personal` merges (SR-016: autobyteus-587 cross-node files, -599 session renewal, -579);
  - the typed path rewrite of the conversion (SR-017, SR-018: one node pass, the container file last);
  - Windows path forms (IR-007, IR-008).
- Prior rounds reviewed: API-REV-001 (Fail F-1..F-4, A-1), API-REV-002 (Fail F-5), API-REV-003 (Pass). Their evidence stays in `evidence/api-e2e/round-1/`, `round-2/` and `round-3/`.
- Deviations from the investigation's plan, and why:
  - OC-14 is added: SR-017 on the built server, the reviewer's suggestion.
  - COST-01 is added: the reviewer's residual.
  - FSB-01 is regenerated from the current workflow, which gained a clean-image Docker step. The job runner script is now produced by a generator that parses the job: `round-4/FSB-01/gen-arm64-job.py.txt`.
  - Every case is rerun this round because the merges touch runtime, web, remote and migration code.
- Evidence folder: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/evidence/api-e2e/round-4/`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `29a1bf23a8` (implementation `26c6240f33`) + this round's test edits | Linux aarch64 container, root, Node 22.23.3 | `pnpm install --frozen-lockfile`, then the built server `autobyteus-server-ts/dist`; scripted AGY CLI `linked_skills` | clean env `env -i PATH HOME TMPDIR`; temp data roots; a local package written by the suite |
| ENV-2 | same | same | two built servers (alpha, beta) paired, capturing proxies | after `pnpm -C autobyteus-server-ts test:integration:prepare` |
| ENV-3 | `29a1bf23a8`, fresh `git clone --no-local` | same | release job `build-linux-arm64`, go1.27.4 | build-only trust; `libz.so` on `LD_LIBRARY_PATH`; no Docker on this host |
| ENV-4 | same as ENV-1 | same | built server + Codex `gpt-6.1-terra` (low) + native AutoByteus `claude-haiku-5-5` (test vault) | data root under `$HOME/.autobyteus-e2e/` (outside /tmp); throwaway `CODEX_HOME` |
| ENV-5 | same as ENV-1 | same | built server + `nuxt dev` + Chromium 153 headless | probe root under `$HOME/.autobyteus-e2e/`, removed |
| ENV-6 | same as ENV-1 | same | built server startup on a 1,347 MiB synthetic node | root `/root/.autobyteus-e2e/cost/…`, removed |

## Cases

Evidence paths are relative to `evidence/api-e2e/round-4/`. Every vitest command runs from the worktree root as `env -i PATH HOME=<temp> TMPDIR … pnpm -C autobyteus-server-ts exec vitest run <file> --no-watch`, with the gates named in each file's header.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BLD-01 | all | build | `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts build` | ENV-1 | Pass | (console) | `Sanitized built-module/bootstrap smoke passed` | |
| TC-01 | all | typecheck | `node autobyteus-server-ts/scripts/typecheck.mjs`; the web typecheck runs inside FSB-01's build | ENV-1, ENV-3 | Pass | `FSB-01/fresh-start-build-summary.txt` | server `production errors: 0; test-file errors: 973 in 300 files (baseline 973 in 300 files)`; web `test-file errors: 86 in 36 files (baseline 86 in 36 files)` / `[typecheck] PASS` | both typechecks, as TESTING.md asks |
| FSB-01 | build | release job, fresh clone | `gen-arm64-job.py` → every `run:` step of `build-linux-arm64` | ENV-3 | Pass (2 steps limited by this host) | `FSB-01/fresh-start-build-summary.txt`, `FSB-01/gen-arm64-job.py.txt` | `Packaged server startup validation passed`, `FRESH_START_JOB_DONE`, `exit 0` | Two steps can't pass on this host. The units step fails 27 root-only tests (`# fail 27`, as before). The new clean-image step can't run: `Clean-image runtime check needs docker: spawnSync docker ENOENT`. On the first attempt my generator ignored `working-directory`; that is fixed. |
| MIG | AC-006 | every migration suite | `tests/app-data-migrations` | ENV-1 | Pass | `MIG/migration-suites.log` | `Test Files  75 passed (75)`, `Tests  649 passed (649)` | includes SR-017/SR-018, the Windows forms and the predecessors |
| OF-01..06 | AC-001..AC-004, AC-008 | GraphQL editor | `org-follows-definition.e2e.test.ts` | ENV-1 | Pass | `OF-01-06/vitest.log` | `Tests  6 passed (6)` | |
| AOML-1/2 | AC-006 | startup conversion | `append-only-message-logs-startup.e2e.test.ts` | ENV-1 | Pass | `AOML/vitest.log` | `Tests  2 passed (2)` | |
| ORG-E2E | REQ-005, REQ-006 | the other three Org e2e files | with the scripted-AGY gates | ENV-1 | Pass | `ORG-E2E/org-e2e.log` | `Tests  3 passed (3)` | |
| TF-REG | REQ-002 preserved | standalone Team | `team-run-follows-definition.e2e.test.ts` | ENV-1 | Pass | `TF/tf.log` | `Tests  12 passed (12)` | |
| OC-01..13 | AC-001..AC-005, AC-008, DEC-006/007, S-09, REQ-009 + REQ-004 | package Org, files edited on disk | `org-container-package.e2e.test.ts` | ENV-1 | Pass | `OC-01-14/vitest.log`, `OC-01-14/OC-*.json` | `Tests  14 passed (14)` | same assertions as round 3 |
| OC-14 | AC-006, REQ-007, SR-017/SR-018 | released beta.7 cross-node Org converted at startup | same (third suite) | ENV-1 | Pass | `OC-01-14/OC-14.json` | see the list after this table | new. Attempt 1 (`OC-01-14-attempt1/`) had a test error, see below |
| RC (file) | AC-007, REQ-006, Org delegation | two nodes | `remote-delegation-two-server.e2e.test.ts` (62 cases) | ENV-2 | Pass | `RC/vitest.log`, `RC/rc-cases-extract.json` | `Tests  62 passed (62)` | RC-56 with the base's `node` path, RC-12/13/24 after it, RC-47 |
| OCL-01 | AC-003 | real Codex + native AutoByteus | `org-container-live.e2e.test.ts` | ENV-4 | Pass | `OCL-01-02/OCL-01.json` | fromLead `The team code is TEAMCODE-61b64356.`; counterparts `/team/lead`, `/concierge` | |
| OCL-02 | AC-002 | real Codex member leaving with approvals | same | ENV-4 | Pass | `OCL-01-02/OCL-02.json` | `'ran': True, 'delivered': True, 'released': True`; 3 approvals answered in the Org view | |
| OCU-01..05 | AC-001, AC-002, AC-003, AC-008 | rendered Org view | `node probes/org-container-ui-probe.mjs --output-dir …/OCU-01-05` | ENV-5 | Pass | `OCU-01-05/org-container-ui-evidence.json`, `OCU-04-a-while-leaving.png` | `OCU-01 Pass` … `OCU-05 Pass` | |
| COST-01 | SR-018 cost | conversion cost on the built server's startup | `agent-org-units-conversion-cost.e2e.test.ts` (`RUN_ORG_CONVERSION_COST_E2E=1`) | ENV-6 | Pass (measured) | `COST-01/COST-01.json`, `COST-01/vitest.log` | see the list after this table | new, opt-in. Attempt 1 had a test error (an unprobed listener URL). Finding C-1 below. |

**OC-14, what to look for** (`OC-01-14/OC-14.json`):
- Migrations `SUCCEEDED`, none `FAILED`.
- `m_peer_member` in the Team unit's log names `agent_teams/set_team_1/code_reviewer_1/received_files/peer_lead_1/spec.md`.
- The ad-hoc Task, the delegated run's sealed and active lines, and the traces' `file_attachments` and `media` name the moved paths.
- The trace prose still names the old path. The foreign path is unchanged.
- `reads` = `orgSpec`, `orgBrief`, `teamSpec`, `agentBrief`, each `status 200` with `SPEC BYTES` / `BRIEF BYTES`.
- `secondStartUnchanged: true`.

OC-14's first attempt asserted that the Org view lists the peer-node line. The unchanged `MessageViewScope` never shows a message with another node in a Team or Org view (autobyteus-565, 492 DEC-014; the base's rule). The case now asserts the Org view as before (no `m_peer_*` listed; the Org's own lines listed), the agent unit's reader listing `m_peer_agent` with the moved paths, and every route serving the bytes.

**COST-01, what to look for** (`COST-01/COST-01.json`):
- `syntheticMiB: 1347`.
- The conversion: `SUCCEEDED`, `durationMs: 2220`, `Scanned 2; migrated 2`.
- 23 follow-ups, each 1,349–2,203 ms.
- `firstStartReadyMs: 44069`, `secondStartReadyMs: 4643`.
- The first moved attachment names `agent_teams/large_org_team_0/…`.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-Only / Accepted-Risk Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | OF-01, OC-01, OCU-01 | Proven | |
| AC-002 | Yes | OF-03, OC-03, OC-04, OC-05, OC-12, OCL-02, OCU-03, OCU-04 | Proven | |
| AC-003 | Yes | OF-02, OC-02, OCL-01, OCU-02 | Proven | |
| AC-004 | Yes | OF-04, OC-04, OC-05 | Proven | |
| AC-005 | Yes | OC-10, OC-12 | Proven | |
| AC-006 | Yes | MIG, AOML-1/2, OC-11, OC-14 | Proven | the user's own run converts on their upgrade only (never on real data, by requirement) |
| AC-007 | Yes | RC (RC-56, then RC-12/13/24) | Proven | |
| AC-008 | Yes | OF-05, OC-08, OC-09, OCU-05 | Proven | |
| REQ-009 + REQ-004 / DEC-005 | Yes | OC-13 | Proven | |
| REQ-006 (preserved) | Yes | OC-01, ORG-E2E, RC-47, OC-14 (Org view as before) | Proven | |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 96% | 96% | all cases | the user's own run converts only on upgrade (by requirement) | — |
| Changed-boundary execution directness | 96% | 96% | OC-14 (built-server conversion), RC, OCL, OCU, MIG | — | — |
| Cross-boundary integration realism and mock gap | 94% | 95% | OCL (real models), RC (two processes), OCU (rendered) | scripted AGY in most cases | — |
| Environment, configuration, identity, and fixture fidelity | 92% | 92% | package edits, hand-built released fixtures, test vault, synthetic node | Linux only; Windows path forms only in the migration suites; synthetic sizes assumed | a Windows desktop upgrade (release runner) |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | OC-04/06/07/09/10/12/13/14, RC-56 offline, MIG interruptions | — | — |
| User-surface, browser, and desktop-shell confidence | 93% | 93% | OCU-01..05; FSB-01 packaged server start | clean-image AppImage check not runnable (no Docker); Electron shell not driven | the release runner's clean-image step |
| Durable regression coverage quality and relevance | 96% | 96% | OC (14 cases), RC-56, OCL, COST-01 (opt-in) | — | — |

- Overall post-repository confidence: 95%
- Overall final confidence: 95%
- Calculation method: unweighted mean of the seven categories (94.7%, rounded)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks:
  - C-1 (upgrade start time, below);
  - the clean-image AppImage step and the macOS, x64 and Windows jobs need the release runner;
  - FU-001 (memory sync of contained runs) is a follow-up.

## Observation C-1 (no acceptance criterion; for the reviewer's and the designer's judgment)

- **What happens:** on the built server's upgrade start over a 1,347 MiB synthetic node, the conversion itself takes 2.2 s. The same start also runs the 23 `agent_org_units_after_*` follow-ups, and each re-runs the node pass over the whole node: 1.35–2.2 s each on this data, about 10 ms each on OC-14's tiny data, so the cost grows with the data.
- **Effect:** the first start was ready after 44.1 s, against 4.6 s for the second start. That is about 37 s more, once, on the upgrade. Scaled linearly, a 5 GB node would wait about 2.5 minutes at that start.
- **Why it's worth a decision:** SR-018 says "there is still one node pass", and the implementation's in-process cost of 838 ms covered the conversion only. On a node where every predecessor was already terminal before the conversion ran, the follow-ups find nothing to convert but still read every candidate file once each.
- **Not an execution failure:** no requirement sets a time limit, and the result is correct.
- **Options:**
  - accept as a one-time upgrade cost (and say so in the release notes);
  - or skip a follow-up's pass when its predecessor was terminal before the conversion ran.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (done)
- Execution mode: `Live API`, `Browser`, `Worker or Distributed` (two nodes), `Lifecycle` (stop, reopen, restart, upgrade start)
- Confidence gap or residual risk it addresses: real runtimes, the rendered Org view, two real nodes, the built-server conversion and its cost
- Browser validation needed: yes (Org rows, Leaving tag, messages)

## Desktop Application Validation

- Approach executed: the web-equivalent renderer (`nuxt dev`) against the built backend; the release job's packaged-server startup (FSB-01)
- Effect on any already-running desktop application: `None` (own ports, own roots; the user's app on :8000 untouched)
- Not proven here: the clean Ubuntu image run of the AppImage (needs Docker)

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Migration Required` (DEC-001)
- Representative existing data used: hand-built released Org trees (MIG, AOML, OC-11, OC-14), a synthetic node (COST-01). Never user data.
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the migration outcome: MIG (every shape, retry, interruption, predecessors, Windows forms), AOML-1/2, OC-11, OC-14 (typed paths, routes, second start unchanged), COST-01
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk:
  - the user's own run converts on upgrade (by requirement);
  - Windows desktop paths are proven only in the migration suites, not on a Windows build.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent-org-runs/org-container-package.e2e.test.ts` | Updated | OC-14 (added) | a third suite on its own root, using the implementation's hand-built `writeBeta7CrossNodeOrg` fixture and the ledger reset of OC-11 |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/agent-org-units-conversion-cost.e2e.test.ts` | Added | COST-01 | opt-in (`RUN_ORG_CONVERSION_COST_E2E=1`, about 1.3 GB written); records the timing; asserts success and one moved path; no time bound |
| earlier rounds (still current) | Added / Updated | see `api-e2e-revision-record.md` | `org-container-live.e2e.test.ts`, RC-56, RC-07/RC-12/RC-13/RC-20, `stopped-org-workspace-graphql` |

- Added or updated paths attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Model runtime (most cases) | scripted AGY CLI | deterministic tool calls (TESTING.md) | covered by OCL with real models |
| Release runner | the job's `run:` steps from a fresh clone | no runner here | Docker, macOS, x64 and Windows jobs not run |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `probes/org-container-ui-probe.mjs` | Yes | kept with the ticket | unchanged this round |
| `/root/.autobyteus-e2e/scripts/gen-arm64-job.py`, `oc-job4.sh` | Yes | the generator kept as evidence (`FSB-01/gen-arm64-job.py.txt`) | done |
| `/root/.autobyteus-e2e/oc-fs-job4` (fresh clone), COST-01's root | Yes | removed | removed |
| Suite and probe temp roots | Yes | removed by each suite or probe | removed |
| `*/dist/` from `test:integration:prepare` | Yes | left untracked, not staged | not committed |
| Two-server receipts and server logs | Yes | case extract kept; full receipt and logs removed | done |

## Preliminary Classification (On `Fail`)

Not applicable: no failure. C-1 is an observation with no acceptance criterion, offered for decision.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, parts only the user can check, or accepted as unverified risk: `None`. Only the user can check one part of AC-006: the conversion of the user's own Org run happens on their upgrade (by requirement).
- Evidence decisions requested: `None`
- Next recipient from `get_handoff_rules`: `/code_reviewer` (proportional test-code review: Large / High)
- Notes:
  - Test code for review: OC-14 in `org-container-package.e2e.test.ts`, and the new `agent-org-units-conversion-cost.e2e.test.ts`. Earlier rounds' test code is unchanged.
  - C-1 is open for a decision: accept, or skip the follow-ups' passes.
