# SR037 — Solution Designer personally reproduces and isolates duplicate display

## Result and authority
**Reproduced — evidence-only investigation complete. Design recovery remains open; no Architecture Design Complete, implementation, acceptance or Delivery advance.**

Stable package: context-compaction-simplification-analysis. Original task: native compaction simplification and truthful held-input recovery/presentation. User then requested origin/personal integration and Electron build for testing (DR002), and now fresh reproduction before repair, explicitly requiring Solution Designer to perform diagnostic experiments personally rather than only refer to validation evidence.

Approved requirements remain SR033; reviewed design SR035 / ARCH-REV005 remains the prior basis with IR010-DI001 unresolved. Relevant REQ012, AC014/017, SCN005 (“A not duplicated”). No intended-behavior change, renewed approval, requirement waiver or new user action is inferred. The unhanded SR036 design candidate remains parked, not a fix. Cumulative Large/High unchanged.

Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis; branch codex/context-compaction-simplification-analysis. HEAD026476691c62bda309ce7f2a9342ebb444959f98; MERGE_HEADd057801c89f26bc69a97331b59631c00519aec98. Merge remains IN-PROGRESS/UNCOMMITTED. Finalization/release not authorized or performed.

## Direct observations (SD, not copied API results)
Evidence directory: /Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/solution-recovery-evidence/sr036/sd-diagnostic

A new SD-owned isolated packaged desktop instance, iso-64587-d82b, used control64587/backend64588, backend PID25193; loopback provider64571/PID23000. App.asar SHA256 cdbd05b6253ad29210f12d2fdfe685bf4a1fd6aaef5fd6e52d13d0c26ce7278c matches the unchanged API009 build basis. Isolated root was new and separate from user data. Production source was not modified.

| Observation | Before reload | No-reload control | First actual reload | Second actual reload |
| --- | --- | --- | --- | --- |
| Held-input message copies in DOM | 1 | 1 | 2 | 2 |
| Held labels | 1 | 1 | 1 | 1 |
| Renderer timeOrigin | 1790866734141.8 | 1790866734141.8 | 1790866941502.1 | 1790866988836.1 |

Both actual reloads were desktop **View → Reload via CUA**, followed by selecting the same hosted child. Not location.reload, normal page switching, app quit/restart, or backend restart. Same backend listener/PID, native run_instance_id a50eef09-3f0f-4000-a907-be7ac1838e0b, revision16 and complete live held snapshot before/after/both reloads. One native run was prepared; the second reload is a repeat on the same held state, **not an independent second preparation**.

One exact held raw user row and one saved conversation row existed at all three captures. One live pending entry had message_id b093f789-dcbc-4a56-9fa9-5d92512e7715 and its member_input dedupe key. The raw and saved rows lacked those keys. Native state did not gain a second accepted input.

Loopback log:10 total generation requests =4 parent +6 compaction (3 failed attempts per compaction operation). No parent request contained the held input. No generation occurred because of either reload. This supports **duplicate presentation, not double execution**, in this experiment.

## Literal setup/action sequence
1. Read TESTING.md and isolated-app instructions; hash build/pin source. Initial command from autobyteus-web exited254 with no instance; corrected documented command from repository root: pnpm --silent isolated-app start --from-worktree. Successful start-2.json is the sole owned instance.
2. Adapt the inspected API loopback emulator into this new directory, replace marker/model namespace with SD036/sd036; bind only127.0.0.1 on an OS-selected free port. Initially disarmed, no outbound client,80-request ceiling, one-hour lifetime/120s hold guard. Arm fail mode locally. This deliberately makes compaction return503; it is not natural remote-provider failure evidence.
3. Through the owned public GraphQL endpoint configure LMSTUDIO_HOSTS and seed owned agent definitions; no run/queue/history state injected. Only Reviewer is exercised; Lead/Peer are unused setup data.
4. In the actual app Settings → API Keys → LM Studio → Reload Models; Server Settings → effective context override12000, ratio80, parent summary model inherited → Save compaction configuration.
5. New chat; select sd036-deterministic-32768:lmstudio@127.0.0.1:64571, native AutoByteus. Send SD036-HOST. Type @, select SD036 Reviewer, append SD036-ADD and Send. Select the created /sd036_reviewer child.
6. Send two18736-character user inputs, with SD036-SEED1/2 prefixes and repeated synthetic inventory text (construction recorded in live CUA actions and exact submitted content in provider/raw captures). Both receive ACK; second response crosses the compaction threshold. All3 compaction attempts fail.
7. Send exactly one new input: “SD036-HELD-A: Please continue the diagnostic. This is one user message.” Its recovery compaction fails3 times before parent dispatch. It is **accepted and prepared**, already recorded to history, but waiting to be processed by the model. One bubble carries Held — waiting for compaction. No B input is needed.
8. Capture public live root + member projection, raw trace, backend PID, DOM and screenshot. Capture a further no-reload control. View → Reload; select same child; capture again. Repeat View → Reload and select/capture once more.
9. Use normal whole-host Terminate button; confirm Offline. Copy owned app log, run isolated-app stop iso-64587-d82b, SIGTERM only own providerPID23000. Receipt confirms removed owned data root and released app ports; final probe confirms64571/64587/64588 closed.

## Cause: two descriptions of one input are treated as two messages
The app has two legitimate sources when rebuilding this conversation:
- **Saved history:** native input preparation already recorded the user's text, even though the model had not processed it.
- **Live pending state:** the still-running backend reports that same input as Held and includes its accepted message ID.

The saved-history path does not retain that accepted ID. On fresh renderer hydration, the history builder creates an anonymous user bubble, then the live pending handler looks for its exact accepted ID, cannot find it, and appends another bubble. The second bubble gets the Held label. Waiting/queueing itself is not the reported bug.

Source facts (line-numbered/hash-pinned in source-excerpts.txt):
- AgentTurnRunner:51 processes the external input before LlmPhase:154 request preparation/compaction; compaction_blocked waits on the same prepared input (runner:61–66). This explains why accepted-but-unsent input is already raw history.
- MemoryIngestInputProcessor:41–48 passes processed text, original attachments and sender to MemoryManager, but no accepted message_id/dedupe_key.
- MemoryManager:200–204 and buildNativeUserMessageTrace:142–157 cannot preserve those accepted keys; raw ID rt_timestamp is a different trace identity.
- AdmissionState pendingSnapshot:369–370 retains accepted keys.
- Fresh public server projection contains one anonymous row, not two; the duplication is introduced when frontend combines it with the live snapshot.
- AgentRunCollaborationHydration:89 builds saved conversation; constructor at106 applies live state via AgentRunCollaborationContext:96–97.
- runProjectionConversation:340–347 creates user messages without accepted keys.
- handleAgentInputState/upsertUserMessageByIdentity match by messageId/dedupeKey and append when neither matches. They are not matching saved text by guessing.

## Independent causal experiment using my own fresh captures
Disposable identity-boundary.probe.test.ts imports unchanged production builder/handler and the SD-captured responses. No source/store edits; counterfactual modifications are in-memory cloned objects only.
- History alone:1 anonymous bubble.
- Live state alone:1 identified Held bubble.
- Actual history + actual live state:2 bubbles.
- Applying the same snapshot twice:still2; revision guard refuses second application. Repeated event delivery is not necessary for this failure.
- Counterfactual keys added only to serialized history:still2 because current builder discards them.
- Counterfactual exact keys attached to the already-built history bubble:unchanged live handler retains1 and marks it Held.
- Different keys with identical text:2 distinct messages retained.

8 diagnostic assertions completed, exit0. They intentionally assert the current bug and isolate its cause; **not a feature Pass, durable regression, proposed implementation proof, or design approval**. These experiments support an identity-continuity cause, not a timing-only transient.

## Limits and next expected action
This direct run covers one hosted native Agent without attachment and two true renderer reloads on that one held state. I did not personally execute Team, attachment, queued B, successful retry continuation, backend restart, cold history or the wider negative matrix. API's separate current report says4/4 independently prepared Agent/Team reproductions, one attachment; its evidence remains separately owned and is not counted as my experiment.

I did not compare pre-merge code/build, so I have **not established that merging origin/personal introduced this bug**. It is present in the current integrated build. Controlled503s establish the failure precondition; no external provider/fidelity claims or spend.

The user-requested evidence prerequisite is now met for this path. Explain the result/cause to the user; if solution recovery resumes, explicitly resolve exact correlation and the SR035 stored-data/reader-writer authority conflict under existing owners before any implementation. Do not silently promote the parked candidate. Requirements remain unchanged; design/review work is still required if a technical change is selected. No new schema/migration/durable queue is prescribed here.

CRR015/API009-F001 and IR010-DI001 stay open. API00977.9% executable Fail unchanged, CRR0149.40 historical/corrected; ARCH005 applies only to SR035. F005 accepted known/nonfixed/nonPass/Qwen STOP; F004 unknown; SR022 exhausted/v6 unapproved; CG033 unproved/not pump Pass; OOM/webtsc7078 non-green;14wider+7baseline unwaived; API006withdrawn/API007unsupported excluded. API0093 new durable files still need successful review after later successful validation. Two overwrittenIR009 logs remain CRR014 replacements, originals unavailable. No cold-history/backend-restart pending-queue/power-loss promise.

## Artifacts, preservation and routing
Canonical requirements: /Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/requirements-doc.md
Canonical investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/investigation-notes.md
Prior reviewed technical basis: /Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/design-spec.md
Cumulative solution record: /Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/solution-revision-record.md
Full preceding context/constraint inventory: /Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/fresh-reproduction-request.sr036.md
Incoming IR010: /Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/implementation-handoff.md and implementation-evidence/ir-010/design-impact-request.md.
Relevant unchanged supplements: proposed-compaction-prompt.md, output-format-and-coverage.md, input-hold-proposal.sr027.md, acceptance-disposition.sr020.md and SR033 approval. Independent review ARCH005 applicable to prior basis; Product redesign N/A—not requested. Specialist reports not edited.

Evidence: entry.json, prior-build-basis.json, start-2.json, loopback-provider.mjs/state/wire, before/after/repeat public snapshots/projections/raw, no-reload-control.json, before.png/after.png, identity-boundary probe/config/log/results, source-excerpts.txt, result.json, isolated-stop.json, final-preservation.json.

11,378 source/test/contract-built pins checked: 0 changed. Both build assets unchanged. Git raw/logical index, HEAD/MERGE_HEAD/stash unchanged: True. Other specialists may write their own ticket reports; this scoped audit does not claim otherwise. No SD production/durable-test edit, build, staging/reset/merge/commit/push/release. Only owned investigation artifacts/canonical evidence references updated.

Result is evidence-only Reproduced, not completed architecture or delivery receipt. Persisted before fresh handoff-rule lookup; route decision to be appended.

Fresh handoff rules checked after persistence: no matching rule for this evidence-only result. Return directly to user; no duplicate specialist notification or architecture/implementation/Delivery advance. Exact lookup/selection saved in solution-recovery-evidence/sr036/sd-diagnostic/handoff-rules.json and handoff-selection.json.
