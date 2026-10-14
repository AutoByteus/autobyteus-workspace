# Handoff Summary — output-tps-precision

## What Shipped

The Token Meter's **TPS** card shows how fast the selected exact AgentRun's latest model call produced output. The runtime integration times each call on the server, and the call's own usage event carries `output_throughput { method, output_tokens, duration_ms }`. There are two methods:

- **generation:** first streamed output → end;
- **end to end:** labelled "incl. time to first token".

Tool runs and approval waits are never counted, and a turn with a single call gets a reading. This replaces the frontend estimate built from two usage reports. Accounting, cost, persistence and the API surface are unchanged; no TPS is stored.

- Classification: `task_size=Large`, `architectural_risk=High`, route Reviewed.
- Chain: ARCH-REV-003 → IR-002 → CRR-003 Pass 9.4 → API-REV-002 Pass 95% → CRR-004 Pass → DR-001.

## Integrated State

- Bootstrap base: `origin/personal@1ea74caa2d`.
- Checkpoint: `3bfcf88b94`, a commit of the validated candidate.
- Integration: merged `origin/personal@214eaedc86` (stable v1.5.3: a version bump and release notes, no code overlap) as `d0849f1709`. The merge was clean.
- Post-integration checks, all passing (logs in `evidence/delivery/`):
  - P1: server TPS unit set, 28 files / 354 tests;
  - P2: server typecheck;
  - P3: autobyteus-ts throughput, 7 tests;
  - P4: web Token Meter specs, 5 files / 62 tests;
  - P5: Codex timing test after the ticket move, 7 tests;
  - P6: full server `test:unit`.

## Delivery Changes

- C-004: `autobyteus-web/README.md` Token Meter paragraph and link rewritten.
- RSK-005: the AGY row in `autobyteus-web/docs/token_meter.md` now says output includes thinking (observed live).
- `TESTING.md`: dated note that the agy 1.3.5 isolation recipe has a gap.
- C-010: `codex-model-call-timing.test.ts` now reads the live captures from `tickets/done/output-tps-precision/evidence/...`, following the `token-meter-accuracy` precedent. Rerun: pass.
- Ticket archived to `tickets/done/output-tps-precision/`.

## Verification

Verified from the evidence, without a user check. See release-deployment-report.md § Verification.

## Release

The user chose a **beta** on 2026-10-14 ("i think we could release a beta"). See release-deployment-report.md for the tag, pipelines and assets.

## Known Limits

These are documented in `token_meter.md`:

- Grok's first call includes CLI setup;
- a native provider that hides reasoning without reporting a count reads high;
- a Codex CLI without raw events gives no reading;
- the Codex desktop journey was not rerun on the IR-002 build because the user has no Codex tokens. The same server path is proven live in API-L03, L04 and L08.

## Follow-Ups (to the Task manager)

1. The other Token Meter cards format numbers with the system locale, while TPS uses the app locale. This is pre-existing.
2. The unified agent-run data model (design follow-up).
3. A Codex upgrade to generation speed, if raw events ever prove when hidden reasoning starts.
4. An isolated signed-in `agy` recipe for live tests (TESTING.md gap).
