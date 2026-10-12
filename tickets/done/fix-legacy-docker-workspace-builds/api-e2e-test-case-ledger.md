# API/E2E Test-Case Ledger

## Ledger Meta
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/fix-legacy-docker-workspace-builds`; branch `codex/fix-legacy-docker-workspace-builds`.
- Package: `/Users/normy/autobyteus_org/autobyteus-worktrees/fix-legacy-docker-workspace-builds/tickets/in-progress/fix-legacy-docker-workspace-builds` (all package-relative paths below resolve here).
- Approved requirements `requirements-doc.md` R2 / SR-005; `investigation-notes.md`; `solution-revision-record.md` SR-005..007; `design-spec.md` D3.
- Architecture: `design-review-report.md`, `architecture-review-revision-record.md` ARCH-REV-001/002 Pass.
- Implementation: `implementation-handoff.md`, `implementation-revision-record.md` IR-001/002.
- Trigger/source review: `code-review-report.md`, `code-review-revision-record.md` CRR-001 initial cumulative Full Review Pass; reviewed artifacts HEAD `6c4437f03caf3ecd683dcb0982aa43f461ec9477`.
- Source commits: `bf0d12776` retirement; separate baseline-labelled `c89005ed2` test correction. Bootstrap base `2756d7b298ca5b203ebd2310d172b37a5d381b5c`.
- Supplements read: `solution-handoff.md`, `usage-investigation.md`, `baseline-disposition.md`, `baseline-launcher-quoting.md`; IR/CR evidence inspected as externally-owned results, not API proof. Historical BAS-001 attached report, validation-only remote Dockerfile/log and AGPL UD-002 handoff/report remain unchanged context (absolute inventory in solution-handoff.md).
- Delivery report/history: N/A — no delivery round exists. Product/UI: N/A — not applicable. No current-package prior API result or confidence exists.
- API round 1 / API-REV-001; canonical `api-e2e-test-case-ledger.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`.

- Scope: round1 independent source-retirement/fake-system validation; multiple meaningful cases, interruption risk. Initialized before execution.
- Investigation: api-e2e-coverage-investigation.md. Evidence scripts/logs: api-e2e-evidence/api-rev-001/.

## Planned Cases
| ID | Case | Related AC | Surface / expected | Order |
| --- | --- | --- | --- | --- |
| API-001 | Source/mutation/ignore guards dual Python | AC-007..011 | 9/9 each | 1 |
| API-002 | Affected/controller real-policy tests dual Python | AC-008/010 D3 | 4/4 each | 2 |
| API-003 | Narrow preserved helper suites | AC-008/010/011 | 27/27 | 3 |
| API-004 | Broad affected suite dual Python | AC-008/010/011 preservation | BASE-001 remains Fail, platform skips explicit; no other fail/error | 4 |
| API-005 | Complete input/caller/COPY/reference audit | AC-007..011 | Exact allowlist/no retained consumer/bytes preserved | 5 |
| API-006 | Fake default/zh helpers and source entry chain | AC-008 | Actual helper commands resolve root monorepo/default-zh args | 6 |
| API-007 | Exported probe receipts and negative mutation | AC-008/010 D3 | Default off, real fallback, mutation rejected | 7 |
| API-008 | License/hygiene/diff gates | AC-011 | Green | 8 |

## Execution Events
| Seq | ID | UTC timestamp | Event | Command / configuration | Expected | Observed | Result | Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | API-001 | 2026-10-12T15:51:46.964405+00:00 | Started | /usr/bin/python3 -m unittest scripts.tests.test_docker_build_context_sources -v; /opt/homebrew/bin/python3.11 -m unittest scripts.tests.test_docker_build_context_sources -v | 9/9 per interpreter |  | N/A |  | Continue / retain limits |
| 2 | API-001 | 2026-10-12T15:51:47.740141+00:00 | Completed | See exact commands in logs | 9/9 per interpreter | source-python39.log: 9 run/9 Pass/0 Fail/0 errors/0 skips; exit 0; source-python311.log: 9 run/9 Pass/0 Fail/0 errors/0 skips; exit 0 | Pass | source-python39.log, source-python311.log | Continue / retain limits |
| 3 | API-002 | 2026-10-12T15:51:47.740413+00:00 | Started | /usr/bin/python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace.PublicDockerLauncherSharedWorkspaceTest.test_new_containers_prefer_sequential_friendly_ports scripts.tests.test_public_docker_launcher_shared_workspace.PublicDockerLauncherSharedWorkspaceTest.test_bind_failure_retry_uses_random_ports_after_first_friendly_attempt scripts.tests.test_public_docker_launcher_shared_workspace.PublicDockerLauncherSharedWorkspaceTest.test_controlled_busy_preferred_port_uses_real_random_fallback scripts.tests.test_public_docker_launcher_shared_workspace.PublicDockerLauncherSharedWorkspaceTest.test_port_probe_double_delegates_python_and_rejects_probe_drift -v; /opt/homebrew/bin/python3.11 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace.PublicDockerLauncherSharedWorkspaceTest.test_new_containers_prefer_sequential_friendly_ports scripts.tests.test_public_docker_launcher_shared_workspace.PublicDockerLauncherSharedWorkspaceTest.test_bind_failure_retry_uses_random_ports_after_first_friendly_attempt scripts.tests.test_public_docker_launcher_shared_workspace.PublicDockerLauncherSharedWorkspaceTest.test_controlled_busy_preferred_port_uses_real_random_fallback scripts.tests.test_public_docker_launcher_shared_workspace.PublicDockerLauncherSharedWorkspaceTest.test_port_probe_double_delegates_python_and_rejects_probe_drift -v | 4/4 per interpreter |  | N/A |  | Continue / retain limits |
| 4 | API-002 | 2026-10-12T15:51:57.789174+00:00 | Completed | See exact commands in logs | 4/4 per interpreter | affected-python39.log: 4 run/4 Pass/0 Fail/0 errors/0 skips; exit 0; affected-python311.log: 4 run/4 Pass/0 Fail/0 errors/0 skips; exit 0 | Pass | affected-python39.log, affected-python311.log | Continue / retain limits |
| 5 | API-003 | 2026-10-12T15:51:57.789447+00:00 | Started | /usr/bin/python3 -m unittest scripts.tests.test_docker_build_context_sources scripts.tests.test_server_docker_browser_bridge scripts.tests.test_server_docker_cli_install_failures scripts.tests.test_server_docker_cli_latest_defaults -v | 27/27 |  | N/A |  | Continue / retain limits |
| 6 | API-003 | 2026-10-12T15:52:02.017959+00:00 | Completed | See exact commands in logs | 27/27 | narrow-tests.log: 27 run/27 Pass/0 Fail/0 errors/0 skips; exit 0 | Pass | narrow-tests.log | Continue / retain limits |
| 7 | API-004 | 2026-10-12T15:52:02.018285+00:00 | Started | /usr/bin/python3 -m unittest discover -s scripts/tests -p test_*docker*.py -v; /opt/homebrew/bin/python3.11 -m unittest discover -s scripts/tests -p test_*docker*.py -v | 62 each; sole unchanged BASE-001 failure; original platform skips, no errors |  | N/A |  | Continue / retain limits |
| 8 | API-004 | 2026-10-12T15:53:21.893736+00:00 | Completed | See exact commands in logs | 62 each; sole unchanged BASE-001 failure; original platform skips, no errors | broad-python39.log: 62 run/59 Pass/1 Fail/0 errors/2 skips; exit 1; broad-python311.log: 62 run/59 Pass/1 Fail/0 errors/2 skips; exit 1 | Fail | broad-python39.log, broad-python311.log | Continue / retain limits |
| 9 | API-005 | 2026-10-12T15:54:12.022083+00:00 | Started | See retained script/commands | Exact allowlist, retained byte/input/consumer/link proof |  | N/A | input-reference-audit.log | Retain scoped limits |
| 10 | API-005 | 2026-10-12T15:54:16.051521+00:00 | Completed | See exact commands in log | Exact allowlist, retained byte/input/consumer/link proof | exit codes [0] | Pass | input-reference-audit.log | Retain scoped limits |
| 11 | API-006 | 2026-10-12T15:54:16.051765+00:00 | Started | See retained script/commands | Fake default/zh/source-helper entrychain receipts |  | N/A | helper-probe.log | Retain scoped limits |
| 12 | API-006 | 2026-10-12T15:54:17.661326+00:00 | Completed | See exact commands in log | Fake default/zh/source-helper entrychain receipts | exit codes [0] | Pass | helper-probe.log | Retain scoped limits |
| 13 | API-007 | 2026-10-12T15:54:17.661546+00:00 | Started | See retained script/commands | Default off, query receipts, mutation rejected; BASE-001 parse failure retained |  | N/A | port-probe.log | Retain scoped limits |
| 14 | API-007 | 2026-10-12T15:54:22.063536+00:00 | Completed | See exact commands in log | Default off, query receipts, mutation rejected; BASE-001 parse failure retained | exit codes [0] | Pass | port-probe.log | Retain scoped limits |
| 15 | API-008 | 2026-10-12T15:54:22.063773+00:00 | Started | See retained script/commands | License/hygiene/diff gates exit0 |  | N/A | gates.log | Retain scoped limits |
| 16 | API-008 | 2026-10-12T15:54:23.643811+00:00 | Completed | See exact commands in log | License/hygiene/diff gates exit0 | exit codes [0, 0, 0, 0, 0] | Pass | gates.log | Retain scoped limits |

| 17 | API-008 | 2026-10-12T15:59:16.439499+00:00 | Started | Explicit API-owned artifact staging + licensing/hygiene/index/worktree checks | Final artifacts valid, foreign receipt unstaged | In progress | N/A | final-artifact-gates.log | Finish gates before handoff |

| 18 | API-008 | 2026-10-12T16:00:29.586308+00:00 | Completed | First final staged diff gate | No formatting errors | Fail:two trailing spaces in API-owned reference log headings; licensing/hygiene passed before failure | Fail | artifact-formatting-attempt.json | Local formatting fix, retain raw capture |
| 19 | API-008 | 2026-10-12T16:00:29.586308+00:00 | Started | Final staged artifact gates after logger/output whitespace correction | Exit0, source assertions unchanged | Raw first audit preserved as JSON; only two log headings normalized | N/A | final-artifact-gates.log | Recheck final artifacts |

| 20 | API-008 | 2026-10-12T16:00:31.048437+00:00 | Completed | Final staged licensing/hygiene/diff gates | Pass all, only API paths staged | All exit0; resolved formatting-only failure retained separately | Pass | final-artifact-gates.log | Caller fallback ready |

## Re-entry And Reconciliation
- Last completed event:20 / API-008 Completed Pass; API-001..008 all attempted sequentially, no interruption/unresolved case.
- Raw reconciliation:7 cases Pass,1 case Fail (API-004 known external BASE-001 only);2 underlying platform skips per broad run, never counted Pass.
- Completed cases recorded immediately before starting next case: Yes. Both interpreter jobs are one dual-runtime case; no unresolved job.
- Round reconciliation: report Latest Authoritative Result is scoped retirement Pass96.4%, not a conversion of API-004 into Pass. D3/BASE-001 ownership retained. No new failing critical retirement AC.
- Reconciled into api-e2e-execution-coverage-report.md: Yes, Ledger Reconciliation/Changed Boundary Matrix/Result Summary.
