# API/E2E Execution Coverage Report

## Latest authoritative result
**Pass — API-REV-001 — 95.9% validation confidence.** Broader validation **Required and completed**. Every critical AC-002..007 has direct boundary evidence. No unresolved implementation failure, blocker or running case. Medium / High / Reviewed route retained; **proportional durable-test review Required** by Code Reviewer. This is validation, not deployment or installed-data rollout approval.

## Round metadata and authority
Round 1, 2026-09-26. Prior result/confidence **N/A**; no previous API record existed. Trigger: CRR-001 Implementation Review Pass plus user's explicit request for real imported nested-package browser/task testing.
Canonical ticket directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-exact-execution/tickets/team-attachment-exact-execution`.
Active cumulative authorities: requirements-doc.md (approved R1), investigation-notes.md, solution-revision-record.md (SR-003), design-spec.md (D1), solution-handoff.md, matching-errors.log, design-review-report.md and architecture-review-revision-record.md (ARCH-REV-001 Pass), implementation-handoff.md and implementation-revision-record.md (IR-001), code-review-report.md and code-review-revision-record.md (CRR-001), implementation-evidence. Product supplements and Delivery revision record: **N/A — not applicable**.
Current artifacts: api-e2e-coverage-investigation.md, api-e2e-test-case-ledger.md, this report, api-e2e-revision-record.md. These reports own current truth; the ledger retains intermediate attempts and fixture-origin investigations.
Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-exact-execution`, branch `codex/team-attachment-exact-execution`, base `e06080b0027636cecf20b5e437c496d423c7f26b`. All changes remain uncommitted. No production source changed by API/E2E.

## Investigation and execution basis
Complete upstream package and repository instructions read before durable changes. Initial inventory and multi-case ledger preceded execution. Plan followed, with recorded refinements: obsolete runtime fixture replaced by built-process current-contract coverage; real browser user request expanded into actual Org task lifecycle plus separate top-level Team duplicate-address task testing; live failures promoted into durable filesystem retry and prelaunch sequencing checks. No reroute needed during execution.
Old final DTOs/routes were rejected, not restored. Nested configured-Team test drift replaced with supported nested task-Team topology. No compatibility-only coverage or runtime fallback introduced. Approved historical migration only; current tree/blob storage retained.

## Ledger reconciliation and changed-boundary evidence
All completed cases/checkpoints are durably recorded; no case remains interrupted/unstarted. Intermediate failed attempts are not counted as passes and are resolved below. Evidence paths below are relative to `api-e2e-evidence/` in the canonical ticket.

| ID | AC / boundary | Final result and evidence |
|---|---|---|
| API-01 | 002/004/005/007, REST multipart/finalize/read/storage | **Pass**, 10 tests: rest-final.log. Exact IDs, missing/malformed/nonexistent/sibling/wrong immediate Team rejection, invalid-owner retry, nested task-Team reads, duplicate addresses and repeated stored filenames with distinct image/file bytes, draft removal, display names, TTL, standalone preservation. |
| API-02 | 002/005/007, built Studio HTTP/WS/provider | **Pass**, first three of six process tests: process-e2e-final.log. Agent and Team image/file sends through actual runtime; provider image base64 proves synchronous reads; recording retains file locator; real filesystem-finalize failure preserves draft reads and retry; true prelaunch draft upload/preview/remove then actual launch/returned exact ID/finalization/send. |
| API-03 | 003/006, copied-data transition and process lifecycle | **Pass**, remaining three process tests: process-e2e-final.log. Real runtime data copied while stopped, representative historical image/file locators inserted into typed fields, retained duplicate-address task with matching stored filenames, startup conversion, byte/non-locator equality, original backups, second restart, restored exact send without sibling delivery. Both real Studio and standalone entrypoints reject unresolved proof; repair only owned missing blob, standalone admits; Studio reads originals. SIGKILL after atomic trace commit, immediate RUNNING rejection, emulated stale-lock elapsed time, real retry/completion with original backup unchanged. |
| API-04S | 002..007, focused server regression | **Pass**, 13 files / 101 tests: server.log. Exact owner/provider normalization, archive/sidecar/provenance migration enumeration/retry, both gate unit suites, Org REST preservation. These mocked gate tests are supplemental, not substituted for API-03 processes. |
| API-04W | 002..007, frontend/store/component regression | **Pass**, 12 files / 85 tests: web.log (78), web-upload.log (2), web-draft-component.log (5). Captured ID, launch/restore/failure retry, image/file history labels/Open, local paths, draft preview/remove/failed removal, asynchronous upload focus isolation. |
| API-05 | 002/003/004/005/007, real browser + live Codex + storage | **Pass**. browser-journey.md, browser-exact-delivery.json, browser-finalize-failure.json, browser-prerestart-hashes.json, browser-postrestart-hashes.json, browser-restore-result.json, browser-*-trace.jsonl, task/tree snapshots and Studio logs. Imported current nested classroom package, actual task submission/acceptance, real Team task duplicates, selected task attachment send, failure/no dispatch/retry, later same-address task, reload/history, stop/restart/image+file Open, configured native restore and text-only response. |

**202 independently executed tests pass**, plus live browser journey. Server build and final `git diff --check` pass. Upstream 71/97/78 counts are not additional independent evidence here. No full repository test/typecheck sweep claimed.

## Exact execution commands and environment
See api-e2e-evidence/checks.md for complete commands. Server: documented build then `RUN_CONTEXT_FILE_PROCESS_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/context-file-storage-runtime.e2e.test.ts --no-watch`. Optional `CONTEXT_FILE_E2E_EVIDENCE_DIR` retains child logs and failed data; it is not required for test execution. No skipped gated run counted.
Browser: built Studio on loopback 3421 with a new owned data directory; Nuxt on 3423 via `BACKEND_NODE_BASE_URL=http://127.0.0.1:3421 pnpm -C autobyteus-web dev --host 127.0.0.1 --port 3423`. Deterministic provider on 3422 used only for transport probes; browser nested/Team tests instead selected **live Codex GPT-6-Luna**, medium, automatic tool approval **off**, using the existing authenticated runtime. Each requested tool approved individually. No secrets copied/imported. Only generated non-sensitive test image/text and fixture task instructions were sent.
Platform: macOS 26.5.2, Node 22.23.1, pnpm 10.28.2, Nuxt 3.21.1, Vitest server 4.0.18 / frontend 3.2.4, Chrome 153.0.8010.54, Europe/Berlin. Native Chrome picker fallback was necessary because extension setFiles denied local-file access; no security setting changed. Browser is web-equivalent renderer evidence, not Electron shell/packaging evidence. Existing desktop app unaffected.

## Real browser journey highlights
1. Browser Settings > Agent Packages imported a uniquely named disposable copy of current Nested Classroom Org. Verified definition `attachment-classroom-test`; original private source untouched. Import required a standard root `agents` directory, so the minimal staged package includes an empty one.
2. Browser launched Org and selected Teacher; native picker uploaded generated PNG, preview rendered, Send triggered actual `delegate_task` to `/StudentStudyGroup`. Nested coordinator submitted `ATTACHMENT_NESTED_OK`; Teacher accepted via `review_task_result`; UI showed **Accepted**, exact task ID and idle response. This is Org preservation/nested lifecycle, not a claim about Team final DTO.
3. Separately exposed the same flat two-student group as `attachment-study-group` in the staged package and reloaded/imported definitions. Browser launched it and delegated a real `/student_two` task. Configured, first-task and later-second-task IDs were distinct at the same logical address.
4. Selected first task `student_two_4c9cf1f680a642b4b5b07aa8980042f4`, uploaded text+image. Injected a test-owned sentinel at its final directory before Send. Real finalize HTTP400/EEXIST preserved text/drafts; task raw trace SHA256 unchanged, proving no dispatch. Removed only sentinel, retried through browser: exact task got one persisted input and both files, live model acknowledged. Neither configured sibling nor later task got files/marker. The temporary optimistic error row disappeared on hydration; no duplicate persisted send.
5. Created another task at same address after the attachment send; opened original text. Reloaded browser, reopened original task, stopped Team through UI. Restarted same-data Studio; original trace/file hashes equal, HTTP200 bytes equal, original text opened in browser and image rendered in Files viewer. Interrupted tasks remained read-only history, not revived.
6. Browser text-only send to configured student_one restored the native execution and returned **RESTORE_OK**; then stopped the Team again.

## Intermediate failure-origin resolutions
All are API/E2E-owned fixture/environment corrections, not implementation fixes:
- REST frozen tree mutation and outdated manager mock corrected to strict immutable supported task topology.
- Built-process initial DB assumption corrected. Standalone intentionally materializes `db/production.db`; using another Studio DB replayed older migrations against shared fixture files. Both now use the same documented disposable DB.
- Inherited LMSTUDIO_HOSTS overrode disposable provider after restart; helper pins its dynamic local endpoint. Additional package roots now explicitly empty in durable children to avoid unrelated user definitions.
- Manual browser restart initially inherited package roots without the newly imported fixture, so Codex definition restore failed. Unsetting that external override let the persisted imported roots apply; unchanged browser input then restored and returned RESTORE_OK. Attachment history remained readable throughout.
- Browser extension upload denial and occasional stale CUA evaluation frames resolved through native picker / fresh AX controls; actual successful browser interactions, not API uploads, are counted.
Detailed initial logs and checkpoints retained for audit; latest final process run is six passed tests.

## Mandatory confidence scorecard
Simple unweighted mean; percentages measure evidence strength, not a statistical failure probability.

| Category | Post-repository | Final | Supporting delta / residual uncertainty |
|---|---:|---:|---|
| Requirement/AC proof | 75% | 95% | Every critical AC directly covered across real REST/process/browser; not exhaustive installed-data corpus. |
| Changed-boundary directness | 90% | 98% | Actual HTTP/WS, synchronous bytes, atomic writer, both startup entrypoints, browser exact task path. |
| Integration realism/mock gap | 75% | 95% | Live Codex browser closes mocked dispatch gap; deterministic local provider still intentional in durable transport tests. No all-provider/model-quality claim. |
| Environment/identity/fixture fidelity | 75% | 95% | Explicit isolated DB/provider/package roots; current imported Org plus supported flat Team; real configured/task duplicates. Representative historical fields, not whole installed Docker corpus. |
| Failure/lifecycle/recovery | 75% | 98% | Real finalize failure/retry/no dispatch, copied migration, actual SIGKILL, admission failures, restart/native restore. Stale-lock elapsed time emulated explicitly. |
| User surface/browser/shell | 50% | 95% | Completed real import/task/upload/send/stop/reopen/restore; browser draft preview and real prelaunch API + component remove. Shell N/A: no shell-specific changed surface. |
| Durable regression quality | 85% | 95% | Current-contract REST replacement and six built-process cases with reusable small harness. Authenticated/private browser scenario temporary; test-code review pending. |

Overall **75.0% → 95.9%** (671/7), gain 20.9 points. No applicable category below 90%; 95% target met. Broader validation completed; no missing critical proof or material uninvestigated failure. Independent code-review decision remains separate.

## Durable coverage changes / stale removals
- **Updated** `autobyteus-server-ts/tests/integration/api/rest/context-files.integration.test.ts`: 10 exact-owner cases; preserve valid draft/standalone/error/TTL/display assertions, replace old final shapes and impossible nested configured fixture.
- **Replaced in place** `autobyteus-server-ts/tests/e2e/runtime/context-file-storage-runtime.e2e.test.ts`: obsolete bare Fastify/schema live-model harness and old draft/final/socket fields removed; useful provider transport assertions replaced by actual built-process current-contract tests, extended lifecycle proof. Not color/model-quality testing.
- **Added** `autobyteus-server-ts/tests/e2e/helpers/context-file-process-fixture.ts`: owned temp Studio/provider processes, HTTP/WS helpers, standalone host probe and narrow SIGKILL seam.
No test file path deleted. No compatibility coverage restored. All three paths must receive proportional test-code review on this Reviewed High-risk route.

## Persisted data, mocks and remaining operational limits
Migration Required for historical typed locators; exact tree/blob layout directly usable; drafts unaffected. Disposable copy came from an actual runtime-created package, modified only in representative historical typed reference fields plus valid retained-task proof. All other parsed record values and original blobs/backups compared. Unit suites additionally cover typed archive/sidecar/provenance edge cases. No live Docker installation, whole 712 MiB installed corpus or user history mutated/copied; installed-data preflight/clean migration, stopped writers, original backups, coordinated client/server rollout and rollback remain Delivery-owned. Unresolved real installed ownership must fail closed, never be guessed/deleted.
Durable provider emulator substitutes external inference only; actual runtime, storage, migrations and synchronous normalizer execute. No Ethernet/network-node deployment or Electron shell proof claimed.

## Cleanup and artifacts
Owned browser root/staged package and three failed-fixture roots removed after evidence preservation. All successful process-test roots cleaned by teardown; child processes stopped. Own Studio PIDs, provider and Nuxt stopped; ports 3421/3422/3423 have no listener. Five created browser tabs closed; other users/agents' tabs/processes untouched. See cleanup.json. Provider-managed Codex test conversations remain retained and inactive; no shared provider-history deletion attempted. Generated shared SDK dist directories were upstream build products and remain untracked. No commit, push, deployment or release.
Evidence logs/scripts/fixtures remain under api-e2e-evidence for audit; manual scripts contain expired temporary paths and are historical probes, not maintained regression commands. Repository test commands are canonical executable coverage.

## Recommended routing
**Pass → Code Reviewer**, for proportional review of only the three durable test paths (structure, clarity, determinism, reuse, requirement alignment). No source failure-origin reroute needed. Apply exact recipient from get_handoff_rules; no duplicate delivery forwarding.
