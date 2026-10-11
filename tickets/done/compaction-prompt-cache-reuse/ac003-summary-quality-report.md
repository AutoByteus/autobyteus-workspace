# AC-003 Summary Quality Report — cached summary vs today's transcript summary

## Round 5 (final): commit `097192731`

Sonnet 5's transcript summary of history B, which round 4 rejected only because of `(none) — <explanation>`, is now accepted on attempt 1; history A is still accepted on attempt 1. With this, every model meets the SR-011 release bar:

| Model | Cached note accepted and read from cache | Transcript summary accepted within 3 attempts (A / B) |
| --- | --- | --- |
| Opus 5.5 | Yes, 96–97 % | Yes / Yes |
| Sonnet 5 | Yes, 96.6 % and 97.4 % | Yes / Yes |
| DeepSeek v4 Flash | Yes, 96.7 % | Yes / Yes |
| Gemini 3.8 Flash | Transcript-only | Yes / Yes |

The quality judgments in rounds 3 and 4 stand:
- Opus: cached better or equal.
- Sonnet 5 and DeepSeek: gap A recorded for the follow-up task.
- Gemini: transcript-only, as before this ticket.

**Your review of this report is needed before release.**

---

## Round 4 (current): SR-011 release bar, commit `090353579` (the parser now also accepts a summary without the markers)

| Model | Cached note accepted and read from cache | Transcript summary accepted within 3 attempts (A / B) | Release bar |
| --- | --- | --- | --- |
| Opus 5.5 | Yes. CCR-E2E-001 cache read 96.7 %, CCR-E2E-004 96.4 %; quality conditions met in round 3 | A: attempt 1 (with markers) / B: attempt 1 (with markers) | **Met**, no regression |
| Gemini 3.8 Flash | n/a (transcript-only) | A: attempt 1 / B: attempt 1 (with markers); CCR-E2E-003 passes | **Met**, no regression |
| DeepSeek v4 Flash | Yes. Accepted; 96.7 % read from cache (OLR-E2E-010); the real-provider scenario passes | A: attempt 1 (**without** markers, now accepted) / B: attempt 1 (with markers) | **Met** |
| Sonnet 5 | Yes. Accepted; 96.6 % and 97.4 % read from cache (two CCR-E2E-001 runs) | A: attempt 1 (without markers, now accepted) / **B: rejected in all 6 attempts across 2 runs** | **Not met on B** |

**Why Sonnet B fails (F-9).**
- Every reply is a complete nine-heading summary. Under "Files created or changed", Sonnet writes `(none) — this has been a read-only investigation; no files have been created, edited, or deleted.` or `(none — …)`.
- That is true: the older part of history B has no file writes.
- The validator accepts only a bare `(none)` or `-` bullets, so the whole summary is rejected.
- On the transcript path (Sonnet's fallback) this history would therefore block after 3 attempts.
- The fix is a parser or prompt decision, for example accepting `(none)` followed by an explanation on the same line.

**Quality spot-check of the newly accepted summaries without markers** (Sonnet A, DeepSeek A): the continuation from them works normally (current state, commits, release, worktree).
- DeepSeek's transcript-context answer flags the overstated "tests passed" claim.
- Sonnet's repeats "ran vitest run (passed)", the gap-A pattern, now also on its transcript path. This is part of the gap-A follow-up task.

Residual N-3 (a summary without markers, truncated within its last section and reported as complete): not observed. All accepted replies ended with complete sections and `complete` status.

---

## Round 3 (current): instruction v5, prompt v6, per-model mode, commit `97fd9a814`

Same two real histories (A: delivery run, 464k tokens; B: design run, 195k tokens), same plans and continuation questions. Each model wrote its own notes and continued on its own model. Verbatim: `api-e2e-evidence/round3/ac003-side-by-side-round3.md`; data: `api-e2e-evidence/round3/ac003-*/ac003-results.json`.

### Per-model verdict

| Model | Cached note parses | Transcript summary parses | Gap A (unverified "unrelated / tests passed" claim) | Gap B (earlier decision / Skill Improver conflict) | Paths | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| **Opus 5.5** (catalog: cached) | 5/5 (AC-003 A, B + CCR-E2E-001/002/004) | 2/2 | **Fixed.** The note lists "full test suite never completed … not investigated", with the check to run, and flags that its own report says "npm run test passed". The continuation tells the user the test claim is wrong | Kept: the note records the earlier "visible compactor runs" decision and the Skill Improver conflict; the continuation names both | Joined superrepo paths in A (correct joins); one class name not in the history (B, also in the transcript summary) | **Cached better or equal**, keep `cached_conversation` |
| **Sonnet 5** (catalog: cached; family check) | 2/2 | **0/8** (all complete nine-heading summaries without the `<compaction_summary>` markers) | **Present.** The note states the assumption correctly under "Unverified points", but "Completed work" says the full suite "executed … confirmed", although it timed out, and the continuation calls the failures "unrelated … not blockers" | Kept the historical decision and the scope question; the continuation does not raise the "docs say visible" conflict | Joined paths; one shortened path (`/Users/normy/.../autobyteus-ts`) | **Cached note usable; its fallback never parses (F-5).** Gap A recurs on Sonnet |
| **DeepSeek v4 Flash** (catalog: cached, pending this gate) | 2/2 here (6/6 across rounds; plus OLR-E2E-010 and the real-provider scenario) | **1/6 here** (A: 0/4; B: 1/2); **3/9 across rounds 2–3** | **Present** (2 of 3 samples across rounds). The note calls the failures "pre-existing … unrelated" without marking it an assumption; the continuation repeats it as fact, while the transcript-context answer flags the overstated report | Kept the earlier decision; Skill Improver scope kept as a question | No wrong paths this round (round 2 had one) | **Gate fails on gap A** (REQ-002) → transcript. But its transcript summary failed all attempts on history A (F-5), so on the transcript path that compaction would block |

### New finding F-5: the v6 transcript prompt loses the summary-block markers on some models

- Sonnet 5 left out `<compaction_summary>` … `</compaction_summary>` in **8 of 8** transcript replies, and DeepSeek in **6 of 9** (rounds 2–3). Otherwise the replies were complete nine-heading summaries.
- The parser rejects such a reply. After 3 failed transcript attempts, compaction blocks.
- **Origin check:** the same Sonnet runs with the **pre-ticket v5 prompt** (six headings, base `e50826755`) included the markers in **3 of 3** replies. The regression comes from the v6 rewrite.
- Opus (4/4) and Gemini (all runs) include the markers.
- **Why it matters:** the transcript summary is now the only path for Gemini, Qwen, LM Studio, Ollama and custom models, and the fallback for cached models. A fix (prompt wording, or accepting a reply that has exactly the nine headings but no markers) is a Solution Designer decision.

### Decision for you and the Solution Designer

1. **DeepSeek:** by the agreed gate it goes to the transcript path, but until F-5 is fixed that path is less reliable than its cached note. Fix F-5 first, then decide.
2. **Sonnet 5:** shows gap A, unlike Opus. Keep it cached (its fallback is unusable until F-5 is fixed) or treat the family check as a concern.
3. **F-5** needs a prompt or parser decision.

---

## Round 2 (current): IR-003, nine-heading note (instruction v4, prompt v6), commit `1153984ee`

Same two real histories, same model (Opus 5.5), same plan and the same continuation questions as round 1, rerun through the product code at `1153984ee`. Verbatim summaries and answers: `api-e2e-evidence/round2/ac003-side-by-side-round2.md`; data: `api-e2e-evidence/round2/ac003-{A,B}/ac003-results.json`.

### Bottom line

- **The two round-1 weaknesses are fixed where it matters, in what the agent does next.**
  - **A (unverified "unrelated failures / tests verified").** The note now lists it under "Unverified points and open conflicts": "assumed pre-existing/unrelated; not checked against base. Check by running them on `origin/personal`". "Completed work" names evidence (commit hashes, push output, `git worktree list`). Continuing from that note, the agent told the user unprompted that its earlier "all tests passed" claim was overstated, that "unrelated" is an assumption, and offered the check.
    - **One remaining flaw:** the note also states the same failures as "unrelated to this change" under "Decisions and findings". The point appears twice, once as fact and once as unverified.
  - **B (dropped "Skill Improver intentionally visible" finding).** The note now keeps it ("visible Retrospective Skill Improver" per `docs/modules/skill_improvement.md`; hiding it may remove it from the settings picker) and turns it into a decision for the user. Continuing from that note, the agent raised it as decision 1. It also caught that its own records overstate the status ("Architecture Design Complete" while requirements are unapproved).
- **No new failure on Opus.**
  - All Opus notes parsed on the first try (2/2 here, 4/4 in the live server runs), so no fallback was needed.
  - The kept round-1 strengths remain: user words quoted, true current state, commit hashes all grounded. History A now also keeps the checkpoint commit `39555efe5`, which round 1 dropped.
- **Longer notes, as intended.**
  - History A note: 4.5k characters (round 1: 2.8k); history B: 8.9k (round 1: 7.7k).
  - The transcript summary is similar in size (4.7k / 10.2k), but covers only the older part.
  - No padding or repeated sections, apart from the one duplicate above.
- **Small grounding slips (minor).**
  - The B note names a class `FileAgentDefinitionProvider` that never appears in the history; the history only shows `this.provider.getAllVisible()`.
  - The A note writes some file paths in full by joining the superrepo path with a relative path, e.g. `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/docs/terminal_tools.md`. The history only has the worktree path for that file. The joined path is plausible after the merge but was never shown. This likely comes from the new rule "write every path in full".
- **New issue on Gemini (not on Opus): the note can record the request to write it as a user request.**
  - In the live Gemini run, the note listed under "Requests and instructions received": `User: "Your context window is nearly full. … write now..." (open - responding now)`.
  - That line stays in the agent's context after compaction.
  - It happened in 2 of 2 live Gemini runs. It did not happen in the 2 Gemini notes written from the long real histories, or in any Opus note.
  - The agent still answered correctly afterwards, but its memory now holds a phantom "open" user request. This needs a decision by the Solution Designer.
- **Cost (Opus 5.5 prices):**
  - Cached note with the agent's prefix already cached (the production case): about $0.13 (A) and $0.11 (B).
  - Transcript summary: $0.09 (A) and $0.39 (B).

### Checklist verdicts (cached v4 vs transcript v6)

| # | Checklist item | History A | History B |
| --- | --- | --- | --- |
| 1 | Goal and constraints | ✔ Equal | ✔ Cached better (original request, workflow constraint, worktree) |
| 2 | User decisions and preferences | ✔ Cached better (quotes every user turn with status, latest first) | ✔ Cached better |
| 3 | Latest unresolved request | ✔ Cached better (nothing open; true) | ✔ Cached better (interrupted request marked cancelled; likely to be asked again) |
| 4 | Completed vs open work | ✔ Cached better | ✔ Cached better |
| 5 | Exact paths, identifiers, commands | ✔ All 8 commit hashes grounded (incl. `39555efe5`); ~ some joined full paths | ~ One ungrounded class name; all other paths and IDs grounded |
| 6 | Next steps | ✔ Equal | ✔ Cached better |
| 7 | No invented facts; nothing marked done/verified without evidence | ~ "Completed work" is evidence-based; "unrelated" still stated once as a finding (also correctly listed as unverified) | ✔ (the "without restart" claim comes from the agent's own design doc, as in the transcript summary) |
| 8 | Blocked items stay blocked | n/a | ✔ |
| 9 | User instructions distinct from quoted text | ✔ | ✔ (earlier decision attributed to the ticket document) |
| 10 | Detailed enough, not over-compressed | ✔ (fixed vs round 1) | ✔ (fixed: the Skill Improver finding is kept) |
| 11 | Distinct phases kept separate | ✔ | ✔ |
| 12 | Resolved work not listed as pending | ✔ | ✔ |

**Continuation check:** both contexts, both histories:
- the agent knew the current state;
- it kept the user's decisions;
- it did not redo work;
- it used correct identifiers (0 unknown identifiers in the status answers).

From the cached context, the agent now corrects its own earlier overstatements (A) and raises the open conflict (B), the two things it missed in round 1. Each continuation is still one sample per context.

### Decision for you

The cached note is now at least as good as the transcript summary on every checklist item in both histories. One duplicate point (A) and one ungrounded class name (B) remain; both are minor. The open item is the Gemini behaviour above: recording the "write your note" request as an open user request. The options for the Solution Designer are:
- one instruction line, for example "do not list this request to write the note";
- or accept it.

### Per-provider judgment (round 2)

The same comparison was run on each provider I tested. Every provider's notes, summaries and continuation answers came from that provider's own model, on the same two histories, plans and questions. Verbatim:
- `api-e2e-evidence/round2/ac003-side-by-side-round2.md` (Opus);
- `ac003-side-by-side-gemini.md`;
- `ac003-side-by-side-deepseek.md`.

| Provider (model) | Note parses (cached / transcript) | Is the cached note better? | Main strengths | Main weaknesses |
| --- | --- | --- | --- | --- |
| **Anthropic** (`claude-opus-5-5`) | 6/6 / 2/2 (cached: AC-003 A, B + CCR-E2E-001/002 in r1 and r3; transcript: AC-003 A, B) | **Yes: better.** At least as good on every checklist item in both histories; better on requests, current state, open conflicts and next steps. Round-1 weaknesses fixed in the continuations | Quotes the user verbatim; lists unverified points with the check to run; keeps conflicting earlier findings (Skill Improver); names evidence under "Completed work" | One point stated both as a finding and as unverified (A); one class name not in the history (B); some joined full paths (A) |
| **Google Gemini** (`gemini-3.8-flash`, Vertex Express) | 7/7 / 5/5 (cached: A, B twice + CCR-E2E-003 r1–r3; transcript: A, B twice + AC-010 probe) | **No: about equal.** The continuations from both contexts were equivalent in both histories. The cached note is better on requests and current state, but worse on two items | Current state and request list correct; short (5.5k / 6.2k characters) | **A:** "Unverified points: (none)", which drops the full-suite timeout, and no commit hashes (the transcript summary kept both). **B:** drops the earlier user decision that compactor runs were made visible on purpose (the transcript summary kept it). **F-4:** in 2 of 3 live runs the note listed the compaction request itself as an open user request. Many file paths rewritten from the worktree to the superrepo location (plausible after the merge, never shown) |
| **DeepSeek** (`deepseek-v4-flash`) | 4/4 / 2/3 (cached: A run 1, A run 2, B + the 4,096-limit real-provider probe; transcript: one reply on A run 1 had no summary block) | **Mostly yes: equal or better.** B: better (keeps the historical decision with the user's quote, concrete unverified points, flags the status inconsistency). A: one sample better, one equal | Very thorough (9.9k–14k characters); honest unverified points in most samples; parses reliably | **A, run 2:** frames the test failures as "unrelated" again, and its continuation repeats that as fact, while the transcript-context answer flags it (round-1 weakness A, 1 of 2 samples). One wrong path in B (`/Users/normy/autobyteus-workspace-superrepo/...`, missing `autobyteus_org/`). Long notes. **F-3:** a note this long does not fit an agent output limit of 1,024 tokens |

**Overall.**
- **Opus:** the cached note is clearly better.
- **DeepSeek:** equal or better, and more reliable to parse than its transcript summary.
- **Gemini:** not better. The continuation quality was the same as with the transcript summary, the note is thinner on open doubts and earlier decisions, and F-4 occurs.

A Gemini-specific instruction tweak is not in scope. The one-line instruction fix for F-4 and an emphasis on "keep earlier decisions and open doubts" would likely help Gemini most. That is a decision for the Solution Designer and you.

**Round 1 (IR-002) is kept below for reference.**

---

This report is for user review before release (AC-003, SR-005/SR-006). It compares the new **cached summary**, where the agent summarizes its own conversation with the IR-002 instruction, with **today's transcript summary**, which applies the v5 summary prompt to the rendered older history. Both use the same real history, the same model (Claude Opus 5.5), and the same compaction plan. It also checks how the agent continues from each compacted context.

Raw material: `api-e2e-evidence/ac003/ac003-side-by-side.md` holds every summary and every continuation answer verbatim. The run data is under `api-e2e-evidence/ac003/run-*/ac003-results.json`.

## Bottom line

- The cached summary is **better or equal on most checklist items** in both histories.
  - It keeps the user's own words, including the original request and the latest instructions.
  - It records the true current state: what is done, what is not approved, and that an interrupted request was cancelled.
  - All its identifiers are grounded in the history.
- It is **weaker on two specific points**, both visible in the history:
  - **A.** It repeats one of the agent's own unverified conclusions as fact: that test failures were "pre-existing / unrelated" and tests were "verified".
  - **B.** It drops an earlier finding that contradicts a later recommendation. The docs describe the Retrospective Skill Improver as intentionally visible, while the agent later recommended hiding it. In the continuation check, the agent working from the cached context then did not notice that conflict. The agent working from the transcript context did.
- Both weaknesses also occur with the **old IR-001 wording**, which has the full v5 guidance. So they are not caused by the IR-002 rewrite. They come from how the cached request works: the agent summarizes the whole conversation from its latest point of view, so superseded early findings and its own conclusions tend to stay in, unchallenged.
- **Continuation:** from both compacted contexts the agent knew the current state, kept the user's decisions, did not redo work, and used correct paths and identifiers. No answer contained a wrong or invented fact. The transcript-context answers were somewhat more self-critical in history B.
- Under AC-003, "worse on any checklist item" goes to the Solution Designer before release. **Your decision is needed:** accept the cached summary with these two weaknesses (it is clearly better elsewhere and far cheaper), or ask for an instruction or design change first.

## What was tested

| | History A | History B |
| --- | --- | --- |
| Source | Your real native run `software_engineering_team_9c3876…/delivery_engineer_2fdd93b9…` (read-only copy) | Your real native run `software_engineering_team_b2cded97…/solution_designer_052deeed…` (read-only copy) |
| Size (Anthropic-counted input tokens) | **464,106** (meets ≥ 200k) | 194,548 (second sample, just under 200k) |
| Shape | Delivery and finalization of a finished ticket. The user changed their mind on releasing; the worktree was cleaned up by another agent | Investigation and design for "hide internal agents in the frontend". Requirements not approved; the last user request was interrupted |
| Compaction plan (real planner) | 16 older units compacted, 116 recent messages kept | 92 older units compacted, 80 recent messages kept |

How it was run:
- The history is restored into a real `MemoryManager`, exactly as on a restore.
- The context size is set so this history sits at the compaction trigger, as a context override in Settings does.
- Both summaries come from the product's own `LlmPhaseSummaryPort`, on the same baseline and plan.
- Two compacted contexts are built with the product's `prepareCompaction` + validator + commit.
- The same two next user messages are sent to each, on Opus 5.5 with the agent's tools.
- All calls are real Anthropic API calls with your key.

Next user messages (answered from memory, without tools; the original working environment no longer exists):
- **A:**
  1. "status of the ticket: branch, exact commits, released?, worktree?, anything open";
  2. "prepare the release after all; exact commands and checks first".
- **B:**
  1. "remind me of my original request and roughly how your design works";
  2. "where are the design files, what is approved or reviewed, what is open or blocked".

## Checklist verdicts (cached IR-002 vs transcript)

✔ = good, ~ = acceptable with a gap, ✗ = shortfall. "Better" and "worse" are relative to the transcript summary.

| # | Checklist item | History A | History B |
| --- | --- | --- | --- |
| 1 | Goal and constraints | ✔ cached keeps the user's latest instructions verbatim ("continue your finalization and no need to release a new version"); transcript has more role and process detail. **Equal** | ✔ cached quotes the original request verbatim, plus the edit-file rule and handoff rules. **Cached better** |
| 2 | User decisions and preferences | ✔ cached has "no release", approval after the fact, and "its just my question". Transcript (older part only) has none of these; they stay in the kept recent messages. **Cached better** | ✔ cached lists the earlier user decision ("a compactor agent is still just an agent") and the three open questions for the user. **Equal / cached better** |
| 3 | Latest unresolved request | ✔ cached: nothing open; the worktree question was only a question. Transcript: stale by design, corrected by the kept messages. **Cached better** | ✔ cached states the interrupted request is cancelled and the next message is to be awaited. **Cached better** |
| 4 | Completed vs open work | ✔ cached matches the true final state. **Cached better** | ✔ cached: requirements NOT approved, no handoff sent, no implementation. **Cached better** |
| 5 | Exact paths, identifiers, commands, errors | ~ cached has the superrepo path, commits `6f3b0b6c9` and `edf2d428b`, and the worktree path and branch, but drops the pre-merge checkpoint commit `39555efe5` (transcript keeps it). **Slightly worse, minor** | ✔ cached has every file path (with line numbers), the setting name, base commit `9267d11c8`, and the ticket files with their statuses. Transcript has 3 inexact references: the class name `FileAgentDefinitionProvider` is not in the history; `AUTOBYTEUS_SHOW_INTERNAL_AGENT_RUNS` is a proposal the history later named `…_AGENTS`; and a paraphrase is shown in quotes. **Cached better** |
| 6 | Next steps | ✔ both. **Equal** | ✔ cached gives the exact approval → status → handoff sequence. **Cached better** |
| 7 | No invented facts / nothing marked done or verified unless it was | ✗ cached says the full test suite had "pre-existing env-dependent failures … unrelated" and lists "tests verified". The history shows the full run **timed out** with failures in its partial output, and nobody established that they were unrelated or pre-existing. The transcript says "full-suite result not confirmed", which is correct. **Cached worse** | ✔ cached is fully grounded; transcript has the 3 inexact references above. **Cached better** |
| 8 | Blocked items stay marked blocked (SR-006) | n/a (nothing blocked) | ✔ cached: "Requirements have NOT been explicitly approved … No handoff". The continuation correctly answered "Blocked on your approval". **Pass** |
| 9 | User instructions distinct from quoted tool/document text (SR-006) | ✔ the messages from other agents and the user's requirements are kept apart | ✔ the earlier decision taken from a ticket document is attributed to that document ("Historical context …: the user previously decided …"), not presented as a new request. **Pass** |
| 10 | Detailed enough, not over-compressed (SR-006) | ~ 2.8k characters for the whole conversation (transcript 4.2k for the older part only). Older test details and the checkpoint commit are compressed away | ✗ 7.7k characters for the whole conversation (transcript 8.7k for the older part only). It **drops the finding that the docs describe the Retrospective Skill Improver as intentionally visible**, which conflicts with the later recommendation to hide it. **Cached worse** |
| 11 | Distinct phases kept separate | ~ the finalization steps are one list, but each step is a separate bullet | ✔ investigation, design and ticket creation are separate |
| 12 | Resolved work not listed as pending | ✔ | ✔ |

## Continuation check

| | Knows current state | Keeps decisions/constraints | No redone/lost work | Correct paths/identifiers | Notes |
| --- | --- | --- | --- | --- | --- |
| A, cached context | ✔ finalized, no release, worktree gone | ✔ asks before any push or release | ✔ | ✔ (0 unknown identifiers in answer 1) | Answer 2 does not guess a version; it plans a read-only investigation first |
| A, transcript context | ✔ | ✔ | ✔ (also found a possible data-loss risk in a deleted untracked folder; that evidence sits in the kept recent messages both contexts had) | ✔ recalls `39555efe5` | Infers v1.4.45 from the history, labelled as an inference |
| B, cached context | ✔ requirements not approved, nothing handed off | ✔ | ✔ | ✔ (0 unknown identifiers) | Repeats the agent's earlier claim that the setting works "without a restart" and recommends hiding both agents, **without noticing the Skill Improver conflict** |
| B, transcript context | ✔ | ✔ | ✔ | ✔ | **Flags the agent's own earlier errors:** the Skill Improver conflict, env-over-Settings precedence, the unverified no-restart claim, uncovered live views, mismatched filter points |

Each continuation is a single sample per context, so some differences are model variance. The history-A data-loss remark is one: its evidence was in the kept recent messages of both contexts. The history-B Skill Improver conflict is not variance: that finding exists only in the compacted older part, so only the transcript summary carried it.

## Reference: old IR-001 wording (optional variant, SR-006)

| | History A | History B |
| --- | --- | --- |
| Cached summary, IR-001 wording | Same "pre-existing / unrelated" claim; drops `39555efe5`; omits the former worktree path (IR-002 keeps it) | Also drops the "intentionally visible" finding; the continuation also misses the conflict |

**Conclusion:** the two weaknesses come from the cached-request approach, not from the IR-002 rewrite. IR-002 is otherwise at least as good as IR-001: it is better at quoting the user verbatim and kept the former worktree path.

## Cost observed (Opus 5.5 prices)

| | History A | History B |
| --- | --- | --- |
| Transcript summary (today) | 11,709 uncached input + 1,683 output ≈ **$0.08** | 75,913 uncached + 3,567 output ≈ **$0.37** |
| Cached summary, production case (prefix already cached by the agent's own previous request) | 464,666 read from cache + ~1.1k output ≈ **$0.12** (measured in run-3 with a warm cache) | ≈ 194.5k read + ~3k output ≈ **$0.10** (computed from the same rates) |
| Cached summary, cold (nothing cached yet, as in this harness) | 464,106 written to the 1h cache ≈ $3.71 | 194,548 written ≈ $1.56 |

**Note.** Today's transcript path sends only the older part, with each item truncated to 2,000 characters. So it is cheaper than "the whole history at full price" when tool outputs are long:
- **History A:** the two cost about the same.
- **History B:** the cached summary is about 3.7× cheaper.

The cached summary's real advantage is that it covers the whole conversation at cache-read prices. The saving depends on the history's shape.

## Recommendation

- **Option 1: accept as is.** On these two real histories the cached summary is the better summary overall and costs the same or less. The two weaknesses are real but narrow. In both, the continuing agent still behaved correctly on everything checked, except for noticing the one dropped conflict in B.
- **Option 2: improve before release** (Solution Designer, with your approval). Add one instruction line to the cached summary instruction: keep earlier findings or constraints that conflict with later decisions, and keep the agent's own unverified conclusions labelled as unverified. Then rerun this comparison on the same two histories.

Limitations:
- Two histories, one sample each.
- Continuations were 2 turns answered from memory, because tool execution in the original environment is no longer possible.
- History B is just under the 200k-token mark.
