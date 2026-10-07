# API/E2E Test-Case Ledger — Grok Build compaction (API-REV-001)

## Planned Cases

| Case | Requirement | Surface |
| --- | --- | --- |
| REPO-01 ACP/Grok/accumulator/history units + typecheck | REQ-G1–G4 | Vitest |
| REPO-02 sweep HEAD vs base ea826a5e4 | REQ-G4 | Vitest json |
| WEB-1 web specs + Grok case | REQ-G2/G3 | Nuxt Vitest |
| E2E-L1 one live run (4 turns + reopened history + restore turn) | REQ-G1–G4 | real Studio server + grok 1.0.46 |

## Execution Events

| Seq | Case | Observed | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | REPO-01 | 17 files, 151 tests passed; `tsc -p tsconfig.build.json` exit 0; backends/acp has no "grok" string | Pass | console |
| 2 | WEB-1 | 31/31 incl. the new Grok case (3 distinct rows: auto completed, abandoned failed with the reason, manual completed) | Pass | console |
| 3 | REPO-02 | HEAD 1958 passed / 63 failed; base 1938 / 61; same 61; 2 HEAD-only = first-run `TEST_SERVER_BUILD_REQUIRED` (stopped-run-model-config), isolated rerun 2/2 pass | Pass | sweep-head.json, sweep-base.json, rerun-stopped-run-model-config-head.log |
| 4 | E2E-L1 run 1 | Steps 1 (dump A) and 2 (dump B → start → interrupt → failed close) passed. Step 3: "second automatic compaction start" seen, then the turn ended (TURN_COMPLETED) with no `compacted`; timeout "automatic compaction completion". The last 20 events before TURN_COMPLETED contain no COMPACTION_STATUS, so no abandoned close at turn end: the operation was already closed earlier in the turn, presumably by a Grok-reported failed/cancelled (never observed before, G14). Evidence lost: the test's afterAll removed the temp memory and GROK_HOME. ~/.grok/auth.json unchanged (mtime 08:12:52 before and after). | **Unresolved** (cannot classify) | live-grok-run1.log |
| 5 | — | Added to the live test: on failure, copy memory + GROK_HOME session files (excluding auth.json) to `GROK_E2E_EVIDENCE_DIR`; timeout errors list all compaction payloads | — | test file |

| 6 | E2E-L2 minimal live probe | User OK ("spend as little as possible"). Temporary probe (2 tiny turns, /compact, restore). Turn 1 never answered: Grok's unified.jsonl shows `429 Too Many Requests: subscription:free-usage-exhausted` (08:59:10–13Z), then turn_ended outcome error. **The user's Grok free usage is exhausted**, so no credits were spent and no live result was obtained. Run 1's step-3 anomaly (08:51–08:54) is most likely the same exhaustion surfacing as a Grok-reported compaction failure (unprovable; run-1 evidence was deleted). | **Blocked** (credits) | live-grok-probe.log, live-grok-probe/ (Grok session logs, no auth) |
| 7 | E2E-R1 (new durable, zero credits) | grok-build-compaction-replay.e2e.test.ts: real Studio server + fake Grok CLI replaying the real 1.0.46 compaction recordings. Automatic: 3 pairs (same ids, tokens, duration), 3 segments, markers, history 1 completed row. Stop during automatic: failed close (`grok.compaction_abandoned`, same id) before the turn end, 0 segments; the next pair rotates (1 segment); history 1 completed row. Manual `/compact`: 1 completed (manual), 1 segment, history at the boundary. 3/3 pass. | Pass | grok-compaction-replay-e2e.log |
| 8 | REPO-03 | existing grok-build-runtime-replay.e2e + the new replay E2E: 9/9 pass | Pass | console |

## Re-entry

Remaining: a green live run of grok-build-compaction-live.e2e.test.ts needs Grok credits (exhausted 2026-10-07). Waiting for the user's decision: accept the current evidence, or re-run once after the credits reset.
