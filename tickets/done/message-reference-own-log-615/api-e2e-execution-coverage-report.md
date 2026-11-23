# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation (`api-e2e-coverage-investigation.md`) is the plan; `api-e2e-revision-record.md` is the history.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, CRR-001 Pass (Medium / High)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why: none (the order note in the investigation: the TESTING.md rule was written first).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/message-reference-own-log-615/tickets/in-progress/message-reference-own-log-615/evidence/`

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: requested (this stage's durable change: the TESTING.md row)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | code `0629b5c631`, HEAD `725891acc1` | macOS 26.5.2 ARM64, load 12–26 | Node v22.23.1; server `dist/` removed and rebuilt at API-00 (`dist/app.js` 2026-11-23 08:00:39) | `env -i PATH HOME=<temp> TMPDIR USER`; scripted AGY CLI; synthetic data only |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | — | fresh server build | `rm -rf autobyteus-server-ts/dist; pnpm -C autobyteus-server-ts build` | ENV-1 | Pass | `API-00-server-build-fresh.log` | `exit 0`; the `dist/app.js` time | the reviewer's condition: a stale `dist` proves nothing |
| API-01 | AC-001…AC-006 | the implementation's checks | Reused: IMP-02…IMP-14 (on `0629b5c631`/`1b1be2e822`; later commits are ticket records and TESTING.md) | — | Pass (reused) | handoff IMP-02…IMP-14, `IMP-07-rendered/`, `IMP-08-phone/` | IMP-11 `26 passed`; IMP-12 control `2 failed`; IMP-13 `63 passed`; IMP-14 control `4 failed`; IMP-05 `6072 passed`; IMP-06 `8898 passed` (1 unrelated, FU-002); IMP-06b/c/d whole E2E explained (FU-003 fails on the base); IMP-07 R615-01…03 `Pass`; IMP-08 `MSP-08 Pass` | the whole server E2E (request-gate row of TESTING.md) is IMP-06b |
| API-02 | **AC-008** | `TESTING.md` "Choosing the path" | a row: a change to where data lives proves every read path for every owner kind as a property; an old-place copy does not count; "expected to work" is a gap; the example is MRV-1 | — | Pass | commit `725891acc1` (`docs(testing): …`, on its own) | the new row | written by its owner (AC-008) |
| API-03 | **AC-007**, AC-001, AC-002, AC-006 (closed runs) | built server, scripted AGY | `env -i PATH HOME=<temp> TMPDIR USER RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/message-references-every-view.e2e.test.ts tests/e2e/projects/closed-run-attachments.e2e.test.ts` | ENV-1 | Pass | `API-03-ac007-fresh-build.log` | `MRV-1 opened 21 references in 12 views`; `✓ MRV-1 …`; `✓ CRA-1 …`; `Tests  2 passed (2)` | on the fresh build; IMP-10's control shows MRV-1 fails on the shipped behavior |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Or Accepted-Risk Part: What You Tried And Why It Could Not Be Proven Here |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-03 (every delegated view's references on the built server, incl. "agent: task team member"), API-01 (web contexts, IMP-07 desktop render, IMP-08 phone) | Proven | — |
| AC-002 | Yes | API-03 (root views listing messages stored in delegated runs' logs), API-01 (IMP-11) | Proven | — |
| AC-003 | Yes | API-01 (IMP-11 and its control IMP-12) | Proven | — |
| AC-004 | Yes | API-01 (viewer unit test, IMP-07 rendered) | Proven | — |
| AC-005 | Yes | API-01 (IMP-13/14), CRR-001 review | Proven | — |
| AC-006 | Yes | API-01 (context-file tests, IMP-07), API-03 (CRA-1) | Proven | — |
| AC-007 | Yes | API-03 | Proven | — |
| AC-008 | Yes | API-02 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 96% | every criterion directly proven; AC-007 on a fresh build | — | — |
| Changed-boundary execution directness | 95% | 96% | the real route on the built server through the web's link form | — | — |
| Cross-boundary integration realism and mock gap | 94% | 95% | scripted AGY only to create the runs; real server, real logs and files | — | — |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | synthetic tree, own data, fresh build | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 94% | 95% | not-found and file-missing told apart; QR-001 control; closed runs after a restart | the held residual (unreadable records answer 500, unreachable from a listed link) | — |
| User-surface, browser, and desktop-shell confidence | 95% | 95% | desktop render and phone bundle (IMP-07/08) | the packaged app not run (the renderer fetches the same way) | — |
| Durable regression coverage quality and relevance | 96% | 96% | MRV-1 is a property test with a control; the TESTING.md rule | — | — |

- Overall final confidence: 95.4% (simple average)
- Every critical acceptance criterion directly proven, apart from parts only the user can check or accepted as unverified risk: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`

## Broader Validation Decision (Mandatory)

- Decision: `Not Required` beyond what ran: the changed boundary is the server route and the web link, exercised directly by MRV-1 on the built server and rendered on desktop and phone (IMP-07/08); the desktop shell has no own path here (`authorizedResourceUrl` is renderer code)

## Persisted-Data Transition Checks

- `Not Affected`: links are built at display time; nothing stored names a reference URL

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No` (the three routes removed, clean cut)
- Durable coverage only for compatibility: `No`

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `TESTING.md` "Choosing the path" | Updated (`725891acc1`) | API-02 | — |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Antigravity CLI | scripted fixture | creates the runs; no inference needed | — |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| temp HOME and the suites' data roots | Yes | the suites' cleanup, `rm -rf` | removed |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, parts only the user can check, or accepted as unverified risk (IDs, with `DEC-*`): `None`
- Evidence decisions requested: `None`
- Next recipient from `get_handoff_rules`: `/code_reviewer` (Medium / High: proportional test-code review)
- Notes: observation (not a finding): a delegated task team lead's own tab does not list its delegator's message to it, per `MessageViewScope` (461 SR-074, 565); message listing is out of scope. The reviewer's held residual (unreadable records answer 500) stands as recorded. Follow-ups FU-002, FU-003 are the implementation's.
