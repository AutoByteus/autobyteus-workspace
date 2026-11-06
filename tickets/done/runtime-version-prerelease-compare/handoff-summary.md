# Handoff Summary: runtime-version-prerelease-compare (autobyteus-393 item 1)

- Status: verified from the evidence (audited, not redone), archived and finalized on `personal`. **No release**: none was requested, and that is the release guide's default.
- Classification: `task_size=Small`, `architectural_risk=Low`, direct route (no independent reviews; test-code review Not Required). API/E2E API-REV-001 Pass, 95%.
- Scope: item 1 only. Item 2 (DeepSeek Harness in the release smoke check, FU-003 of autobyteus-387) is the user's decision and was not part of this ticket.

## What Changed

- Settings → Agent Runtimes shows a runtime's full version, prerelease included. DeepSeek Harness reads `0.2.2-rc.1`, not `0.2.2`.
- Versions compare by SemVer 2.0.0 precedence: a prerelease is older than its release, and build metadata is ignored. Installed `0.2.2-rc.1` with a published `0.2.2` reads "Update available", and an update to it is reported as `0.2.2-rc.1 → 0.2.2` (`b472fae14a`).
- The Grok availability minimum (1.0.41) and the Antigravity compaction-detection minimum (1.2.16) use the same rule, so a prerelease of either minimum is below it.
- API/E2E baseline fix `e916f1dbf1`: the Agent Runtimes GraphQL E2E expects five runtimes. DeepSeek Harness (autobyteus-387) had left it at four.

## Integration

- Already current with `origin/personal` at `b78fd86fe4`. There were no new base commits, so no rerun.

## Verification (audit of the evidence)

- AC-001 (full version read):
  - Unit reproduction fails before the fix and passes after it (IMP-00: 5 failed → 18 passed).
  - Real dsh row: `"installedVersion":"0.2.2-rc.1"` (API-02).
  - Rendered page: DeepSeek Harness `0.2.2-rc.1`; Codex `0.167.0`, Claude `2.1.318`, Antigravity `1.5.2` and Grok `1.0.77` unchanged (API-03, `API-03-rows.json`, screenshot).
- AC-002 and AC-005: GraphQL E2E AR-14 (API-01, `Tests  14 passed (14)`). `0.170.0-alpha.2` vs `0.170.0` reads Update available; the Update succeeds `0.170.0-alpha.2 → 0.170.0` and then reads Up to date; `0.171.0-rc.1` vs `0.170.0` reads Up to date.
- AC-003: unit precedence chain in both directions, and build metadata ignored (`runtime-version.test.ts:35-45`, in IMP-01/02's full unit run: `Test Files  934 passed`).
- AC-004: existing suites pass: server unit (IMP-01/02), AR-01…AR-13 (API-01), update notifications 3/3, available runtimes 6/6, running agents 4/4 (API-04/04b). Typecheck at its baseline (API-05).
- No user check is needed. Not provable on the real dsh: "Update available" against a stable 0.2.2, because no stable dsh 0.2.2 is published. Proven with the scripted runtime and unit tests instead.

## Residual

- RSK-001 (design): a hyphen after `x.y.z` that is not a prerelease would read as one. No real CLI's version text has one (API-03).

## Release

- None. It ships with the next release the user asks for.
