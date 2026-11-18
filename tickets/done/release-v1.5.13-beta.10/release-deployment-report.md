# Release Report — release-v1.5.13-beta.10 (autobyteus-529): beta v1.5.13-beta.10

Status: **in progress (checks before tagging).**

## Scope

- Release request (`Release Requested`; `handoff-release-requested.md`): one beta of the latest `origin/personal`, v1.5.13-beta.10. The founder: "Next beta please." (2026-11-18).
- No validated package: the release guide's checks are the verification.
- Content since `v1.5.13-beta.9`: autobyteus-520 (Docker release build: one native runner per architecture, registry cache), 515 (native tool search), 522 (phone Settings in every run's menu), 524 round 1 (`run_bash` start limit 30 s), 448 part 2 ("Background task running"), 493 (per-agent episodic catalog), 525 (phone-wide Text size under "On this phone"). Base `0570c47fd9`.

## Project Release Guide

- `RELEASE.md` on `origin/personal` `0570c47fd9`. New since beta.9 (autobyteus-520): the Server Docker Release's build-only run for Docker changes; a single failed architecture is rerun with `gh run rerun <id> --failed`, never "Re-run all jobs"; the package job waits up to 60 minutes for the GitHub release.
- Deviations: `None` so far.

## The Founder's Decisions (his words, relayed by the Solution Designer, 2026-11-18)

| Gate | Decision |
| --- | --- |
| autobyteus-493 writes catalogs into his real memory (about 124 under `memory/episodic/`, about 12 s; warnings for old team runs without a tree) | Approved with no backup: "Why do we need to backup first I don't understand please no need to backup". "What you need to do" names the one-time catalog build and the warnings, with no backup step. |
| The stale smoke assertion (`configured-skill-on-demand-loading.e2e.test.ts` ~line 291, the expected heading list lacks "## Long-Running Commands") | Waived for beta.10 only: "this release without a facing it and then create a follow-up and if the fix is extremely easy and just fix it". Every other smoke case must pass; any other failure goes back to the Solution Designer. The fix is autobyteus-517 item 1. |
| Grok | Only his standing word: "Waive grok if no usage limit anymore", for a Grok case failing solely on a usage limit. |
| Apple | Check the developer agreement before cutting. |

## Before Cutting

- Apple developer agreement: beta.9's macOS builds were signed and notarized on 2026-11-17 (both success at 17:02Z); no notarization refusal since beta.7's. Delivery cannot query Apple from this machine; the macOS jobs are the next proof.
- Released migrations: no migration added since `v1.5.13-beta.9` (`git diff v1.5.13-beta.9 HEAD -- autobyteus-server-ts/src/app-data-migrations` empty); `RELEASED` unchanged.
- Base re-checked: `origin/personal` `0570c47fd9`; `v1.5.13-beta.10` free on origin; `release_versions.py next-beta` → `1.5.13-beta.10`.
- Notes: the user-action section (`release-notes.md`), from the tickets' notes, the founder's 493 decision and the handoff's known issues. The 493 warning wording follows its design ("log once per start per instance"): at each start, one warning per old team run without its tree.

## Checks Before Tagging (on `a76ff5c252`: `0570c47fd9` plus this ticket's documents)

- `pnpm install --frozen-lockfile`, server `prebuild`: pass.
- Typechecks: server `production errors: 0; test-file errors: 1012 in 316 files (baseline 1012 in 316 files)`; web `production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)`.
- Registry-order test: pass. `check_licensing.py`, `check_repository_artifact_hygiene.py`, `check_secrets.sh v1.5.13-beta.9..HEAD`: pass.
- `release_smoke.py`: Claude 3/3, Codex 3/3, Grok 3/3, Antigravity 2/2, AutoByteus 2/2 PASS. Grok ran on `grok-4.5`: the CLI no longer offers the pinned `grok-4.7` (`grok-4.5 (pinned grok-4.7 not offered)`), as RELEASE.md allows. The only failure: `configured-skill-on-demand-loading.e2e.test.ts:291:70` "keeps ordinary native tools and configured skill reads explicit in the same active run", `expected [ '## Agent Identity', …(5) ] to deeply equal [ '## Agent Identity', …(4) ]` with `+ "## Long-Running Commands"`: exactly the assertion the founder waived for beta.10. Evidence: `evidence/delivery/DR1-pretag-*`.
