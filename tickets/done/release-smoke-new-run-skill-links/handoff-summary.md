# Handoff Summary

## What Ships

- `python3 scripts/release_smoke.py`: one command, run from the repository root before every beta and stable tag. It starts agent runs with configured skills on all five runtimes. Claude, Codex and Grok run live on their cheapest models (haiku, gpt-5.6-luna, grok-4.7). Antigravity and AutoByteus run scripted, with no provider calls. It covers a brand-new run, a brand-new team member with no memory folder yet, a workspace whose `.claude/.codex/.grok/skills` link to the same skill, a restored run, and a different same-named skill. It prints a per-runtime, per-scenario summary with the commit and models, and exits non-zero on any failure, skip or runtime that cannot run.
- Runner unit tests: `scripts/tests/test_release_smoke.py` (21 tests).
- Server E2E cases: `workspace-skill-links-live.e2e.test.ts` (live, smoke mode), AGY E09/E10 in `agy-linked-skills-transport.e2e.test.ts`, and two release-smoke cases in `configured-skill-on-demand-loading.e2e.test.ts`.
- `RELEASE.md` "Checks Before Tagging" → "Release smoke check", and a `Release smoke` row in TESTING.md.
- No production source change (BEH-003).

## Classification And Route

- `task_size` `Medium`, `architectural_risk` `Low`, route `Direct Low-Risk`. Architecture, code and test-code reviews: `Not Applicable — direct low-risk route`.

## Integration

- Bootstrap base `origin/personal` @ `cba6b85122`. Latest base checked: `origin/personal` @ `9f7c9c10a6` (1,192 new commits, including `autobyteus-ts`, the contract packages and the lockfile).
- Method: merge (`32eac02929`). Conflicts in `RELEASE.md` and `TESTING.md` came from separate additions in the same sections. Resolved by keeping both sides (see the docs sync report).
- Post-integration checks (TESTING.md "Rerun by impact" Rule 4 and 5: shared foundations changed, so everything was rerun):
  - `pnpm install`, `pnpm -C autobyteus-server-ts prebuild`: pass.
  - DEL-01 `python3 -m unittest scripts/tests/test_release_smoke.py -v`: 21 tests OK.
  - DEL-02 `pnpm -C autobyteus-server-ts typecheck` (its pretypecheck rebuilds the dependency packages): exit 0.
  - DEL-03 `python3 scripts/release_smoke.py` on `32eac02929`: 10 of 13 PASS, the same as API-08. Claude 3/3, Grok 3/3, Antigravity 2/2, AutoByteus 2/2. Codex's 3 cases were refused by the ChatGPT account usage limit (resets 2026-11-04 08:11 CET). Codex run start still worked up to the provider turn: run created, member folder created on the first message, collision refused. All four AC-008 snapshots were identical before and after. This run also covers the native and AGY suites (IMP-04/05). An earlier attempt failed closed before any turn: Grok's sign-in was being refreshed during the model handshake (FU-001 evidence). Grok was signed in right after, and the rerun passed.

## Verification

- Verified from the evidence; no user check was needed. Every critical criterion is proven except AC-001's single green run. The user accepted that gap on 2026-10-29 (SR-004): Codex has no passing run at the head because of the account quota, and it passed 3/3 on `e918bb6c44` (IMP-07). Details are in the release/deployment report.

## Release

- Decision: no release (RELEASE.md default; the user has not asked for one). The change ships with the next release.
- For the next tag: until the Codex quota resets (2026-11-04 07:11Z), the release smoke check will show Codex FAIL. A tag before then needs the user to waive Codex explicitly at that release decision, recorded in that delivery report. The 2026-10-29 waiver ("i waive that this time") was given for this ticket's validation. Confirm it again at that release decision.
- Release-machine notes: one run uses about 240k Grok tokens of the free 600k per 24 h (two runs today: 11:06Z and 13:01Z). `grok` is installed twice (`~/.grok/bin`, `~/.local/bin`). Delete the untracked `*/dist/` folders before `desktop-release.sh`.

## Follow-ups

- FU-001 (signed-out or refreshing Grok reported as "model not offered"): open, not urgent. The Solution Designer sends it.
- FU-002: resolved in this ticket (IR-002).
