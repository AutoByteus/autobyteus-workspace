# Delivery / Release / Deployment Report — release v1.5.11-beta.3

## Scope

- Beta `v1.5.11-beta.3` from `origin/personal`. The user asked for it on 2026-10-30, with the condition: "earlier the evidence shows it does not work, but if now evidences show it works then we release a new beta".
- Contents since `v1.5.11-beta.2` (first-parent):
  - **autobyteus-8**, claude-anthropic-effort-control (merge `6a240b0d21`): Claude thinking effort on every Claude model, one Thinking list, gen-4 Claude rows removed, model-settings validation leaving out undeclared keys.
  - **autobyteus-328**, read-file-media-merge (merge `a0a038967c`): `read_file` reads image, audio and video and refuses binaries; `read_media_file` is removed; OpenAI function tools are sent with `strict: false`.
- Released commit: `38dd42fcbe` (release commit on top of `a0a038967c`).

## Project Release Guide

- `RELEASE.md` on `origin/personal`, last changed by `32eac02929` (the release smoke check, autobyteus-149).
- Deviations: `None`. The release smoke check failed for Grok on a provider quota, and the user waived Grok explicitly; this is the guide's exception, recorded below.

## Release History Of This Version

- **First attempt, on `8760c83788` (autobyteus-8 only): no tag.**
  - The release smoke check failed twice in its model check, before any live run:
    - `REL-01`: `grok model grok-4.7 is not offered; available: grok-4.5, grok-4.6`;
    - `REL-02`: with `GROK_E2E_MODEL=grok-4.6`, `grok model grok-4.6 is not offered; available: grok-4.7`.
  - The Grok catalog, a live handshake with the Grok CLI, returned different lists in consecutive runs. The cause was not proven.
  - The user judged the evidence for autobyteus-8 insufficient (its API/E2E final was 95% only by rounding, and there was no live Claude run on the final code). Delivery sent `Blocked` to the Solution Designer.
  - The build-only run `40999172119` passed.
- **Second attempt, on `a0a038967c` (autobyteus-328 finalized on top): released**, after the user's condition "if now evidences show it works".

## Checks Before Tagging (on `a0a038967c`)

| Check | Result | Evidence |
| --- | --- | --- |
| `check_licensing.py` | `Licensing is consistent.` | — |
| `check_repository_artifact_hygiene.py` | passed | — |
| `check_secrets.sh v1.5.11-beta.2..HEAD` | PASS | — |
| `release_smoke.py` (no overrides) | **FAIL, exit 1: 10 of 13 PASS.** Claude 3/3, Codex 3/3, Antigravity 2/2 and AutoByteus 2/2 pass; Grok 3/3 FAIL on a provider quota; **Grok waived by the user** | `evidence/REL-03-release-smoke-run3.txt` |
| Build-only release run `41017689978` (`pnpm release:test --ref personal`) | `success`: 5 of 5 desktop builds; publish `skipped` | — |

### Release smoke summary (run 3, as printed)

```
claude      new run + restore, linked workspace      PASS
claude      brand-new team member                    PASS
claude      different same-named skill               PASS
codex       new run + restore, linked workspace      PASS
codex       brand-new team member                    PASS
codex       different same-named skill               PASS
grok        new run + restore, linked workspace      FAIL    … ACP_PROMPT_FAILED … 429 Too Many Requests: subscription:free-usage-exhausted …
grok        brand-new team member                    FAIL    (same)
grok        different same-named skill               FAIL    (same)
antigravity brand-new run, linked workspace          PASS
antigravity brand-new team member, linked workspace  PASS
autobyteus  brand-new run, linked workspace          PASS
autobyteus  brand-new team member, linked workspace  PASS
commit    a0a038967c1176463f3acf4c2ea740f95fc4cc8e
models    {"claude": "haiku", "codex": "gpt-5.6-luna", "grok": "grok-4.7"}
result    FAIL
```

- **Cause (TESTING.md Rule 9):** a provider quota refusal of Grok's free tier, not a product failure. Grok's catalog offered `grok-4.7` this time, and each run reached the model turn, which xAI refused.
- **Waiver, the user's words, 2026-10-30:** "no worries, for grok, because its not very much used for grok for us right now. i could accept the grok not able to be tested for now you know".
- **Known gap:** the last passing real Grok run is still autobyteus-149's (2026-10-29, `32eac02929`). `v1.5.11-beta.1`, `beta.2` and `beta.3` all shipped with Grok waived.

## Release

- **Version and tag:**
  - `python3 scripts/release_versions.py next-beta` → `1.5.11-beta.3`;
  - `scripts/desktop-release.sh beta --branch finalize/release-v1-5-11-beta-3 --no-push` → `38dd42fcbe` and annotated tag `v1.5.11-beta.3`.
- **Push:** Secret Gate `a0a038967c..HEAD` passed. `origin/personal` was unchanged, so I pushed `a0a038967c..38dd42fcbe` and the tag.
- **Workflows,** watched together:

  | Workflow | Run | Result | Time (UTC) |
  | --- | --- | --- | --- |
  | Desktop Release | `41020422828` | success | 07:29:41 → 07:58:59 |
  | Server Docker Release | `41020422748` | success | 07:29:41 → 08:05:28 |
  | Android APK Release | `41020422721` | success | 07:29:41 → 07:35:21 |
  | iOS App Store Connect Release | `41020422807` | success | 07:29:41 → 07:44:57 |

- **GitHub:** pre-release `v1.5.11-beta.3`, not a draft, **17 of 17 assets**. GitHub Latest stays `v1.5.10`.
- **Docker Hub:**
  - `:1.5.11-beta.3` and `:beta` share digest `sha256:d25228348b12676b…`, for amd64 and arm64;
  - `:latest` is unchanged on `1.5.10` (`sha256:a1c22e2e4186d874…`).
- **Result:** `Completed`.
- **Release notes:** GitHub-generated for the beta (RELEASE.md).

## Rollback

- Fix forward with the next beta. Desktop updates never downgrade, and `:beta` only moves forward.

## Cleanup

- Release worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1-5-11-beta-3` and its local branches: removed after this record is pushed. The release branch was never pushed.
- `/tmp/ab-beta3`: removed.

## Final Status

- Released: `Yes`, complete.
- Grok: waived by the user for this release.
- Unresolved for the Solution Designer:
  - the autobyteus-8 `Blocked` message from earlier today is superseded by the user's release decision on today's evidence. The smoke check's live Claude runs passed (Claude Agent SDK, `haiku`), but they are general run, restore and skill scenarios, not a targeted test of the thinking-effort setting; autobyteus-8's own evidence is unchanged;
  - the Grok catalog instability seen in `REL-01`/`REL-02` is still unexplained;
  - the smoke test stops every live runtime when one runtime's model is missing.
