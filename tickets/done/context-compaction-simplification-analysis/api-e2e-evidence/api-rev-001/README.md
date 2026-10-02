# API-REV-001 evidence

Authoritative result: ../../api-e2e-execution-coverage-report.md. Investigation and ledger are alongside it. **Fail / 73.6%**, preliminary Local Fix shared test harness; not a production-compaction regression or full-suite/live approval.

plan.json has exact case commands. From /Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis: `python3 tickets/in-progress/context-compaction-simplification-analysis/api-e2e-evidence/api-rev-001/run-case.py API-C01` (substitute existing case ID). Runner appends canonical ledger, so historical replay should use a copy or deliberately record a new round rather than overwrite history. Each API-C*.log contains command/cwd/timestamp/result, .json records exit, results.json adds counts. Executed C01–07 only; no provider calls. C01 valid facade test fails1 with19 pass; C02–07 pass202/243/262/15/122/2. No test changes.

prerequisite-triage.json independently compares the wrapper and domain constructor to unchanged base; exact wrapper is unchanged. CRR-001 baseline-residuals.log/residual-comparison.json are inherited base execution evidence, not API/E2E reruns. Active scenarios use the wrapper. No need for a provider call to prove a constructor omitted a mandatory dependency. Current mock setup tests stop too early to prove facade readiness.

input-status.txt preserves preexisting reviewer/SDK artifacts. input-hashes.json pins authority and failing sources; final-status.txt/cleanup.txt show no added source change or owned running listeners. Database/files are test-owned; user's desktop untouched. No secrets/private histories or real browser evidence. Temporary authoring scripts removed; retained run-case.py is reproducibility scaffolding, not durable product test coverage.
