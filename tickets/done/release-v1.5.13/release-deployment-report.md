# Release Report — release-v1.5.13 (autobyteus-535): stable v1.5.13

Status: **in progress: cutting (the founder waived Grok).**

## Scope

- Release request (`Release Requested`; `handoff-release-requested.md`): stable v1.5.13 (GitHub Latest) from the latest `origin/personal`. The founder: "Okay let's just release the new stable now let's go" (2026-11-18). Base re-checked: `0ce426bc9f` (autobyteus-533, 491 and 492 not merged at the cut).
- No validated package: the release guide's checks are the verification.

## The Founder's Words (relayed by the Solution Designer, 2026-11-18)

- Content and cut time: "Okay let's just release the new stable now let's go".
- Docker `:beta`: moves with the newest tag, stable or beta (his question "previously beta also always a point to the latest right", answered yes); `:latest` and `:beta` both move to 1.5.13.
- Smoke: no waiver (the prompt-section tests are fixed, `f734aedc26`); Grok only under "Waive grok if no usage limit anymore", for a case failing solely on a usage limit; anything else back to the Solution Designer.
- App data: the episodic catalogs on first start, no backup ("please no need to backup").
- Docker launcher wording (Solution Designer's correction after his question): every user runs plain `autobyteus-docker upgrade --all` (each node keeps its track); `--tag latest` only for beta-track nodes going back to stable.

## Before Cutting

- Apple developer agreement: beta.10's macOS builds were signed and notarized on 2026-11-18 (Desktop run 44239204356, success); no refusal since beta.7.
- Released migrations: the 461 conversion (since v1.5.12) is in `RELEASED` as of v1.5.13-beta.7; nothing changed since; `RELEASED` unchanged (its comment: a later release only appends).
- Notes: one curated set since v1.5.12, `release-notes.md`, "What you need to do" first (no rollback, contact support; update everything together; plain `upgrade --all`, `--tag latest` only for beta-track nodes back to stable; the Android APK; the catalog build; the double approval; the Daily Assistant on another node), the handoff's known issues under "Good To Know".

## Checks Before Tagging (on `5bb41f0dd1`: `0ce426bc9f` plus this ticket's documents)

- `pnpm install --frozen-lockfile`, server `prebuild`: pass. Typechecks: server `production errors: 0 … (baseline 1012 in 316 files)`, web `production errors: 0 … (baseline 87 in 37 files)`. Registry-order test: pass. `check_licensing.py`, `check_repository_artifact_hygiene.py`, `check_secrets.sh v1.5.12..HEAD`: pass.
- `release_smoke.py`:

| Case | Run 1 | Run 2 (the rerun that decides) | Classification |
| --- | --- | --- | --- |
| Claude 3, Codex 3, AutoByteus 2 | PASS | PASS | — |
| Antigravity 2 | PASS | PASS | — |
| `agy-linked-skills-transport.e2e.test.ts` (scripted AGY): hook timeout 60 s; E07 "a linked run resumes after its skill folder was deleted" timed out waiting for `TURN_COMPLETED` | FAIL | PASS (no failure) | Platform: this machine's load (average 49–61) |
| Grok "new run + restore, linked workspace" | FAIL `Grok Build model discovery timed out` | FAIL `429 Too Many Requests: subscription:free-usage-exhausted` | run 2: solely a usage limit, covered by his standing word |
| Grok "brand-new team member" | FAIL discovery timed out | FAIL `COLLABORATION_AGENT_ACTIVATION_FAILED: ACP_REQUEST_TIMEOUT: initialize did not respond in time` | not a usage limit: **needs his words** |
| Grok "different same-named skill" | FAIL discovery timed out | FAIL `429 … free-usage-exhausted` | run 2: solely a usage limit, covered |

- Grok's free usage is now exhausted (rolling 24 h), so a further rerun cannot give a clean Grok result today. Evidence: `evidence/delivery/DR1-pretag-*`.
- **The founder's Grok decision** (to delivery directly, 2026-11-18): "Waive for grok quota limit thanks". Delivery's reading, stated to him before the cut: the Grok runtime is waived for v1.5.13, all three cases (two failed solely on the quota; the third, `ACP_REQUEST_TIMEOUT: initialize did not respond in time`, cannot be rerun cleanly while the quota is exhausted). The other runtimes passed.

