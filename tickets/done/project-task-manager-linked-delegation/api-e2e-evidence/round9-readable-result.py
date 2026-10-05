from pathlib import Path
W=Path('/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation');T=W/'tickets/in-progress/project-task-manager-linked-delegation'
p=T/'api-e2e-execution-coverage-report.md';s=p.read_text()
a=s.index('## FAPI-009 — Actual Failure');b=s.index('## Confidence Scorecard',a)
s=s[:a]+'''## FAPI-009 — Actual Failure / Expected Versus Observed / Preliminary Classification
**REQ-005 / AC-006** requires retained linked workers, history, and exact associations to remain inspectable after restart. **AC-014** private-mechanics segregation and the unchanged public DTO contract are secondary context. The ordinary frontend `ListCollaborationRootHistory` reader should return public Org trees that preserve linked Agent, Team, and nested execution identities without private lifetime stamps.

Exact command from W:
`python3 tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence/run-case.py API-014@round9-org-history-witness 'Actual public Org history strict current schema and packaged renderer retained history projection no private stamp/no read writes' node tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence/round9-org-history-witness.mjs`.

Actual HTTP200 / no GraphQL errors returns three Org rows: inactive approval Org (private count1), inactive recursive Org (count4), and active restored concrete Org (count3). **Every row fails the unchanged agentOrgExecutionTreeDtoSchema at rootOrg.taskExecutions: unrecognized taskLifetime.** The packaged renderer displays this exact strict-schema error, with zero Org-run buttons / Org collections. This does not prove that the entire Agent or Team history family fails. The full Project-array SHA before and after the read is identical: `f1204f6e2236c998e59112cc3682b503bda822db1368ee2c8939d83fa2da8dd9`.

Source path:
- `autobyteus-server-ts/src/api/graphql/types/collaboration-root-history.ts`: resolver directly returns `CollaborationRootHistoryService.list`.
- `autobyteus-server-ts/src/run-history/services/collaboration-root-history-service.ts`: returns `org: tree` from either active internal `getExecutionTreeSnapshot()` or the stored `AgentOrgRunExecutionTreeStore`; both internal shapes contain private `taskLifetime`.
- Existing `autobyteus-server-ts/src/services/agent-streaming/collaboration-execution-tree-dto-projection.ts::projectAgentOrgExecutionTree` provides the public projection for stream/inspection, recursively retaining children and normalizing sources. The mixed history facade misses this boundary.
- Web `stores/runHistoryLoadActions.ts` → `runHistoryStoreSupport.ts::parseAgentOrgHistoryItems` → `types/collaboration/agentOrgExecution.ts` uses the strict schema. One invalid row rejects the whole Org-history family.

Installed/current history-service JS SHA `82c0d40ece2c17a702e28e62ccc2dabcf1eb900700fd26e28c8ba5c36aea9632` and resolver SHA `f363225a564948f4279c4653d395f979db42af97cc68fef85d4dca0d3bd11b0b` match. This is not a stale packaged-source inference. Full API rows, schema issues, actual DOM, hash receipts, viewed screenshot and origin note are retained in E/api-009-round9-fapi-009-witness.json, history.png, origin.md and the original org-history-witness.log (inner exit1).

Preliminary **Local Fix — Implementation Engineer, existing public-history projection owner**. The reviewed public/private design already defines this boundary; the evidence does not demonstrate an architecture gap or requirement ambiguity. Reviewer must confirm origin and final owner before rework. Recommended durable coverage: actual active and stored linked Agent/Team/nested-helper Org history through this facade, strict public parsing with all identities retained, private persisted bytes preserved, and frontend history-family loading. Do not weaken the strict schema, filter valid workers, strip fields ad hoc in the probe, or change the AgentRun assertion, input ledger, Team/Task aggregates. No causal equivalence to FAPI-007 or FAPI-008.

Separate preliminary **Local Fix — API/E2E fixtures/mocks**: stale native-compaction-root-fixture factory import and incomplete history-regressions selection mock. Both need updates; static HEAD equality is scoped obstruction evidence, not whole-baseline execution. Temporary approval, endpoint, restore, cold-target, landing, and cleanup errors are separately classified, with original attempts retained. No speculative product changes were made.

'''+s[b:]
a=s.index('## Confidence Scorecard');b=s.index('## Durable Coverage Changed',a)
s=s[:a]+'''## Confidence Scorecard (Mandatory)
| Category | Post-repository | Final | Change / direct evidence | Material residual uncertainty |
| --- | --- | --- | --- | --- |
| Requirement / acceptance-criteria proof |50%|50%|Fresh exact input/release scope now positive, but actual critical AC-006 failure remains | Full accepted native/provider/root/history matrix incomplete; FAPI-007 open |
| Changed-boundary execution directness |75%|75%|Separate actual input/native/backend/component/removal/Team/LIVE receipts, plus real public API, strict schema and DOM | Other native/provider paths controlled or unexecuted; original reader backend receipt unobserved |
| Cross-boundary integration realism / mock gap |50%|75%|+25: actual three roots, five-worker recursion, physical processes, approval, root recovery, fresh desktop | Private/materialization failures largely controlled; native harness fails before intended proof |
| Environment / identity / fixture fidelity |75%|50%|−25: own build/Codex identity verified, but final critical exact-provider/native matrix remains unavailable and stale fixture/mock obstructions were observed | AGY4.8 absent; exact native/Claude authorization and remote endpoint not supplied |
| Failure / lifecycle / recovery |50%|75%|+25: genuine interrupted input/drain/removal, three-root fences/reopen/idempotence/Stop/restart, actual approval and recursive physical release | Original FAPI-007 cause/failed retry unresolved; remaining provider/private matrix partial; final A journeys held |
| User-surface / browser / desktop shell |75%|50%|−25: authentic packaged Org retained-history branch fails, despite scoped Agent/Team LIVE/inspection successes | FAPI-009 open; full postrestart history/selection journey held; not a whole-UI Pass |
| Durable regression coverage quality / relevance |85%|85%|Typed owned-child cases, exact negative controls, and compact HTTP/full-reader regression are strong but incomplete (between75/90 anchors) | Stamped history-facade regression missing; API-owned stale mocks/fixtures; no complete real-provider proof |

Post-repository scores `[50,75,50,75,50,75,85]` → final `[50,75,75,50,75,50,85]`. **Both simple arithmetic means are460/7 =65.71%.** Changes reflect stronger real-system/recovery evidence offset by newly observed critical fidelity/UI gaps; counts of passed commands are not confidence points. Every critical AC directly proven: **No**. All seven categories below90%; default95% target: **No**. A missing or failing critical criterion overrides the mean. Historical API-REV-008 final67.86% / postrepo65.00% remains unchanged.

## Blocked / Held / Out-Of-Scope Evidence
- **Blocked — exact AGY Gemini4.8**: catalog exposes3.1/3.6/3.7/3.8, not4.8. Model/auth limits are dependencies, not product defects or permission to substitute. Three AGY live files / five capability tests remain skipped.
- **Blocked — exact native/Claude execution identities and authorization**: native keys/catalog metadata exist, so this is not blanket provider unavailability. Claude SDK metadata is not auth proof. `AUTOBYTEUS_LLM_SERVER_HOSTS=[]`; a remote endpoint is required only for remote-host paths. Concise dependency questions were asked; no response. No additional provider/model calls without the requested information.
- **Not Tested / held at FAPI-009**: remaining full native+MCP/provider/three-root/recursive/private-candidate/materialization/failure/approval/quiet/failed-retry/reopen/restart/current-array/startup/data matrix beyond the explicitly named scopes. Controlled1379 tests do not prove the full real-system matrix. Quiet shutdown is consistent with observed timing, but the exact timer receipt was not observed; original failed-authority retry evidence is not manufactured from fresh positive cases.
- **Not Tested product actions**: final Org A was not entered; final Agent A was not submitted. Team cold once-DONE/preservation and partial byte checks are not all-three final-A completion. Native FIFO/hydration assertions were not reached because the fixture prerequisite fails.
- **Out Of Scope**: optional vendor SessionStore unsupported / not app-reachable; contrived scenarios excluded from scoring. No unsupported artificial race or new requirement gap inferred.

## Compatibility / Persisted Data Transition / Lifecycle
IR-007's `Legacy / Compatibility / Persisted Data Transition` sections were read. No backward-compatibility wrapper, dual read/write path, no-ID fallback or request-time version upgrade was introduced. Superseded idle-as-terminal behavior was removed in the reviewed source. All287 reviewed hashes remain unchanged in this round.

Approved **Directly Usable — No Migration** remains the expected transition. Representative current physical bare Project arrays and optional node lifetime facts were exercised through the normal reader, both built startup/no-write checks, and fresh desktop restart comparisons of full array bytes and trees. No migration was added; migration completion/recovery is **N/A — no new migration required**. Released migration coverage is retained. FAPI-009 is a missing public projection of current data, not grounds for a compatibility converter or schema-upgrade shim. Business current-data reads/no-write checks passed in their recorded scopes, but retained public Org history fails, so the complete direct-use/user journey is not accepted.

'''+s[b:]
a=s.index('## Result Summary / Next Route');b=s.index('\nCompleted at ',a)
s=s[:a]+'''## Result Summary / Next Route
| Result | Cases / reason |
| --- | --- |
| **Fail** | **API-014 / FAPI-009**: actual public Org history exposes private stamps and fails the strict renderer contract. Separate native/Nuxt API-owned fixture prerequisite failures and four known strict TOOL_LOG failures remain non-green. |
| **Scoped Pass** | Fresh FAPI-008 exact release; real Codex-MCP three-root saved-ID lifecycle; natural Org/recursive physical release; real approval, fences, idempotence, separate Root Stop/restore; backend restart/current-data/no-write; partial protection and owned cleanup. Repository scopes are named above, not summed. |
| **Blocked** | Exact AGY4.8, native/Claude execution authorization and remote-host endpoint dependencies. No silent substitution. |
| **Not Tested / held** | Remaining complete accepted matrix; final Org A unstarted / Agent A unsent; original FAPI-007 cause/failed retry not reproduced. |
| **Out Of Scope** | Unsupported optional vendor SessionStore and contrived paths, excluded from confidence scoring. |

**Latest result: Fail65.71%; target95% unmet; all categories below90%. Broader validation Required / held at FAPI-009, not blanket Blocked.** Preliminary Local Fix: existing implementation public-history projection owner; separate API fixture/mocks Need Update. Reviewer confirms origin and final owner. This outcome requests **focused failure-origin review, not successful-test review**. A later Large/High success still requires proportional review of all15 cumulative durable paths.

Fresh handoff rules are obtained only after these canonical artifacts and revision are complete. Notify only the most-specific Fail recipient with the full cumulative absolute reference package. Do not claim delivery until the tool confirms it; then end this API/E2E stage without polling. No Designer/Implementation/Delivery advancement follows this Fail.
'''+s[b:]
p.write_text(s)
print('Current failure, confidence, dependency/data and result sections made reader-continuous; historical report unchanged.')
