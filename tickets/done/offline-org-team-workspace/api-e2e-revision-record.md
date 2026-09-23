# API/E2E Revision Record

Canonical investigation and execution report remain latest authority. This is the first completed API result; poweroff did not create an earlier completed round.

## Revision index
| Revision | Trigger | Upstream revisions | Prior result/confidence | Current result/confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer CRR-001 Implementation Review Pass, initial validation round1 | Requirements SR-002; solution SR-004; ARCH-REV-002 Pass (001 history); IR-001; CRR-001 | N/A / N/A | **Fail /75.0%** |
| API-REV-002 | Code Reviewer CRR-003 Implementation Review Pass, corrective revalidation round2 | Requirements SR-002 unchanged; solution SR-005; ARCH-REV-003 Pass; IR-003; CRR-003 | **Fail /75.0%** | **Pass /95.0%** |

## API-REV-001 — real continuity proved; Files activation recovery fails
- Trigger: `code-review-report.md`, CRR-001; baseline validates complete reviewed Medium/High package at3a52e67ba72ee53497f5d9492f406289f23f28f3.
- Initial coverage investigation and ledger written before tests. Added real-process HTTP/restart durable test (171lines) and, after browser finding, real reactive FileExplorer metadata activation regression (43lines). No existing test removals/updates or production source edits.
- C01 server3/21 Pass; C02 web25/249 Pass; C03 lifecycle20/117 Pass; C04 new API1/1+build Pass. Counts overlap across runs.
- C05 native LM Studio, C06 Codex, C07 Claude actual same-context/identity and B tool/file plus never-started child Pass. C08 browser Save/reopen/Send C plus compact rendering Pass. C10 fresh delegated B task/historical snapshot preservation Pass.
- C09 safety passes but metadata recovery fails twice with FileExplorer recursive updates and stuck Loading. D tab-toggle workaround permits explicit target edit; E repeats failure. Dirty prior editor suppressed, composer retained, exactly2config saves and1explicit file write. C09-R1 independently reproduces without live proxy/backend (1test fails plus1unhandled rejection).
- User poweroff killed initial owned processes. Resumed same DB/runtime and native Agent memory without Save replay/session reset. Persistent JSON recovered completed external-provider evidence. Initial backend in-memory log unavailable; resumed streaming log preserved. Not counted as prior API result.
- Post-repository66.4%; final75.0%, seven-category mean. Critical AC-005 fails; no clean ≥95% gate. Actual native picker and full web typecheck not claimed; upstream parser blockers carried. Provider probe promotion remains deferred while failure repair is routed.

### Prior failure resolution
None — prior result/confidence N/A. No missing record interpreted as Pass.

- New remaining finding **API-F001**, C09/C09-R1, AC-005 / REQ-005,007. Preliminary **Local Fix — implementation owner**, potentially existing consumer behavior exposed by new flow; source origin to be confirmed independently. No requirement/design ambiguity found.
- Canonical artifacts updated: coverage investigation, case ledger, execution report, this record. Evidence: `evidence/api-browser-recovery-failure.md`, `api-files-activation-regression.log`, `api-c09-checkpoints.json`, `api-proxy-requests.jsonl`, `api-final-fixture-audit.json`, `api-cleanup.json`, provider/task records and `api-local-checks.md`.
- Durable paths: `autobyteus-server-ts/tests/e2e/agent-org-runs/stopped-org-workspace-graphql.e2e.test.ts`; `autobyteus-web/components/fileExplorer/__tests__/FileExplorer.metadataActivation.spec.ts`.
- Cleanup completed only owned resources; user's production app/auth/model server untouched. No commit/push/merge/deploy/release. Upstream reviewer uncommitted artifacts preserved.
- Recommended recipient **/code_reviewer**, focused **failure-origin review**, not successful-test-code review. Future rerun must recheck API-F001 first, preserve original failure history and append API-REV-002 rather than overwrite this baseline.

## API-REV-002 — API-F001 passes durable and real-browser first recovery
- Trigger: `code-review-report.md`, CRR-003; revalidation of IR-003 at HEAD `66213bd539ed422d39d101bdd218d73760a4100f`, correction `cb139904c68b65e3af9f6b07de0e8e5275ed8169`.
- Prior result/confidence: **API-REV-001 Fail /75.0%**. Current result/confidence: **Pass /95.0%**. No intermediate Pass inferred from CRR-003 or missing execution evidence.
- Scope authority: approved requirements SR-002 unchanged; solution/design SR-005; ARCH-REV-003 Pass; IR-003; CRR-003 Pass. Medium / High / Reviewed unchanged.
- Source-scope delta from API-REV-001: `FileExplorer.vue`, `FileExplorer.metadataActivation.spec.ts`, and `RightSideTabs.workspaceTarget.spec.ts`; other previously validated runtime/API/provider/config/task owners independently unchanged.
- Rechecked API-C09-R1 first: 1 file / 14 tests Pass, exit0, no reported unhandled error. Focused Files/layout 6/49 and broader affected web set 28/275 Pass. Counts overlap. Current server preparation/build and unchanged real HTTP/restart 1/1 Pass.
- Real API-C09 rerun covers both first recoveries: initially unopened B and previously mounted dirty B→D. In each case, the faulted target removes the tree/editor and suppresses keyboard save; clearing only the metadata fault plus one canonical Edit Config read makes the first Files completion usable. No tab workaround, reload, pre-registration, Save replay, draft clearing, provider reset, recursion or browser console error.
- Final audit records exactly 2 stopped-Org configuration saves, 2 controlled metadata faults, 2 workspace creates and 2 deliberate destination writes. A/C remain original; dirty prior B is not written; B/D contain only explicit saves. Schema-v1 whole tree remains inactive and changes only Team/all configured child workspace paths; root/direct/sibling/models/identity/history remain protected.
- Conversation marker, unsent composer and unrelated launch draft A persist. Same Org/member/platform identity is observed across owned service restart. Round-1 native/Codex/Claude/core-browser/task positives are carried, not mislabeled as round-2 reruns, because their owners are unchanged.

### Prior failure resolution
| Prior scenario / finding | Previous classification | Current resolution | Evidence |
| --- | --- | --- | --- |
| API-C09 / API-F001 — real metadata recovery recursively updated and stayed Loading | Local Fix — implementation owner; CRR-002 confirmed source origin | **Resolved**: both unopened and dirty-prior browser branches recover on first completion without workaround | `evidence/api-r2-browser-result.json`; four branch audit JSON files; `api-r2-requests.jsonl` |
| API-C09-R1 / API-F001 — metadata-only durable reproducer failed plus unhandled rejection | Local Fix — implementation owner | **Resolved**: original case plus expanded lifecycle suite 14/14 Pass, no reported unhandled error | `evidence/api-r2-c09r1.log` |

- Canonical artifacts updated: coverage investigation round-2 plan/final disposition; ledger events R2-01–R2-12; execution report latest round; this revision record.
- New evidence: `api-r2-source-scope.json`, `api-r2-local-checks.md`, repository/build/HTTP logs, browser result and branch audits, proxy requests/backend log, and `api-r2-cleanup.json`.
- API owner made no round-2 source or durable-test edit. Cumulative durable paths requiring proportional test-code review: server `stopped-org-workspace-graphql.e2e.test.ts`; web `FileExplorer.metadataActivation.spec.ts`; web `RightSideTabs.workspaceTarget.spec.ts`.
- Final seven-category mean 95.0% (all95); every category at least90 and every critical acceptance criterion directly proven. Broader validation Required and executed.
- No new/remaining failure ID. Actual unchanged Electron picker is unexecuted; full web typecheck remains blocked by unchanged parser diagnostics. Provider/model combinations remain sampled and prior real provider evidence is carried. These are bounded residuals, not hidden Passes or critical gaps.
- Cleanup: owned processes/ports/runtime/DB/key/generated dist removed; production PID19026 untouched. Active browser tab closed; one pre-interruption debugger-unattached local tab is unmarked/inert with services down for automatic session cleanup. No user tab touched. No commit/push/merge/release/deployment.
- Recommended recipient **/code_reviewer** for proportional successful test-code review; Delivery is not yet authorized.
