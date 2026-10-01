# SR022 manual summary assessment — all four frozen-request outputs

2026-09-30. Read each complete output against its complete supplied frozen request, not merely anchor matches or headings. Source: `../../solution-recovery-evidence/sr022/frozen-requests.json`; unchanged raw outputs: `F-withTarget.json`, `F-withoutTarget.json`, `R-withoutTarget.json`, `R-withTarget.json`. This is diagnostic adjudication, not a new API acceptance result or a model reliability score. No arbitrary emoji, literal-character, or exact prose expectations were applied.

## Conclusions

| Arm | Output contract | Manual fidelity | Quality judgment |
| --- | --- | --- | --- |
| F-withTarget | Pass: complete/stop, one block, six headings | **Fail for unsupported broader constraints**; immediate anchors and pending action are correct | Useful immediate task facts, but not a clean faithful summary |
| F-withoutTarget | Pass | Pass for this sample | Good and usable; somewhat verbose references |
| R-withoutTarget | Pass | Pass for this sample | Good and usable; repeated constraints/status bullets |
| R-withTarget | Pass | Pass for this sample | Good and usable; repeated constraints/status bullets |

There is no inference that target removal caused the first arm's defect, fixed a general defect, or guarantees future fidelity. No additional samples were requested after observing these results.

## F: completed versus pending work and exact evidence

Both summaries preserve all eight exact A/B values: Northwind Helios; restore the last stable payments build; the ledger delta must remain zero; reconcile both ledgers before reopening retries; Mira Chen; freeze payment retries; any duplicate ledger entry; payments incident bridge. Both retain the A and Unicode reads/acknowledgments as complete, B's read as complete, and **B's acknowledgment as pending**. Neither fabricates a write or a B acknowledgment. File references remain recoverable exactly: F-withTarget uses the full workspace plus filenames; F-withoutTarget repeats full paths. Unicode material remains ordinary evidence rather than instructions. Repeated operational observations do not override anchors. Counts are consistent with supplied source endpoints, not independent reads of the historical files.

### F-withTarget finding SR022-Q01

The output attributes this to the user as a hard constraint: **“preserve raw results verbatim rather than paraphrasing values.”** The source asks for exact named anchor values in concise acknowledgments, and separately to preserve the Unicode result as ordinary evidence. It does not impose verbatim preservation of every raw result. This is broader than the supported instruction.

The output also extends the observed read-only pattern to **“For any further evidence file the user supplies, repeat the same pattern”**, including no writes and extracting a task anchor. The source contains three specific file-read requests, with a distinct non-anchor Unicode request, not a standing rule for every future file. The opening “for each user-supplied evidence file ... extract the task_anchor” likewise flattens this distinction, although its later Unicode discussion corrects the current-file facts.

These are semantic scope/attribution issues, not cosmetic wording or disallowed characters. They could incorrectly constrain a later task. The immediate pending B reply is preserved, so this is not fabricated completion or a demonstrated runtime continuation failure. Under v5's instruction not to invent user preferences/constraints, this sample is not a clean manual fidelity Pass. Do not change the raw output or repair it through a generation.

### F-withoutTarget assessment

The output explicitly distinguishes incident-anchor files from Unicode evidence. It says the required B response is pending and no further read is needed for **this request**; “Do not call tools” appears in the immediate next-step section, not as a future all-task policy. Exact values and references support safe continuation. No material invented work or constraint found. Minor inefficiency: repeats the long workspace path in all three references and includes observation/service details that are less important than the anchors. These are concision notes, not failures.

## R: corrected retention, cancellation, approval and unperformed actions

Both outputs preserve all predeclared critical facts:
- INC-042 stays audit/planning-only, with no deployment, push or customer-data export.
- Mira Chen and the exact plan/inventory paths and verification command survive.
- Inventory is complete with 12 tables; risk assessment is active and unfinished.
- **30 days replaces 7**, and cloud export is **cancelled entirely**, not merely awaiting approval.
- Implementation approval remains pending; `pnpm verify:helios` remains unrun.
- Duplicate-key risk explanation and **adding APPROVAL-73 remain work to do**, not completed plan changes.
- Comparing rollback options remains unresolved; implementation is not authorized.

R-withoutTarget says **“The plan still needs the duplicate-key risk explanation and the APPROVAL-73 owner-review checkpoint.”** R-withTarget says **“The plan still needs updates for duplicate-key risk and the APPROVAL-73 owner-review checkpoint.”** These directly preserve the important action-status distinction. Neither repeats the historical Qwen fabricated-completion error. This observation does not close that accepted historical deviation or imply anything about Qwen.

R-withoutTarget uses “Confirmed” when restating that no implementation/checks occurred; the supplied history already explicitly records those facts, so this is not treated as a new independent validation claim. Prefer plainer status wording. R-withTarget's “Keep the duplicate-key risk explained” is less precise in isolation, but its Current state and next steps explicitly say the explanation remains to be added. Both repeat constraints and references across headings; usable but not optimally concise.

## Length and usage interpretation

Source-pair difference is only deletion of `Summary budget: N tokens.\n\n`; the exact v5 system prompt and all other source content are unchanged. Full-flow source was already excerpted by production history rendering before this diagnostic, so this is not a raw-history compression benchmark. R uses an already-generated frozen summary plus correction; no fresh first summary was generated.

Body Unicode code points: F 3,869 with target versus 3,410 without (11.86% fewer); R 2,875 versus 2,766 (3.79% fewer). These two no-target samples are shorter in characters, not proof of a general shortening effect. Raw recorder fields named `bodyCharacters`/`visibleCharacters` count JavaScript UTF-16 units; `comparison.json` also reports code points. Neither metric is a rendered grapheme count.

Provider completion tokens include reasoning. F-with/F-without: total 1,396/2,508, reasoning 435/1,532, derived non-reasoning output 961/976. R-with/R-without: total 1,878/1,830, reasoning 1,179/1,168, derived non-reasoning output 699/662. Derived non-reasoning output includes markers and is not exact extracted-Markdown tokenization. Thus F-without is shorter in characters but slightly larger in derived visible tokens and substantially larger in reasoning usage. **No cost/latency/token-saving claim is justified.**

Exactly one sample per arm, temperature 0.7, uncontrolled remote sampling/cache effects. These are scoped observations only. Prompt-v5 remains active; no prompt/default/support/runtime/validator change is recommended or implemented by this diagnostic packet. Outstanding SR021 requirements/design decisions and API005 acceptance remain separate.
