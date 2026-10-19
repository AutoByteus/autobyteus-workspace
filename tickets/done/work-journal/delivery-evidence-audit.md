# Delivery Evidence Audit — API-REV-001 / CRR-003

Delivery checked the API/E2E claims directly against the evidence files, not only against the reports. Date: 2026-10-19.

| Claim | Check | Result |
| --- | --- | --- |
| Live runtime runs pass | Vitest summaries in API-03a/b/bc/c/d/f, API-05, API-06 (both), API-07 | All pass as reported; API-03e Grok fails with the 429, as reported |
| Server E2E suite 360 pass / 2 fail | /tmp/wj-api02-e2e.json (the log has no counts); now copied to evidence/API-02-server-e2e-report.json | 741 tests: 360 passed, 2 failed, 379 skipped (gated). Failures: AOML-1 and AE-006, as diagnosed. Rerun log: both pass |
| AC-W1 one entry per tool call; no `Tool:` for built-ins | Independent cross-check of every live run's journal against its raw_traces_active.jsonl | 7/7 runs: every tool_call id is linked exactly once (confirms CRR-003 NB-T1); 0 `Tool:` lines |
| AC-W4 links resolve | Every journal link checked against the saved raw records | 0 unresolved. In the closed file, 10/11 (Claude) and 6/7 (Claude final) links are checkable from saved files. The remaining one in each is the `User: /compact` record in raw_traces_000001.jsonl, which was not saved; the test asserts it (live test line 273) and passed |
| AC-W5 closed file stable | sha256 of work_journal_000001.md at compact vs after the next turn; manifest content_sha256 | Identical in both Claude runs; matches the manifest |
| AC-W5 regeneration byte-identical | Restore test source | Asserts identical content and an unchanged mtime (lines 169–170, 188); passed (and again in delivery) |
| AC-W8 Skill Improvement | improver-trigger.txt and improver-read-call.json for LM Studio and DeepSeek | The trigger has the sentence once, no "work trace", and lists the root, manifest and active file. The first tool call is read_file of work_journal_manifest.json |
| Trigger 1 native flush | raw-at-turn-completed.json | 24/24 (LM Studio), 15/15 (DeepSeek) |
| Claude Read shown as `cat -n` | work-journal-contract.md §4 | Designed mapping (a read looks the same in every runtime) |
| No secrets in evidence | Regex scan for provider keys, tokens and JWTs | Clean. `sk-` hits are test names (`task-…`); DeepSeek key only as the `<from …>` placeholder |
| Repository hygiene | scripts/check_repository_artifact_hygiene.py, scripts/check_licensing.py | Pass; the longest evidence path is 115 chars; no Windows-unsafe names |

Residual: N2 not measured on slower hardware; Grok not live (user decision); AC-W3 and forced-failure proof unit-only.

## Round 2 (API-REV-002, DR-002)
| Claim | Check | Result |
| --- | --- | --- |
| Codex live still one entry per call after the merged Codex backend change | API-03-live-round2/codex journal vs raw traces | 5 calls, each linked once, 0 unresolved, 0 `Tool:` lines; vitest 1 passed |
| No product change in round 2 | `git diff b0c81c8f20 HEAD -- . ':!tickets/*'` | Only RELEASE.md and data_migration_guideline.md (rule docs) |
| No secrets in the new evidence | Regex scan | Clean |
