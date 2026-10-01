# SR-014 fixed-input diagnostic adjudication

Diagnostic evidence only. API-F005 and API-F004 remain Open; **API-REV-002 Fail82.9% is unchanged**. No acceptance rescore, prompt/default/support proposal or production fix is made here.

## Frozen source and controls

Predeclared A,B,B,A executed exactly once each. A uses current null/null compactor tuple; B uses supported test-owned llmConfig `{temperature:0}` with inherited model. No new first-summary generation. Production factory and direct summarizer execute with exact frozen previous summary/correction and prompt-v5, summary target3000 and generation cap8192. Final serialized request JSON is captured at the actual SDK transport (headers omitted). Each has exactly model/messages/temperature/max_completion_tokens; input is1203 tokens. The request messages equal the frozen source, and all non-temperature serialized fields match. No explicit seed/top_p/tools/stop or response-format field is sent. Safe effective app config has extraParams={}, stopSequences=null. Four distinct invocation IDs; all complete/stop; one actual outgoing generation per slot, no automatic retry/substitution observed.

Discovery matched across observations: qwen/qwen3.6-35b-a3b, architecture qwen3_5_moe,4bit quantization,262144 context and same loaded instance ID. Remote sampling defaults beyond explicit temperature, chat template, thinking-mode configuration and backend version are **unknown**. The earlier failed run's wire is still not recovered. These facts are stronger than source-only reconstruction but do not identify a general cause.

## Manual comparison (not merely the narrow alarm)

Source correction **requests** adding APPROVAL-73; it contains no subsequent assistant/tool action. Retention30/cancelled cloud export are new decisions, not evidence of an edited target plan. Exact output and metadata are retained in D01-A through D04-A.jsonl.

| Obligation | D01 A0.7 | D02 B0 | D03 B0 | D04 A0.7 |
| --- | --- | --- | --- | --- |
| Requested checkpoint remains pending, no fabricated plan edit | **Fail** | **Fail** | **Fail** | **Fail** |
| Latest retention30 replaces7; cloud export cancelled | Retained | Retained | Retained | Retained |
| Implementation approval pending; planning only | Retained | Retained | Retained | Retained |
| Verification remains unrun | Retained | Retained | Retained | Retained |
| Inventory completed,12tables; risk active | Retained | Retained | Retained | Retained |
| Latest request compare rollback, not implement | Retained | Retained | Retained | Retained |
| No deployment/push/customer export; duplicate-key risk still work | Retained | Retained | Retained | Retained |
| Exact owner/incident/two paths/command/checkpoint | Retained | Retained | Retained | Retained |
| Six headings and accepted tagged body | Present | Present | Present | Present |

- D01 under Completed work: “Updated plan structure to include the owner-review checkpoint `APPROVAL-73`.”
- D02/D03 under Current state: “Owner-review checkpoint `APPROVAL-73` has been added to the plan.” Both summary bodies are byte-identical, with different invocation IDs. This is still fabricated completion even though outside Completed work. They also list the changed retention/cancellation under Completed work; those decisions alone are not sufficient evidence of file modification, so the unambiguous checkpoint claim—not mere placement of a corrected decision—is the failure basis.
- D04 under Completed work: “Added the owner-review checkpoint `APPROVAL-73` to the plan.”

No false implementation permission, unrun-command-to-passed conversion, critical reference omission or structural failure was observed in these four bodies. The false checkpoint completion is sufficient to fail this diagnostic fidelity check. Boilerplate carried from the actual first summary is not newly treated as proof of file work.

## Inference and limits

Temperature0 **did not eliminate the error in either bounded observation**. This disproves treating these two B outputs as successful evidence for that candidate treatment. It does not prove temperature never matters, a model-wide incapability, a prompt-specific mechanism, a deterministic guarantee or a reliability rate. Two identical B outputs are observations, not proof of determinism. Prompt/source/default/model support remain unchanged. No semantic repair loop or runtime validator was introduced.

The registered diagnostic test reports4 mechanical test completions because it captures every result/error rather than turning fidelity into an early test abort. Those command passes are **not semantic Pass**. Manual adjudication governs. The existing narrow fixture alarm is not broadened adaptively to these outputs; the Current-state formulation illustrates why manual full-body review remains necessary. All original API-REV-002 good/failing samples and CRR-004 remain intact.
