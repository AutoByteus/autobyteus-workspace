# API-04-doc-review
# case: API-04 (AC-007, REQ-007; SCN-002)
# steps: read RELEASE.md "Checks Before Tagging" + "### Release smoke check" and the TESTING.md "Test layers" table at
#        the branch head; compare with AC-007's list and the design spec's "Guidance For Implementation"; check the
#        anchor and the commit split (git show --stat 6bd00b2f36 8f37ab5eb8)
# commit: 27e197bd724bbcce9db74d021efe851fcccde4d7 (docs identical to 8f37ab5eb8)
# date: 2026-10-19
# shows: every AC-007 item is present; TESTING.md has exactly one row, in its own docs(testing) commit

| AC-007 item | Where in RELEASE.md / TESTING.md | Present |
| --- | --- | --- |
| The command | "Checks Before Tagging" code block: `python3 scripts/release_smoke.py`; subsection first line | Yes |
| When it runs | "**When:** before every beta and stable tag, on the merged state you will tag, after `pnpm install` and `pnpm -C autobyteus-server-ts prebuild`." Intro: "Run these checks on the merged `personal` state." | Yes |
| Prerequisites | "**Prerequisites:** `claude`, `codex` and `grok` on `PATH` and signed in on this machine." | Yes |
| Cost | "**Cost:** about five short turns per live runtime (Claude, Codex, Grok), each on its cheapest model. Antigravity and AutoByteus run scripted, with no provider calls. A few minutes in total." | Yes (see observation 1) |
| Failure rule | "**Failure, or a runtime that cannot run:** no tag. The summary names the runtime, the scenario and the reason ... Find the cause first (TESTING.md Rule 9)." | Yes |
| Waiver rule | "The only exception is the user explicitly waiving a named runtime at the release decision. Record the waiver and its reason in the delivery report." | Yes |
| Release workflows do not run it | "The release workflows run the first two too, but by then the tag is already pushed. They do not run the release smoke check." | Yes |
| TESTING.md one row | line 42: `| Release smoke | New runs with configured skills start on every runtime, in the user's skill setup | python3 scripts/release_smoke.py; see [RELEASE.md](RELEASE.md#release-smoke-check) |` | Yes, exactly one |
| Anchor resolves | heading `### Release smoke check` (RELEASE.md:69) -> GitHub slug `release-smoke-check` | Yes |
| TESTING.md change in its own `docs(testing)` commit | `8f37ab5eb8 docs(testing): add the release smoke check to the test layers` — `TESTING.md | 1 +`, 1 file | Yes |
| RELEASE.md does not duplicate the required-case list (design Dependency Rules) | names the five runtimes and the scenario kinds only | Yes |
| Rest of RELEASE.md unchanged (Preserved Behavior Boundary) | diff `cba6b85122..HEAD -- RELEASE.md` touches only "Checks Before Tagging" | Yes |
| Consistent with "Cutting The Release" | the smoke runs before the release script; that section already says to delete untracked `*/dist/` first | Yes |

Observations (non-blocking):

1. The "Cost" line counts turns (the live suite sends 4 per runtime: new run, restore, team member, all-installed).
   It does not say that Grok's free tier is the binding limit: one smoke run used 147,643–238,085 Grok tokens
   (local session usage, 4 turns each, runs on 2026-10-18/19) against the free tier's 600,000 tokens per rolling
   24 h, and IMP-07 hit `429 ... free-usage-exhausted`. A release owner who used Grok the same day can be blocked
   until the window frees. Recommendation for the Solution Designer: optionally add this to "Cost". Not an AC-007
   gap (AC-007 asks for a cost statement, which exists).
2. RELEASE.md says "delivery report", AC-007 says "release report": the design's guidance chose "delivery report",
   which is the report the release owner writes. Same meaning; no change needed.
