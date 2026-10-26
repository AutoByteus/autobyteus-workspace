# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 10-26 18:13 | (process) | Checkpoint | — | Round 1 plan written; reviewed source 41501c5a41 |
| 10-26 18:14 | API-D01 | Completed | Pass | new test passes (4/4); control 2 (walk from memory root, no imports skip) fails it; committed |
| 10-26 18:15 | API-R03 | Started | — | server build |
| 10-26 18:15 | API-R03 | Completed | Pass | build exit 0 |
| 10-26 18:15 | API-R04 | Started | — | memory-search browser probe, clean env |
| 10-26 18:16 | API-R04 | Completed | Pass | 21 checks, pageErrors [] |
| 10-26 18:16 | (desktop) | Started | — | isolated-app start --build with data root /private/tmp/wjs-api/root |
| 10-26 18:22 | (desktop) | Checkpoint | — | iso-53567-504c up; control 53567, graphql 53568; data root /private/tmp/wjs-api/root; 0 work_journal dirs at start |
| 10-26 18:22 | API-L01 | Started | — | first build on the real-size copy |
| 10-26 18:27 | API-L01 | Checkpoint | — | steps 1–3 done (journals 1:52, text 3:30); meaning embedding in background, sampler pid 49503 to /private/tmp/wjs-api/L01-status.jsonl; next: API-L03 Browse, API-L02 journal view while meaning runs |
| 10-26 18:27 | API-L03 | Started | — | Browse on real data |
| 10-26 18:28 | API-L03 | Completed | Pass | 4 task teams tagged; no old vocabulary; configured team list limited by the copy (no DB records) |
| 10-26 18:28 | API-L02 | Started | — | search → open at lines; large journal navigation |
| 10-26 18:31 | API-L02 | Completed | Pass | open at lines, 6.7 MB journal: day/line jumps ~0.3 s, windows, matches, back; Raw Traces |
| 10-26 18:31 | API-L13 | Started | — | docker node:sqlite FTS5 check |
| 10-26 18:32 | API-L13 | Completed | Pass | node v22.23.3 / sqlite 3.51.3: contentless delete, CJK phrase, vocab OK |
| 10-26 18:33 | API-L07 | Started | — | AC-013 Codex, PTM without search_memory |
| 10-26 18:34 | API-L08 | Started | — | AC-009: turn 2 in run project_task_manager_1410f2fa… carries token quokkavermilion4471 |
| 10-26 18:35 | API-L07 | Checkpoint | — | Codex part done (no tool; direct call 'not a function'); native part pending |
| 10-26 18:35 | API-L08 | Checkpoint | — | text found 21.1 s after turn end; status READY during live passes; recheck CR-002 at 250 ms after meaning completes |
| 10-26 18:42 | API-L07 | Completed | Pass | Codex + native: no search_memory without opt-in |
| 10-26 18:42 | API-L05 | Checkpoint | — | opt-in done in the definition editor (General → search_memory; 17 tools); waiting for the Meaning index before real-agent questions |
| 10-26 18:42 | API-L12 | Started | — | source instance --from-worktree for Memory Sync |
| 10-26 18:46 | API-L12 | Checkpoint | — | imported run synced; never returned by search; page shows it read-only; recheck after Rebuild (L10) and restart (L11) |
| 10-26 18:46 | (finding) | Checkpoint | — | candidate F-001: codename-like off-topic cues get MEANING/STRONG matches and no only-weak note; measure after the Meaning index completes |
| 10-26 19:42 | API-L01 | Checkpoint | — | host slept 17:52–18:42 UTC (pmset: Deep Idle, dark wakes); sampler gaps are sleep; caffeinate -i -s -w 41439 started; meaning 4768/7428 |
| 10-26 19:42 | API-L06 | Started | — | native PTM + search_memory, qwen via LM Studio, Q06 |
| 10-26 19:50 | API-L06 | Completed | Pass | native: search_memory used once; right run (#3) and day; no read of lines |
| 10-26 19:55 | API-L01 | Completed | Pass | journals 1:52, text 3:30, meaning 88.5 min wall (≈40 awake) |
| 10-26 19:55 | API-L04 | Started | — | gates via GraphQL on the complete index, load ~8 |
| 10-26 19:56 | API-L04 | Checkpoint | — | part 1 HTTP: p90 640, max 1198, 30/32 top10 (no asking run); part 2 eval command during the restart case |
| 10-26 19:56 | F-001 | Started | — | off-topic probe on the complete index |
| 10-26 19:56 | API-L05 | Started | — | Codex PTM + search_memory: Q01 |
| 10-26 20:38 | API-L05 | Checkpoint | — | user direction: phrase questions as 'Please search your memory: …'; unprompted runs (Q07 zh/en, Q13 no tool use) kept as observation |
| 10-26 20:42 | API-L05 | Completed | Pass | prompted: Q07 2 steps right run, Q13 right run, absent codename honest; unprompted: tool not used (O-1) |
| 10-26 20:43 | API-L08 | Completed | Pass | 21.1 s and 25.2 s to text; 173 samples READY, 0 coverage notes during live pass |
| 10-26 20:43 | API-L11 | Started | — | stop instance (data root kept), eval command (L04 pt2), meaning scores (F-001), start again |
| 10-26 20:45 | API-L04 | Completed | Pass | gate1 31/31, top3 26/31, p90 508 max 900 (load 8.5–14), offTopic 3/3, 0 secrets |
| 10-26 20:45 | F-001 | Completed | Fail | 7 codename cues + T3 get MEANING/STRONG, no only-weak note; scores 0.77-0.80 straddle floor 0.78 |
| 10-26 20:47 | API-L11 | Completed | Pass | no model at start (27 thr, 243 MB); first search 'meaning index is loading'; model loaded on it (31 thr, 468 MB); store reused |
| 10-26 20:47 | API-L10 | Started | — | model switch to LEAF-IR, then Rebuild with a Codex turn during it (API-L09) |
| 10-26 20:48 | API-L09 | Started | — | Rebuild clicked; Codex turn with wombatcitrine6614 during the pass |
| 10-26 20:51 | API-L09 | Completed | Pass | turn during Rebuild found 1.6 s after the pass ended |
| 10-26 21:05 | API-L10 | Completed | Pass | MODEL_CHANGED shown, words only; Rebuild → LEAF-IR meaning complete 20:04 |
| 10-26 21:05 | F-001 | Checkpoint | — | also under LEAF-IR: meaning STRONG on C1, C2, C4, T1, T3 |
| 10-26 21:10 | (process) | Checkpoint | — | cleanup done; private screenshots moved; next: commit, API-R05, handoff |
