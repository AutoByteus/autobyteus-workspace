# Handoff — Architecture Design Complete (autobyteus-387, SR-003)

## Result

- Classification: `Architecture Design Complete` (revised after ARCH-REV-001 round 1)
- `task_size`: `Large`; `architectural_risk`: `High`
- Route: architecture review round 2 (`/software_engineering_team/architecture_reviewer`), per the handoff rule for Large or High.

## What Changed Since Round 1 (SR-002 → SR-003)

| Finding | Resolution (design spec section) |
| --- | --- |
| AR-001 reopen without instructions | DS-004 now has three restore forms. `AcpAgentRunBackend` holds the run's instructions (input) and passes them on reopen in `open({mode: "restore", instructions})`. They are re-sent, not recomposed. `acp-agent-run-backend.ts` is in the inventory, and the reopen caller is in the `"load"` removal row (Primary Execution Spines, Removal Plan, Concrete Examples "Reopen") |
| AR-002 end ownership | DS-008: `AcpSessionLauncher.end` is the one end owner, in the order unsubscribe → close session → close connection or stop process → `launch.release()` → clear handles. Its callers are the backend reopen, the factory `releaseResources` (then skill cleanup; the factory's copy is removed) and open failures. `observe()` returns an identity-scoped unsubscribe per generation (Bounded Local Spines, Interface Boundary Mapping, Removal Plan) |
| AR-003 compositions | `createForExecution` gets a required `providerRelayAccess` disposition. The studio passes its proxy host's access, and also sets a process relay slot. The application platform runtime and scope get the studio's access threaded in. The standalone host passes `null`. A profile with a relay and no access is refused before spawn (`PROVIDER_RELAY_UNAVAILABLE`). The dsh catalog and availability provider read the slot; with the slot empty, dsh is unavailable with a reason, which the launch validator shows. New decision DEC-020 |
| AR-004 refusal body | Anthropic error envelope with a status and type per code (Interface Boundary Mapping, Concrete Examples) |
| AR-005 | `normalizeModels` removed from the shared contract; Grok's capability calls `normalizeGrokBuildModels` directly |
| AR-006 | "provider relay" (`ProviderRelay`, `/relay/<relayId>`, `ProviderRelayAccess`, `ProviderCallObservation`). dsh's own route is `DSH_PROVIDER_ROUTE`. The glossary entry names the distinction from Model Routing |
| AR-007 | The relay never alters bodies, and "must match" is limited to key swap, streaming and the usage tap. The probe's stripping is noted as probe-only. DEC-019 keeps dsh's plugin-inventory field (package names and versions only) |
| Residual guidance | `finished` delivered synchronously; `issue`/`clearGrants` keep the relay grant; home files written atomically; `customSkillDirs` is an empty list when unset |
| Cosmetic | The requirements approval line is aligned (approved at SR-001; SR-003 adds DEC-019/020) |

## Original Request And Direction

- Project Task `autobyteus-387`, requested by `/project_task_manager`. The user extended it to building in this ticket ("we do it now in this ticket"). The user's decisions are quoted in `investigation-notes.md` and recorded as DEC-001…DEC-006.

## Approval Basis

- Requirements `Approved` within the direction, user informed. DEC-019 and DEC-020 are Solution Designer decisions within the direction; the user is informed. Design approval is not required by the direction.

## Package (Ticket Folder)

`/Users/normy/autobyteus_org/autobyteus-worktrees/deepseek-dsh-runtime-investigation/tickets/in-progress/deepseek-dsh-runtime-investigation/`

- `design-spec.md` (SR-003), `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md` (SR-001…SR-003), `follow-ups.md` (FU-001, not yet sent)
- Review artifacts (reviewer-owned): `design-review-report.md`, `architecture-review-revision-record.md` (ARCH-REV-001 applies to SR-002)
- `probes/`, `evidence/` (no key material)

## Workspace

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/deepseek-dsh-runtime-investigation`, branch `codex/deepseek-dsh-runtime-investigation`, base `origin/personal` `3ef5e33eec`; documents only.

## Open Risks

- RSK-002 (compaction header in dsh code), RSK-004 (process memory, measured in validation), RSK-006 (overlap with autobyteus-386 in the shared ACP layer).

## Expected Next Action

Architecture review round 2 of `design-spec.md` (SR-003).

## Handoff Route Record

- Round 1: SR-002 → `/software_engineering_team/architecture_reviewer` (2026-11-06) → Fail (ARCH-REV-001).
- Round 2: SR-003 → `/software_engineering_team/architecture_reviewer` (rule: Architecture Design Complete, Large or High).
