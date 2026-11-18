# Design Spec — autobyteus-355

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements: `requirements-doc.md` SR-001, approved by the Solution Designer within the direction (user informed, 2026-11-01)
- Behavior-defining supplements: none
- User approval of the design: `Not required` (the Task asks only that the final RELEASE.md wording is shown to the user in the report)
- Design status: `Ready`
- Investigation notes: `investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `TESTING.md`, `RELEASE.md` (current `origin/personal`), all in this conversation
- Conflicts: none

## Current-State Read

- **Beta notes:** a beta always gets generated notes (`release-desktop.yml:642-650`, E-02); RELEASE.md says so (`:82-86, 341`). User actions were added by hand with `gh release edit` (E-05).
- **Live suite:** it checks every enabled runtime's pinned model in one shared `beforeAll` (`workspace-skill-links-live.e2e.test.ts:132-143`), so one miss stops all runtimes (E-07, E-09).
- **Runner:** `release_smoke.py` attributes the first "Failed Suites" error to every skipped case (A-02) and reads one models line (A-03).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`. One guide section and the template; one test file's setup; the runner's parsing of two log lines, plus its unit tests.
- Architectural risk: `Low`. No product code, API, persistence, security, concurrency or deployment change; test tooling and documentation only.
- Escalation trigger: if the change needs a workflow edit, or touches server code, return a `Design Impact`.

## Intended Change And Change Scope (Mandatory)

- In scope: UC-001..UC-003.
  - `RELEASE.md`, in "Release Decision", "Cutting The Release" (beta) and "Workflow Reference → Release notes";
  - `.github/release-notes/template.md`;
  - `autobyteus-server-ts/tests/e2e/runtime/workspace-skill-links-live.e2e.test.ts`;
  - `scripts/release_smoke.py`, `scripts/tests/test_release_smoke.py`;
  - a token-free fake Grok CLI for the proof: `scripts/tests/fixtures/fake-grok-acp.mjs`.
- Derived consumers:
  - the runner's required-case list (titles unchanged: keep the per-runtime `describe.each` titles `claude`, `codex`, `grok`);
  - the summary's `models` line (new per-runtime form, shown below);
  - the header comment of the live test (line 27 "there is no fallback" becomes the new rule).
- Deliberately left alone: the release workflows and `desktop-release.sh` (DEC-001); Claude and Codex pins (DEC-003); the waiver rule; product code.
- Follow-ups: none.

## Design

### D-1 RELEASE.md (the user's rule; final wording is shown to him)

- "Release Decision" → Beta, one sentence added: "When a ticket in the release needs an action from users, the beta's notes also carry it (see Cutting The Release)."
- "Cutting The Release", a new short subsection "**Beta notes with a user action**":
  1. A ticket whose change needs an action from users writes it under `## What you need to do` in its `release-notes.md`. A ticket without one leaves the section out.
  2. Before tagging, delivery lists the tickets in the release (`git log <previous-tag>..HEAD` merges) and collects their `What you need to do` sections. If none exist, the generated notes stand alone.
  3. After all four workflows have succeeded and the assets are complete, delivery puts the collected section above the generated notes:

     `gh release view <tag> --json body --jq .body > /tmp/generated.md`, then
     `{ cat actions.md; echo; cat /tmp/generated.md; } > /tmp/notes.md`, then
     `gh release edit <tag> --notes-file /tmp/notes.md`.

     Only the body changes; the tag and assets do not.
  4. The release report names the tickets whose sections were used.
- "Workflow Reference → Release notes": the pre-release line keeps the workflow fact ("the workflows publish generated notes") and adds "a user-action section is added afterwards by hand, as Cutting The Release says".
- `.github/release-notes/template.md` gets an optional first section `## What you need to do` with one comment line: "Only when users must act (for example: reinstall the Docker launcher, then run `autobyteus-docker upgrade --all`); otherwise remove it." A stable release uses the same template, so its notes carry the section too.

### D-2 Live suite: per-runtime model check (REQ-003..REQ-005)

- The model check moves from the shared `beforeAll` (lines 132-143) into a `beforeAll` inside `describe.each(enabledRuntimes)("%s", …)`. The shared `beforeAll` keeps the server, package import and definition check.
- One pure function owns the choice rule. It goes in the same test file, or in a small helper beside it if the runner needs to read it in tests:

  `chooseLiveModel(name, available, override)`:
  - `override` set → it must be in `available`, else an error `"<name> model <override> is not offered; available: …"`;
  - otherwise the runtime's pin, when it is in `available`;
  - otherwise, **for Grok only**, `available[0]`, with `fallbackFrom: "grok-4.7"`;
  - otherwise (Claude, Codex) the same "not offered" error;
  - an empty `available` is always an error.
- Each runtime's `beforeAll` prints one line: `SKILL_LINKS_LIVE_MODEL {"runtime":"grok","model":"grok-4.5","pinned":"grok-4.7"}`, with `pinned` only when a fallback was used.
- The header comment states the rule in place of "there is no fallback".

### D-3 Runner (`release_smoke.py`)

- `read_models` collects every `SKILL_LINKS_LIVE_MODEL` line into `{runtime: model}`, and notes a fallback as `grok-4.5 (pinned grok-4.7 not offered)`. The summary's `models` line prints that map.
- `failed_suite_error` becomes per runtime. From each `FAIL <file> > <outer> > <runtime>` line under "Failed Suites", it takes the next error line for that runtime. A skipped required case gets the error of its own runtime. A file-level error (no runtime suffix) still applies to all of that file's skipped cases, as today.
- Fail-closed rules are unchanged: every required case must pass.

### D-4 Proof (REQ-006, AC-002..AC-005), token-free

- **Unit tests for the choice rule:** pin offered; pin missing for Grok gives the first offered model; pin missing for Codex is an error; an override missing is an error; an empty list is an error.
- **Runner unit tests:**
  - a report fixture where the Grok cases are skipped and Claude/Codex passed, plus a log naming `> live suite > grok`: only Grok rows fail, with that reason;
  - two models lines are parsed, with the fallback note.
- **A run of the live suite with only Grok enabled:** `RUN_GROK_E2E=1`, `GROK_BUILD_COMMAND=<fake-grok-acp.mjs>`. The fake answers ACP `initialize` with `availableModels` lacking `grok-4.7`, and errors on any prompt. Check:
  - (a) no override: the log shows `SKILL_LINKS_LIVE_MODEL … grok-4.5 … pinned grok-4.7`;
  - (b) `GROK_E2E_MODEL=grok-4.7`: the Grok group fails "not offered".
  - The cases themselves fail at the fake's prompt refusal. That is expected and recorded: the proof covers selection and scope, not a real turn.
- No real provider call and no keys: the fake is the only Grok, and Claude and Codex stay disabled.

## Spines (proportionate)

- `release_smoke.py → vitest live suite → shared beforeAll (server, package) → per-runtime beforeAll (catalog → chooseLiveModel → models line) → cases → JSON report + log → runner evaluate → summary`. The runner owns the verdict; the choice rule owns model selection.

## Removal / Decommission Plan

- The shared catalog loop (lines 132-143) and the single `SKILL_LINKS_LIVE_MODELS` line: replaced by the per-runtime check and line.
- The runner's single-error attribution: replaced by per-runtime attribution.
- The header's "there is no fallback" sentence: replaced.

## Backward-Compatibility Rejection Log

- Reading both the old single models line and the new lines: rejected. The runner and the suite change together in one commit.

## Risks

- The first offered Grok model may cost more than `grok-4.7`. It is on the user's own Grok plan, and the summary names it.
- A future vitest that renders "Failed Suites" differently: the runner's unit test with a captured log catches it.

## Guidance For Implementation

- Start from the probe `investigation-probe-nested-beforeall.test.ts.txt` (A-01).
- Keep the `describe.each` titles and test titles unchanged (the runner names them).
- Never print key material.
