# Delivery / Release / Deployment Report — autobyteus-326: v1.5.11-beta.1

## Release / Publication / Deployment Scope

- Project Task `autobyteus-326`: a release request (`Release Requested`) from the Solution Designer for the user. Beta `v1.5.11-beta.1` from `origin/personal` @ `5bde5a3349`.
- Content: first-parent `v1.5.10..origin/personal` holds only the release smoke check (autobyteus-149: merge `b681fc2e8c`, docs `5bde5a3349`). No product behavior change.
- No validated package (release request), so docs sync, the handoff summary and verification from evidence do not apply. The release guide's checks are the verification.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` on `origin/personal` @ `5bde5a3349` (blob `8165269e3e`)
- Deviations from the guide and why: `None`. The release smoke check failed on two runtimes, both refused by provider quotas. The user explicitly waived both at the release decision; this is the guide's exception, recorded below.
- Proposed guide fixes, and whether the user agreed: `None`

## Release Decision

- Decision: `Beta` (`v1.5.11-beta.1`)
- Decided by: the user, 2026-10-29, through the Solution Designer's release request (handoff `handoff-release-request.md`), and again in the delivery conversation: "i want release a new beta please".

## Checks Before Tagging (on `5bde5a3349`)

| Check | Result | Evidence |
| --- | --- | --- |
| `scripts/check_secrets.sh v1.5.10..HEAD` | PASS, 20 commits | `evidence/REL-01-checks-before-tagging.txt` |
| `python3 scripts/check_licensing.py` | Consistent | same |
| `python3 scripts/check_repository_artifact_hygiene.py` | Passed | same |
| Build-only release run `pnpm release:test --ref personal`, run [40880264109](https://github.com/AutoByteus/autobyteus-workspace/actions/runs/40880264109), 13:15–13:43Z | `success`: all five desktop builds passed; Publish skipped (build-only) | same |
| `python3 scripts/release_smoke.py`, 14:54–14:56Z | `FAIL` (exit 1): 7 of 13 PASS; Codex and Grok refused by quotas; both waived by the user | `evidence/REL-02-release-smoke.txt` |

### Release smoke summary (as printed)

```text
runtime     scenario                                 result  reason
claude      new run + restore, linked workspace      PASS
claude      brand-new team member                    PASS
claude      different same-named skill               PASS
codex       new run + restore, linked workspace      FAIL    You’ve hit your usage limit … try again at Nov 4th, 2026 8:11 AM
codex       brand-new team member                    FAIL    (same)
codex       different same-named skill               FAIL    (same)
grok        new run + restore, linked workspace      FAIL    429 subscription:free-usage-exhausted (602133/600000 tokens, rolling 24 h)
grok        brand-new team member                    FAIL    (same)
grok        different same-named skill               FAIL    (same)
antigravity brand-new run, linked workspace          PASS
antigravity brand-new team member, linked workspace  PASS
autobyteus  brand-new run, linked workspace          PASS
autobyteus  brand-new team member, linked workspace  PASS
commit    5bde5a33493b56d9ff79a4327a544d9cf71beb4b
models    {"claude": "haiku", "codex": "gpt-5.6-luna", "grok": "grok-4.7"}
duration  live 71s, antigravity 23s, autobyteus 11s
result    FAIL
```

- Cause (TESTING.md Rule 9): both are provider quota refusals, not product failures. Codex and Grok both created the run, created the brand-new member's memory folder on the first message, and refused the different same-named skill as designed. Only the model turns were refused. Grok ran out of quota partway through (602,133 of 600,000 tokens).
- Worktree and user data: `git status`, the CLI config hashes and the `~/.autobyteus` and `~/.codex` listings were identical before and after.
- Last passing runs of the waived runtimes on equivalent code: Codex 3/3 on `e918bb6c44` (autobyteus-149 IMP-07). Grok 3/3 on `32eac02929` (autobyteus-149 DEL-03, 2026-10-29 13:01Z), whose code is identical to `5bde5a3349` (later commits are ticket documents only).

### Waivers (the user's words, verbatim, 2026-10-29)

Asked to waive Codex and Grok explicitly for v1.5.11-beta.1, after being shown the summary above:

- Codex: "so basically even though codex now i have no limit, but i still want to release a new beta. because i trust the it will work when i got my codex limit back"
- Grok: "grok as well thanks. because earlier grok test already are successful"

Waived runtimes for `v1.5.11-beta.1`: **Codex** (ChatGPT account usage limit until 2026-11-04 07:11Z) and **Grok** (free-tier quota for the rolling 24 h).
