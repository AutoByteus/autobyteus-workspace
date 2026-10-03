# API/E2E Test-Case Ledger
Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/general-agent-identity.
Round 1 / API-REV-001, prior result N/A. Investigation/report/revision at same ticket.
Required for independent cases, long desktop build/journey and durable checkpoints.

## Planned cases
| ID | Journey | AC | Expected |
| --- | --- | --- | --- |
| R01 | bootstrap/default Chat units + exact file/base config | 001–004/006 | exact approved same-ID content, default selection unchanged |
| R02 | discovery/exposure/root/admission | 005 | Agent/Team contract, empty/no-context, eligibility unchanged |
| R03 | bootstrap→GraphQL/history reader + definition API suite | 001–006 | payload/old state refresh + historical reader usable |
| B01 | live probe C01/C02/C13 | 001–004/006 | HTTP payload and process restart restore complete shipped content |
| D01 | packaged desktop default Chat launch | 001/004/006 | General Agent stable-ID launch and exact installed prompt |
| D02 | packaged restart/history | 006 | old run/reference readable after restart, no reset |

## Events
| Event | ID | Expected / observed | Result | Evidence |
| --- | --- | --- | --- | --- |

## Reconciliation
No cases started. Final results unresolved. Report not yet produced.
| Started | R01 | focused bootstrap/default Chat and exact content/config | N/A | api-r01-*.log |
| Completed | R01 | 9 bootstrap + 30 web tests; approved byte/hash/base-config equal | Pass | api-r01-server.log / api-r01-web.log |
| Started | R02 | Discovery/exposure/root/admission/catalog tests | N/A | api-r02.log |
| Started | R03 | bootstrap GraphQL/history API + broader definitions | N/A | api-r03.log |
| Completed | R02 | 7 files / 54 tests pass; root/catalog/admission with model/backend doubles | Pass | api-r02.log |
| Checkpoint | R03 | Narrow 2 tests pass; run full affected directory sequentially for authoritative API evidence | N/A | api-r03-narrow.log |
| Completed | R03 | New 2 tests pass; broader 5-file directory: 19 pass / 3 fail in untouched package/team-schema tests | Fail | api-r03.log; api-r03-narrow.log |
| Started | B01 | targeted live C01/C02/C13 with actual process restart | N/A | api-live/ |
| Started | D01 | isolated desktop build/start | N/A | api-desktop-build.log / api-desktop-start.json |
| Checkpoint | B01 | C01 ENOENT while desktop prepare-server concurrently cleaned dist; C02/C13 pass | N/A | api-live.log / api-live/chat-entry-live-evidence.json; rerun B01 after build |
| Checkpoint | D01 | build/start succeeded iso-64690-9092; own ports 64690/64691 and root reported | N/A | api-desktop-start.json / api-desktop-build.log |
| Started | B01 | Sequential retry after desktop build, previous evidence kept | N/A | api-live-rerun/ |
| Checkpoint | B01 | Sequential retry C01 assertion wrongly trimmed newline; exact file/hash already pass; C02/C13 pass; correcting own assertion | N/A | api-live-rerun/chat-entry-live-evidence.json |
| Completed | D01 | Desktop General Agent same-ID launch, exact installed hash, Codex gpt-5.5 reply GENERAL-IDENTITY-OK and Idle | Pass | api-desktop-{start,definitions,launched-dom,run-config,reply-dom}.json |
| Started | D02 | Stop ordinary run then restart isolated app; existing run/history/name/ref usable | N/A | api-desktop-restart.json |
| Started | B01 | Retry with newline-faithful body assertion; previous attempt evidence retained | N/A | api-live-final/ |
| Completed | B01 | Final sequential C01/C02/C13 all pass; own previous execution/assertion issues resolved | Pass | api-live-final/chat-entry-live-evidence.json |
| Completed | D02 | Same instance/ports/data on restart, history+metadata byte-identical, API same-ID reader usable, UI reopened prior reply Offline | Pass | api-desktop-{restart,after-restart-check,reopened-dom}.json |

## Final reconciliation (2026-10-03)
R01/R02/B01/D01/D02 Pass; R03 Fail (2 new tests pass; broader 19 pass / 3 stale-test
failures). No pending/running cases. Own B01 interim issues resolved in final run.
Own desktop iso-64690-9092 stopped; root removed, ports released, own record absent.
Reconciled into api-e2e-execution-coverage-report.md: Yes. Authoritative API-REV-001
result Fail / 94.29%, focused failure-origin review pending.
