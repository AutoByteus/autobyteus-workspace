# Delivery / Release / Deployment Report — one-step-phone-pairing (autobyteus-395, with autobyteus-391)

## Release / Publication / Deployment Scope

- Repository finalization into `origin/personal` (ticket branch `codex/one-step-phone-pairing`).
- Beta release `v1.5.12-beta.7` (`python3 scripts/release_versions.py next-beta`), by the user's decision.
- Classification preserved: `task_size=Large`, `architectural_risk=High`, route `Reviewed` (architecture review, source review, API/E2E, test-code review).

## Project Release Guide

- Release guide path and revision: `RELEASE.md` on `origin/personal`, last changed in `277660ed19` (read in the ticket worktree after confirming the branch was current).
- Deviations from the guide and why:
  - The first release smoke run was started by mistake (`release_smoke.py --help` has no option parsing and ran the full check) before `pnpm install` and `pnpm -C autobyteus-server-ts prebuild`. Its result is not used. The run that counts was made afterwards in the guide's order (Checks Before Tagging below).
- Proposed guide fixes, and whether the user agreed: `None`.

## Handoff Summary

- Handoff summary artifact: `tickets/done/one-step-phone-pairing/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/one-step-phone-pairing/delivery-revision-record.md`
- Current delivery revision ID: `DR-002`
- Notes: —

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `677f61de0b`
- Latest tracked remote base reference checked: `origin/personal` @ `677f61de0b` (`git fetch origin personal` at delivery start)
- Base advanced since bootstrap or previous refresh: `No`
- New base commits integrated into the ticket branch: `No`
- Local checkpoint commit result: `Completed`: `49c56d4041`, the reviewers' uncommitted ticket documents, committed as handed over
- Integration method: `Already current` (merge-base of the branch and `origin/personal` = `677f61de0b`)
- Integration result: `Completed`
- Post-integration executable checks rerun: `No`
- Post-integration verification result: `Passed` (no new base state to verify)
- No-rerun rationale: no base commits came in, so the validated state is the integrated state; the guide asks for a rerun only when new base commits were integrated.
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`
- Blocker: —

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: the execution report's Acceptance-Criteria Proof and Cases (API-REV-002, final confidence 95%, no category below 90%). For every critical criterion I opened the case's evidence files and found the named lines, and I checked two screenshots (API-12 Switch node with an unreachable node; API-06 connection sheet). I also read the reused implementation checks and their explained full-suite failures. Line-by-line detail: [handoff-summary.md](handoff-summary.md), Verification.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement (`Proven`/`Not Proven`/`User Check`) |
| --- | --- | --- | --- |
| AC-001 | API-08 `API-08-desktop-node-journey.txt` | `Tailscale Recommended: ready=True selected=true`; `ms click → QR: 194`; `"Works anywhere through Tailscale"` | Proven |
| AC-002 | API-08; API-07 `API-07-linux-network-facts.txt` | `Allow and show QR code` → `"Works on this network"`, `PUT …/local-networks/gw_… 200`; switch off → question back; `this-computer` without route | Proven |
| AC-003 | API-07; API-01 (IMP-02 `Tests 119 passed`) | link-local, IPv6, public, bridges, loopback excluded on a real kernel | Proven |
| AC-004 | API-09 `API-09-docker-node.txt`; API-12 | host tailnet/LAN address + `:49816`, `serverName":"Docker Test Node"`; loopback-only node blocked with the published-port message; phone paired with it | Proven |
| AC-005 | API-10 `API-10-remote-node.txt` | remote node's own answer kept; wrong typed address → `This address doesn’t reach Linux Test Node.`; tunnel → all tabs `ready=False`, IT field | Proven (emulated second computer); the user's own computer is a beta check |
| AC-006 (non-critical) | API-08 §Advanced; API-16 | `serve --bg 49411` with Copy / Check again; HTTPS name of another node excluded | Proven for the command; after-Serve state: user check on the beta |
| AC-007 | API-18 `API-18-released-app-new-qr.txt`; API-04 | old app: `'Connect to Docker Test Node'` → run list | Proven |
| AC-008 | API-12 `API-12-android-two-nodes.txt`; API-04; IMP-10 scanner screenshot; `ScanScreen.kt` | Share form → run list with model-name devices, no checkbox or name; scanner opens; decode `BarcodeView.decodeSingle` (QR) → same `flow.connect(…, EntryForm.Scan)` | Proven except the camera decode itself: user check on the beta |
| AC-009 | API-12 | two nodes under their names (`<computer name>`, `Docker Test Node`) | Proven |
| AC-010 | API-12 | first launch scan-first texts; 2-node list | Proven |
| AC-011 | API-12; screenshot `API-12-android-switch-node-unreachable.png` | `Switch node` list; paused node `Not reachable` | Proven |
| AC-012 | API-03; API-15; API-17 round 2 | History (31) component test; real revoke → `History (1)`; en and zh-CN rows on a `de` OS | Proven |
| AC-013 | API-08; API-11 `API-11-code-expiry.txt` | discard `204` then `INVALID`; `CONSUMED`; `"This code has expired"`, `EXPIRED`, New code `Valid for 5:00` | Proven |
| AC-014 | API-15 `API-15-pre-change-phone-upgrade.txt` | released data, in-place upgrade: run list with no input, same `nodeId`, `connectionWay: null` | Proven |
| AC-015 | API-06 JSON; API-18 | `"button": "Connect to Alpha Test Node"` | Proven |
| AC-016 | API-06 JSON and `API-06-MSP-09-connection-sheet.png` | `"peerRows": 0`, `"text": "Retry"`; refresh icon, "Unpair from Alpha Test Node" | Proven |

- More evidence requested (from whom, what, result): `None`
- User check needed: `No` before finalization. Three parts can only be reached on the user's own devices and network, and API/E2E showed what it tried for each: the camera decode (API-13), his second computer (API-10 emulated) and Serve on his tailnet (API-16). Each sits beside a proven path. The decode is library behavior with standard wiring; the remote node was proven in its own network namespace; AC-006 is non-critical. The user asked for a beta, which is how these builds reach his devices, so they are listed as beta checks in the handoff summary and do not block the merge.
- User check reference, when needed: N/A
- Re-verification after later re-integration: `Not needed` (`origin/personal` did not move before the merge push)

## Release Decision

- Decision: `Beta`
- Decided by: the user, recorded in the requirements doc (Document Status, release direction, 2026-11-07): "For this ticket, we need to release a beta. since for my codex i dont have limit now, i waive for codex if delivery engineer asks". Codex is waived for the release smoke check by these words.
- Grok waiver: the user, 2026-11-07, in reply to the delivery engineer's report of the Grok quota refusal: "Waive Grok". Grok is waived for this release's smoke check.

## Docs Sync Result

- Docs sync artifact: `tickets/done/one-step-phone-pairing/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-web/docs/remote_access.md`, `docs/android_mobile_access.md`, `autobyteus-android/README.md`, `README.md`, `autobyteus-web/README.md` (implementation already updated `autobyteus-server-ts/docs/features/remote_access.md`, `GLOSSARY.md`; API/E2E `TESTING.md`)
- No-impact rationale: N/A

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes` (`3142da582f`)
- Archived ticket path: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-step-phone-pairing/tickets/done/one-step-phone-pairing`

## Version / Tag / Release Commit

- Version: `1.5.12-beta.7` (next unused beta after the highest stable `v1.5.11`; previous beta `v1.5.12-beta.6`). Android versionCode limits: within range.
- Release commit: `84596c87b8` `chore(release): bump workspace release version to 1.5.12-beta.7` (`autobyteus-web/package.json`), made by `bash scripts/desktop-release.sh beta --branch finalize/one-step-phone-pairing --no-push` on a clean tree. The untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` were deleted first, and the uncommitted delivery documents were moved aside.
- Tag: annotated `v1.5.12-beta.7` on `84596c87b8`.
- Push: `git fetch origin personal` (still `bcb2159295`), then `bcb2159295..84596c87b8 HEAD -> personal` and `[new tag] v1.5.12-beta.7`.

## Repository Finalization

- Bootstrap context source: Solution Designer bootstrap (worktree, branch `codex/one-step-phone-pairing`, base `origin/personal` @ `677f61de0b`); RELEASE.md Finalization Target
- Ticket branch: `codex/one-step-phone-pairing` @ `3142da582f`
- Ticket branch commit result: `Completed` (`49c56d4041` reviewers' records; `3142da582f` docs sync, handoff summary, release notes, archive)
- Ticket branch push result: `Completed` (`origin/codex/one-step-phone-pairing`), after the Secret Gate `scripts/check_secrets.sh origin/personal..codex/one-step-phone-pairing`: 38 commits, PASS. The hygiene check passed before the push
- Finalization target remote: `origin`
- Finalization target branch: `personal`
- Target advanced after verification / acceptance: `No` (fetched before the merge and again before the push: `677f61de0b`)
- Delivery-owned edits protected before re-integration: `Not needed`
- Re-integration before final merge result: `Not needed`
- Target branch update result: `Completed`. `finalize/one-step-phone-pairing` was made from `origin/personal` `677f61de0b`
- Merge into target result: `Completed`, `--no-ff` merge `bcb2159295`; Secret Gate on the merged state: 39 commits, PASS
- Push target branch result: `Completed`, `677f61de0b..bcb2159295 HEAD -> personal`
- Repository finalization status: `Completed`
- Blocker: —

## Checks Before Tagging

Run on the merged state `bcb2159295`:

| Check | Result |
| --- | --- |
| `python3 scripts/check_licensing.py` | `Licensing is consistent.` exit 0 |
| `python3 scripts/check_repository_artifact_hygiene.py` | `Repository artifact hygiene check passed.` (86352 tracked files; longest path 200) |
| `scripts/check_secrets.sh v1.5.12-beta.6..HEAD` | 50 commits, `PASS (no secrets found)` |
| `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | exit 0, exit 0 |
| `python3 scripts/release_smoke.py` | Claude, Antigravity and AutoByteus pass. Codex and Grok were refused by quota and are waived by the user (below), so the check passes for this release |

Release smoke summary (the run that counts, after install and prebuild):

```text
claude      new run + restore, linked workspace      PASS
claude      brand-new team member                    PASS
claude      different same-named skill               PASS
codex       new run + restore, linked workspace      FAIL    "You’ve hit your usage limit … try again at Nov 10th, 2026 10:31 AM."
codex       brand-new team member                    FAIL    (same)
codex       different same-named skill               FAIL    (same)
grok        new run + restore, linked workspace      FAIL    429 "subscription:free-usage-exhausted … rolling 24-hour window — tokens (actual/limit): 605252/600000"
grok        brand-new team member                    FAIL    (same)
grok        different same-named skill               FAIL    (same)
antigravity brand-new run, linked workspace          PASS
antigravity brand-new team member, linked workspace  PASS
autobyteus  brand-new run, linked workspace          PASS
autobyteus  brand-new team member, linked workspace  PASS
commit    bcb2159295f995bd62b4d85a4fabbb101846fbc0
models    {"claude": "haiku", "codex": "gpt-5.6-luna", "grok": "grok-4.7"}
suites    antigravity Tests 10 passed (10); autobyteus Tests 4 passed (4); live 6 failed | 3 passed (9)
```

Triage of each failure:

| Failed Run And Job | Classification (`Platform`/`Ours`) | Log Lines That Show The Cause | Action (rerun, or handed to whom) | Result |
| --- | --- | --- | --- | --- |
| Smoke, codex ×3 | Platform (provider quota) | `"You’ve hit your usage limit … try again at Nov 10th, 2026 10:31 AM."` | Waived by the user for this release (requirements doc, quoted above) | Waived |
| Smoke, grok ×3 | Platform (provider quota) | `429 … subscription:free-usage-exhausted … 605252/600000` (rolling 24 h) | Reported to the user, who answered "Waive Grok" | Waived |
| First, unprepared smoke run (not counted): antigravity E01 `Timed out waiting for TURN_COMPLETED` (status stayed `initializing`) | Not a release failure: run outside the guide's order, before install and prebuild | `AGENT_STATUS … "initializing"` then timeout at `agy-linked-skills-transport.e2e.test.ts:138` | Rerun in the guide's order | E01 `✓`, suite `Tests 10 passed (10)`. This ticket changes no runtime or AGY code (server diff: remote access only) |

## Release / Publication / Deployment

- Applicable: `Yes`
- Method: `Project Release Guide` (`bash scripts/desktop-release.sh beta --branch finalize/one-step-phone-pairing --no-push`, then push `personal` and the tag)
- Method reference / command: RELEASE.md, Cutting The Release; Watching The Rollout (the four runs watched together)
- Pipelines triggered and their results:

| Run | Workflow | Result |
| --- | --- | --- |
| 42367987175 | Desktop Release | success |
| 42367987210 | Android APK Release | success |
| 42367987339 | iOS App Store Connect Release | success (TestFlight upload) |
| 42367987195 | Server Docker Release | success (image; server packages linux/amd64 and linux/arm64) |

| Failed Run And Job | Classification (`Platform`/`Ours`) | Log Lines That Show The Cause | Action (rerun, or handed to whom) | Result |
| --- | --- | --- | --- | --- |
| None | — | — | — | — |

- Published artifacts checked against what the release should produce: `gh release view v1.5.12-beta.7` shows `isPrerelease: true`, not a draft, and **23/23 assets**. Desktop: macOS arm64 and x64 `.dmg`/`.zip` with blockmaps, Linux x64 and arm64 AppImages, the Windows `.exe`, `latest.yml`, `latest-mac.yml`, `latest-linux.yml`, `latest-linux-arm64.yml`. Android: the APK and its `.sha256`. Server packages: x64 and arm64 `.tar.gz`, `.json`, `.json.sig`. Docker Hub: `autobyteus/autobyteus-server:1.5.12-beta.7` and `:beta` have the same digest (`sha256:0d88dc7a4136…`); `:latest` did not move. The desktop on this machine updated itself to 1.5.12-beta.7 during the rollout.
- Release/publication/deployment result: `Completed`
- Release notes handoff result: `Used`. The beta's generated notes, with a combined `## What you need to do` section put above them after all four runs succeeded (`gh release edit v1.5.12-beta.7 --notes-file …`). The release's tickets (`git log --merges --first-parent v1.5.12-beta.6..HEAD`) are one-step-phone-pairing and html-preview-isolation, and both sections were used. The html-preview-isolation section was reworded to stand alone: it names the features its "above" pointed to.
- Blocker: —

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-step-phone-pairing`
- Worktree cleanup result: `Completed` after this report's commit was pushed: `git worktree remove` from the main checkout
- Worktree prune result: `Completed` (`git worktree prune`)
- Local ticket branch cleanup result: `Completed`: local `codex/one-step-phone-pairing` and `finalize/one-step-phone-pairing` deleted (both fully contained in `origin/personal`)
- Remote branch cleanup result: `Not required` (the project keeps ticket branches)
- Blocker: —

## Escalation / Reroute (Use Only If Final Handoff Cannot Complete)

N/A. The Grok blocker (DR-001) was resolved by the user's waiver.

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `tickets/done/one-step-phone-pairing/release-notes.md` (committed in `3142da582f`)
- Archived release notes artifact used for release/publication: `tickets/done/one-step-phone-pairing/release-notes.md`; its `## What you need to do` went into the beta's notes
- Release notes status: `Updated`

## Deployment Steps

None: the repository deploys no service. The Docker image, server packages, desktop builds, APK and TestFlight build come from the tag's workflows.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected` (new `remote-access/allowed-local-networks.json`) / `Directly Usable — No Migration` (device `connectionWay`, page session `nodeName`, Android saved entries)
- Delivery action required: `None`
- Result and evidence: API-15 (released data upgraded in place opens and works; legacy device row `connectionWay: null`, revocable)
- Migration completion, validation, recovery, and rollout evidence: N/A

## Verification Checks

Done after the tag: four workflows succeeded, 23/23 assets, pre-release flag set, Docker `:beta` = `1.5.12-beta.7`, user-action notes in place.

## Rollback Criteria

- Revert the merge `bcb2159295` on `personal` and cut the next beta. Desktop updates never downgrade, and Docker `:beta` only moves forward. No data migration: an older build ignores `allowed-local-networks.json` and the added `connectionWay`, so going back is possible.

## Final Status

- Verification complete (from the evidence, or the user's check where needed): `Yes`
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Yes` (`v1.5.12-beta.7`, 4/4 workflows, 23/23 assets)
- Applicable safe cleanup complete or not required: `Yes`
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to the Solution Designer: `Yes`, after this commit (DR-002)
- Terminal message/reference: `Delivery Completed` to `/software_engineering_team/solution_designer`
