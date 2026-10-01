# CRR-004 — focused live semantic/continuation failure-origin review

Result **Unclear → Solution Designer** for coordinated investigation/recovery. API-F005 semantic failure is confirmed at the actual direct-summarizer boundary; specific model/prompt/effective-configuration remedy is not isolated. API-F004 root cause remains indeterminate. No production implementation defect, missing requirement or required new runtime mechanism established.

## Independent evidence work

Read approved REQ-001/005/006, AC-002/007 and exact prompt-v5; inspect actual quality fixture, production factory→summarizer→history renderer/finalizer→LMStudio/OpenAI-compatible nonstream extraction→structural parser. Current renderer preserves actual prior summary/correction; it does not invent the Completed-work bullet. Adjacent user constituents retain the explicit next-retained-user separator. The prompt already forbids converting proposals/unrun work to completion. Adapter reads message.content separately from reasoning; stop maps to complete. No omission, body rewriting, known truncation or extra semantic generation evidenced.

Compared semantic-final-observations.json with raw log JSON events: first/repeated records exactly match. Seven durable paths match API-owner final hashes; no tracked production source delta. origin-audit.json pins inputs. Actual model was local Qwen, inherited current tuple; no new calls or provider settings inspection. Full effective provider defaults/serialized wire request were not retained in this quality evidence, so causal model-vs-prompt-vs-provider-configuration isolation is incomplete.

## Reviewer-only no-provider probe

Exact command from worktree:

    pnpm -C autobyteus-server-ts exec vitest run --config ../tickets/in-progress/context-compaction-simplification-analysis/code-review-evidence/crr-004/review-vitest.config.ts --no-watch

review-probes.log: **1 file /2 tests pass**. Probe renders retained first summary + exact correction with current production prompt builder, confirms approved literal (trimmed equality), explicit correction boundary and no invented update in input. Separately feeds exact retained output into the existing fixture-specific alarm and reproduces LIVE_E2E_QUALITY_PLANNED_WORK_REPORTED_COMPLETE. This is output replay, not a new live generation, planner/commit execution, semantic oracle or statistical quality estimate. Upstream replay-semantic.mjs was not run because it updates API-owned evidence; this probe writes only reviewer evidence.

## Supported boundary and limits

The actor's goal is safe continuation of audit-only planning with a still-pending plan update and explicit correction. Requirements explicitly include unanswered requests and planned/completed distinction within SCN-001/003; AC-007 requires separate first/repeated quality fixtures. The isolated fixture uses the actual production summary transformation but bypasses threshold/planning/persistence. It establishes a generated-summary fidelity failure, NOT installation of that exact body or an unsafe parent action. No new unsupported workflow inferred from synthetic units.

API-F005 output claims APPROVAL-73 added and plan updated under Completed work when input only requests it. Original first summary has no APPROVAL-73. Input after correction contains no assistant/tool evidence of performing the update. The prior sample is retained as variation, not a waiver. “Complete/stop” is transport termination, not semantic correctness.

API-F004 failed full-flow log reports compaction and final turn completion, but only three tool-success notifications and generic safeExternalOperation failure. Original parent content/low-level exception are unavailable; later diagnostic run has four tools and exact artifact. Later positive evidence does not supply missing evidence from failed run. No token-limit, missing-artifact ENOENT, provider or persistence cause asserted.

API-F001 closure inspected: real normalizer/layout/location composition now supplied by wrapper and both callers, domain guard unchanged; regression checks real local-path resolution, original recording attachment, events and termination. API-C01 final24Pass plus later live dispatch supports closure. This is a bounded prior-failure check, not successful proportional review of all seven durable paths. API-F002/003 owner setup corrections remain as reported; no production attribution.

## Review consequence

Keep API-F005/API-F004 open; source CRR-002 Pass/9.40 is retained as historical structural/mechanics evidence, not current delivery readiness or model-quality approval. Exact live fidelity could not be established by the earlier mocked tests/source alone; this pending risk was disclosed, not an unrecognized source invariant. Do not weaken valid ACs, declare all models incapable, prescribe a semantic validator/repair loop, change approved prompt/defaults, or retry until green. Solution Designer owns investigation and any prompt/design/support-policy decision; renewed approval is required for changed intended behavior before design revision. API/E2E owns later bounded reproduction, acceptance evidence and successful durable-test review.

All API-C09 scoped browser/API and C10 primitive process-stop results remain attributed to API/E2E. Live status/failure retry/full resume and other14 baseline failures/full-suite/typecheck limitations remain. No new production/durable test edit, external data access, live provider call, browser/service mutation, commit/push/merge/release or WIP cleanup by reviewer.
